package marketingest

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/xuri/excelize/v2"
	"golang.org/x/text/unicode/norm"
)

const (
	DefaultSource = "itbi_sp_guias_pagas"
	DefaultCity   = "sp"
	RegionType    = "bairro"
)

var (
	reMonthSheet  = regexp.MustCompile(`^[A-Za-z]{3}-\d{4}$`)
	reNonNumeric  = regexp.MustCompile(`[^0-9,.-]+`)
	reWhitespace  = regexp.MustCompile(`\s+`)
	reHeaderChars = regexp.MustCompile(`[^A-Z0-9 ]+`)
	reHasDigit    = regexp.MustCompile(`\d`)

	neighborhoodAlias = map[string]string{
		"JD":  "JARDIM",
		"J":   "JARDIM",
		"VL":  "VILA",
		"V":   "VILA",
		"PQ":  "PARQUE",
		"PQE": "PARQUE",
		"PRQ": "PARQUE",
		"STA": "SANTA",
		"STO": "SANTO",
		"ST":  "SANTO",
		"PCA": "PRACA",
		"PC":  "PRACA",
	}

	neighborhoodAnchorTokens = map[string]struct{}{
		"VILA":    {},
		"JARDIM":  {},
		"PARQUE":  {},
		"SANTO":   {},
		"SANTA":   {},
		"ALTO":    {},
		"BAIXO":   {},
		"JARDINS": {},
	}

	neighborhoodConnectorTokens = map[string]struct{}{
		"DE":  {},
		"DA":  {},
		"DO":  {},
		"DAS": {},
		"DOS": {},
		"E":   {},
	}

	neighborhoodGarbageTokens = map[string]struct{}{
		"RESIDENCIAL": {},
		"COMERCIAL":   {},
		"HOTEL":       {},
		"STUDIO":      {},
		"STUDIOS":     {},
		"RESIDENCE":   {},
		"MEMORIAL":    {},
		"HOME":        {},
		"HYPE":        {},
		"SMART":       {},
		"CLUB":        {},
		"WAY":         {},
		"NEW":         {},
		"PORTAL":      {},
		"AI":          {},
		"PREMIUM":     {},
		"CENTURY":     {},
		"OFFICES":     {},
		"TRADEMARK":   {},
		"URBAN":       {},
		"LIFE":        {},
		"GENOVA":      {},
		"FERRARA":     {},
	}

	neighborhoodNoiseTokens = map[string]struct{}{
		"TORRE":         {},
		"TORRES":        {},
		"BLOCO":         {},
		"BL":            {},
		"SETOR":         {},
		"SUBSETOR":      {},
		"SUBSOLO":       {},
		"SUBCOND":       {},
		"SUBCONDOM":     {},
		"SUBCONDOMINIO": {},
		"COND":          {},
		"CONDOMINIO":    {},
		"CONDOMINIUM":   {},
		"EDIFICIO":      {},
		"ED":            {},
		"AL":            {},
		"ALAMEDA":       {},
		"AV":            {},
		"AVENIDA":       {},
		"R":             {},
		"RUA":           {},
		"LT":            {},
		"QD":            {},
		"SS":            {},
		"DP":            {},
		"VG":            {},
		"VGS":           {},
		"RES":           {},
	}
)

type ParseConfig struct {
	FilePath               string
	City                   string
	Source                 string
	NeighborhoodNormalizer NeighborhoodNormalizer
	MaxLLMCalls            int
	ApprovedAliases        map[string]string
}

type TxRecord struct {
	City               string
	Source             string
	Month              time.Time
	RegionRaw          string
	RegionNormalized   string
	PropertyClass      string
	SQLRegistration    string
	TransactionDate    sql.NullTime
	TransactionValue   float64
	AreaM2             float64
	PriceM2            float64
	IPTUUse            string
	IPTUUseDescription string
	RowHash            string
}

type ParseResult struct {
	Records       []TxRecord
	InputRows     int
	ValidRows     int
	TouchedMonths []time.Time
	LLMCalls      int
	LLMResolved   int
	AliasCandidates []AliasCandidate
}

type monthSheet struct {
	Name  string
	Month time.Time
}

func ParseAsOfMonth(value string) (time.Time, error) {
	t, err := time.Parse("2006-01", strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
}

func ParseWorkbook(ctx context.Context, cfg ParseConfig, asOfMonth time.Time) (ParseResult, error) {
	f, err := excelize.OpenFile(cfg.FilePath)
	if err != nil {
		return ParseResult{}, err
	}
	defer f.Close()

	if ctx == nil {
		ctx = context.Background()
	}

	sheets, err := monthlySheets(f.GetSheetList(), asOfMonth)
	if err != nil {
		return ParseResult{}, err
	}

	res := ParseResult{Records: make([]TxRecord, 0, 8192)}
	touched := make(map[string]time.Time)
	resolver := newNeighborhoodResolver(cfg.NeighborhoodNormalizer, cfg.MaxLLMCalls, cfg.ApprovedAliases)

	for _, sheet := range sheets {
		sheetRes, parseErr := parseMonthlySheet(ctx, f, cfg, sheet, resolver)
		if parseErr != nil {
			return ParseResult{}, fmt.Errorf("sheet %s: %w", sheet.Name, parseErr)
		}
		res.InputRows += sheetRes.InputRows
		res.ValidRows += sheetRes.ValidRows
		res.Records = append(res.Records, sheetRes.Records...)
		touched[sheet.Month.Format("2006-01-02")] = sheet.Month
	}

	res.TouchedMonths = make([]time.Time, 0, len(touched))
	for _, month := range touched {
		res.TouchedMonths = append(res.TouchedMonths, month)
	}
	sort.Slice(res.TouchedMonths, func(i, j int) bool {
		return res.TouchedMonths[i].Before(res.TouchedMonths[j])
	})
	res.LLMCalls, res.LLMResolved = resolver.Stats()
	res.AliasCandidates = resolver.PendingCandidates()

	return res, nil
}

func monthlySheets(sheetNames []string, asOfMonth time.Time) ([]monthSheet, error) {
	out := make([]monthSheet, 0, len(sheetNames))
	for _, sheet := range sheetNames {
		if !reMonthSheet.MatchString(sheet) {
			continue
		}
		month, err := parseSheetMonth(sheet)
		if err != nil {
			return nil, err
		}
		if month.After(asOfMonth) {
			continue
		}
		out = append(out, monthSheet{Name: sheet, Month: month})
	}

	if len(out) == 0 {
		return nil, errors.New("no monthly sheet found up to as-of-month")
	}

	sort.Slice(out, func(i, j int) bool { return out[i].Month.Before(out[j].Month) })
	return out, nil
}

func parseSheetMonth(sheet string) (time.Time, error) {
	parts := strings.Split(strings.ToUpper(strings.TrimSpace(sheet)), "-")
	if len(parts) != 2 {
		return time.Time{}, fmt.Errorf("invalid monthly sheet name: %s", sheet)
	}

	monthMap := map[string]time.Month{
		"JAN": time.January,
		"FEV": time.February,
		"MAR": time.March,
		"ABR": time.April,
		"MAI": time.May,
		"JUN": time.June,
		"JUL": time.July,
		"AGO": time.August,
		"SET": time.September,
		"OUT": time.October,
		"NOV": time.November,
		"DEZ": time.December,
	}

	month, ok := monthMap[parts[0]]
	if !ok {
		return time.Time{}, fmt.Errorf("unknown month abbreviation in sheet %s", sheet)
	}

	year, err := strconv.Atoi(parts[1])
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid year in sheet %s: %w", sheet, err)
	}

	return time.Date(year, month, 1, 0, 0, 0, 0, time.UTC), nil
}

func parseMonthlySheet(ctx context.Context, f *excelize.File, cfg ParseConfig, sheet monthSheet, resolver *neighborhoodResolver) (ParseResult, error) {
	rows, err := f.Rows(sheet.Name)
	if err != nil {
		return ParseResult{}, err
	}
	defer rows.Close()

	result := ParseResult{Records: make([]TxRecord, 0, 2048)}

	if !rows.Next() {
		return result, nil
	}
	headerRow, err := rows.Columns()
	if err != nil {
		return ParseResult{}, err
	}

	headerIndex := buildHeaderIndex(headerRow)
	required := []string{
		"N DO CADASTRO SQL",
		"BAIRRO",
		"VALOR DE TRANSACAO DECLARADO PELO CONTRIBUINTE",
		"DATA DE TRANSACAO",
		"AREA CONSTRUIDA M2",
		"USO IPTU",
		"DESCRICAO DO USO IPTU",
	}
	for _, key := range required {
		if _, ok := headerIndex[key]; !ok {
			return ParseResult{}, fmt.Errorf("missing required column %q in sheet %s", key, sheet.Name)
		}
	}

	for rows.Next() {
		cols, columnsErr := rows.Columns()
		if columnsErr != nil {
			return ParseResult{}, columnsErr
		}
		result.InputRows++

		regionRaw := strings.TrimSpace(getCol(cols, headerIndex, "BAIRRO"))
		if regionRaw == "" {
			continue
		}

		transactionValue, ok := parseMoney(getCol(cols, headerIndex, "VALOR DE TRANSACAO DECLARADO PELO CONTRIBUINTE"))
		if !ok || transactionValue <= 0 {
			continue
		}

		areaM2, ok := parseDecimal(getCol(cols, headerIndex, "AREA CONSTRUIDA M2"))
		if !ok || areaM2 <= 10 {
			continue
		}

		priceM2 := transactionValue / areaM2
		if priceM2 <= 5 || priceM2 >= 200000 || math.IsNaN(priceM2) || math.IsInf(priceM2, 0) {
			continue
		}

		transactionDate := parseDate(getCol(cols, headerIndex, "DATA DE TRANSACAO"))
		regionNormalized := normalizeNeighborhoodLabel(regionRaw)
		if resolver != nil {
			regionNormalized = resolver.Resolve(ctx, regionRaw, regionNormalized)
		}
		if regionNormalized == "" || isUnknownNeighborhoodLabel(regionNormalized) {
			continue
		}
		iptuUse := strings.TrimSpace(getCol(cols, headerIndex, "USO IPTU"))
		iptuDescription := strings.TrimSpace(getCol(cols, headerIndex, "DESCRICAO DO USO IPTU"))
		propertyClass := classifyPropertyClass(iptuUse, iptuDescription)
		sqlRegistration := strings.TrimSpace(getCol(cols, headerIndex, "N DO CADASTRO SQL"))

		hashInput := fmt.Sprintf("%s|%s|%s|%.2f|%.2f|%s|%s|%s", cfg.City, cfg.Source, sheet.Month.Format("2006-01-02"), transactionValue, areaM2, regionNormalized, sqlRegistration, iptuDescription)
		rowHash := hashValue(hashInput)

		rec := TxRecord{
			City:               cfg.City,
			Source:             cfg.Source,
			Month:              sheet.Month,
			RegionRaw:          regionRaw,
			RegionNormalized:   regionNormalized,
			PropertyClass:      propertyClass,
			SQLRegistration:    sqlRegistration,
			TransactionDate:    transactionDate,
			TransactionValue:   round2(transactionValue),
			AreaM2:             round2(areaM2),
			PriceM2:            round2(priceM2),
			IPTUUse:            iptuUse,
			IPTUUseDescription: iptuDescription,
			RowHash:            rowHash,
		}

		result.Records = append(result.Records, rec)
		result.ValidRows++
	}

	return result, nil
}

func buildHeaderIndex(headers []string) map[string]int {
	idx := make(map[string]int, len(headers))
	for i, h := range headers {
		normalized := normalizeHeader(h)
		if normalized == "" {
			continue
		}
		idx[normalized] = i
	}
	return idx
}

func normalizeHeader(value string) string {
	normalized := strings.ToUpper(normalizeText(value))
	normalized = strings.ReplaceAll(normalized, "N ", "N ")
	normalized = reHeaderChars.ReplaceAllString(normalized, " ")
	normalized = reWhitespace.ReplaceAllString(normalized, " ")
	return strings.TrimSpace(normalized)
}

func getCol(cols []string, headerIndex map[string]int, key string) string {
	idx, ok := headerIndex[key]
	if !ok || idx < 0 || idx >= len(cols) {
		return ""
	}
	return cols[idx]
}

func parseDecimal(raw string) (float64, bool) {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return 0, false
	}

	cleaned = reNonNumeric.ReplaceAllString(cleaned, "")
	if cleaned == "" {
		return 0, false
	}

	if strings.Count(cleaned, ",") > 0 && strings.Count(cleaned, ".") > 0 {
		if strings.LastIndex(cleaned, ",") > strings.LastIndex(cleaned, ".") {
			cleaned = strings.ReplaceAll(cleaned, ".", "")
			cleaned = strings.ReplaceAll(cleaned, ",", ".")
		} else {
			cleaned = strings.ReplaceAll(cleaned, ",", "")
		}
	} else if strings.Count(cleaned, ",") > 0 {
		cleaned = strings.ReplaceAll(cleaned, ",", ".")
	}

	value, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0, false
	}
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, false
	}
	return value, true
}

func parseMoney(raw string) (float64, bool) {
	return parseDecimal(raw)
}

func parseDate(raw string) sql.NullTime {
	value := strings.TrimSpace(raw)
	if value == "" {
		return sql.NullTime{}
	}

	if serial, ok := parseDecimal(value); ok {
		if serial > 0 {
			t, err := excelize.ExcelDateToTime(serial, false)
			if err == nil {
				return sql.NullTime{Time: t.UTC(), Valid: true}
			}
		}
	}

	layouts := []string{"02/01/2006", "2006-01-02", "02-01-2006"}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return sql.NullTime{Time: t.UTC(), Valid: true}
		}
	}

	return sql.NullTime{}
}

func classifyPropertyClass(iptuUse, desc string) string {
	value := strings.ToUpper(normalizeText(iptuUse + " " + desc))
	switch {
	case strings.Contains(value, "APART"), strings.Contains(value, "DUPLEX"), strings.Contains(value, "COBERTURA"):
		return "apartamento"
	case strings.Contains(value, "CASA"), strings.Contains(value, "RESIDENC"), strings.Contains(value, "SOBRADO"), strings.Contains(value, "TERREA"):
		return "casa"
	default:
		return "outros"
	}
}

func normalizeNeighborhoodLabel(value string) string {
	base := normalizeText(value)
	if base == "" {
		return ""
	}

	parts := normalizeNeighborhoodTokens(strings.Fields(base))
	if len(parts) == 0 {
		return ""
	}

	hasNoise := false
	hasDigit := false
	hasGarbage := false
	for _, token := range parts {
		if reHasDigit.MatchString(token) {
			hasDigit = true
		}
		if isNeighborhoodNoiseToken(token) {
			hasNoise = true
		}
		if _, bad := neighborhoodGarbageTokens[token]; bad {
			hasGarbage = true
		}
	}

	if hasNoise || hasDigit || hasGarbage {
		if anchored := extractAnchoredNeighborhood(parts); anchored != "" {
			return anchored
		}
		if hasGarbage {
			return ""
		}
		cleaned := filterNeighborhoodTokens(parts)
		if len(cleaned) < 2 {
			return ""
		}
		normalized := strings.Join(cleaned, " ")
		if isUnknownNeighborhoodLabel(normalized) {
			return ""
		}
		return normalized
	}

	return strings.Join(parts, " ")
}

func isUnknownNeighborhoodLabel(value string) bool {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return true
	}

	switch normalized {
	case
		"NAO INFORMADO",
		"NAO IDENTIFICADO",
		"NAO CONSTA",
		"SEM INFORMACAO",
		"SEM BAIRRO",
		"IGNORADO",
		"INDEFINIDO",
		"N D",
		"ND",
		"JARDIM FARIA LIMA I",
		"JARDIM FARIA LIMA II",
		"0":
		return true
	default:
		return false
	}
}

func normalizeText(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	decomposed := norm.NFD.String(trimmed)
	builder := strings.Builder{}
	builder.Grow(len(decomposed))
	for _, r := range decomposed {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(unicode.ToUpper(r))
			continue
		}
		builder.WriteRune(' ')
	}
	out := reWhitespace.ReplaceAllString(builder.String(), " ")
	return strings.TrimSpace(out)
}

func normalizeNeighborhoodTokens(parts []string) []string {
	out := make([]string, 0, len(parts))
	for i, token := range parts {
		replacement, ok := neighborhoodAlias[token]
		if ok {
			if (token == "J" || token == "V") && i > 0 {
				// Preserve single-letter token when it appears inside an expression.
			} else {
				token = replacement
			}
		}
		out = append(out, token)
	}
	return out
}

func isNeighborhoodNoiseToken(token string) bool {
	if _, ok := neighborhoodNoiseTokens[token]; ok {
		return true
	}
	if strings.HasPrefix(token, "SUBCOND") {
		return true
	}
	if strings.HasPrefix(token, "SUBCONDOM") {
		return true
	}
	if strings.HasPrefix(token, "CONDOM") {
		return true
	}
	return false
}

func extractAnchoredNeighborhood(parts []string) string {
	for i := len(parts) - 1; i >= 0; i-- {
		if _, ok := neighborhoodAnchorTokens[parts[i]]; !ok {
			continue
		}

		candidate := make([]string, 0, len(parts)-i)
		for j := i; j < len(parts); j++ {
			token := parts[j]
			if _, connector := neighborhoodConnectorTokens[token]; connector {
				continue
			}
			if isNeighborhoodNoiseToken(token) || reHasDigit.MatchString(token) {
				continue
			}
			if len(token) <= 1 {
				continue
			}
			if _, bad := neighborhoodGarbageTokens[token]; bad {
				continue
			}
			candidate = append(candidate, token)
		}

		if len(candidate) >= 2 {
			normalized := strings.Join(candidate, " ")
			if !isUnknownNeighborhoodLabel(normalized) {
				return normalized
			}
		}
	}

	return ""
}

func filterNeighborhoodTokens(parts []string) []string {
	out := make([]string, 0, len(parts))
	for _, token := range parts {
		if _, connector := neighborhoodConnectorTokens[token]; connector {
			continue
		}
		if isNeighborhoodNoiseToken(token) || reHasDigit.MatchString(token) {
			continue
		}
		if len(token) <= 1 {
			continue
		}
		if _, bad := neighborhoodGarbageTokens[token]; bad {
			continue
		}
		out = append(out, token)
	}
	return out
}

func hashValue(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
