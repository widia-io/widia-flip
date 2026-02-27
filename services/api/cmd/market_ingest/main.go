package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"log"
	"math"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/xuri/excelize/v2"
	"golang.org/x/text/unicode/norm"
)

const (
	defaultSource = "itbi_sp_guias_pagas"
	defaultCity   = "sp"
	regionType    = "bairro"
)

var (
	reMonthSheet  = regexp.MustCompile(`^[A-Za-z]{3}-\d{4}$`)
	reNonNumeric  = regexp.MustCompile(`[^0-9,.-]+`)
	reWhitespace  = regexp.MustCompile(`\s+`)
	reHeaderChars = regexp.MustCompile(`[^A-Z0-9 ]+`)
)

type config struct {
	FilePath  string
	City      string
	Source    string
	AsOfMonth string
	DBURL     string
	DryRun    bool
}

type txRecord struct {
	City                 string
	Source               string
	Month                time.Time
	RegionRaw            string
	RegionNormalized     string
	PropertyClass        string
	SQLRegistration      string
	TransactionDate      sql.NullTime
	TransactionValue     float64
	AreaM2               float64
	PriceM2              float64
	IPTUUse              string
	IPTUUseDescription   string
	RowHash              string
}

type parseResult struct {
	Records     []txRecord
	InputRows   int
	ValidRows   int
	TouchedMths []time.Time
}

type monthSheet struct {
	Name  string
	Month time.Time
}

func main() {
	cfg := parseFlags()
	asOfMonth, err := parseAsOfMonth(cfg.AsOfMonth)
	if err != nil {
		log.Fatalf("invalid --as-of-month: %v", err)
	}

	parsed, err := parseWorkbook(cfg, asOfMonth)
	if err != nil {
		log.Fatalf("failed parsing workbook: %v", err)
	}

	log.Printf("parsed workbook: input_rows=%d valid_rows=%d months=%d records=%d", parsed.InputRows, parsed.ValidRows, len(parsed.TouchedMths), len(parsed.Records))

	if cfg.DryRun {
		log.Printf("dry-run completed; no database writes performed")
		return
	}

	db, err := sql.Open("pgx", cfg.DBURL)
	if err != nil {
		log.Fatalf("db open failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("db ping failed: %v", err)
	}

	ctx := context.Background()
	runID, err := startRun(ctx, db, cfg, asOfMonth)
	if err != nil {
		log.Fatalf("failed creating ingestion run: %v", err)
	}

	outputGroups, err := ingest(ctx, db, runID, cfg, asOfMonth, parsed)
	if err != nil {
		_ = finishRun(ctx, db, runID, "failed", parsed.InputRows, parsed.ValidRows, 0, err)
		log.Fatalf("ingestion failed: %v", err)
	}

	if err := finishRun(ctx, db, runID, "success", parsed.InputRows, parsed.ValidRows, outputGroups, nil); err != nil {
		log.Fatalf("failed finalizing ingestion run: %v", err)
	}

	log.Printf("ingestion completed: run_id=%s output_groups=%d", runID, outputGroups)
}

func parseFlags() config {
	cfg := config{}

	flag.StringVar(&cfg.FilePath, "file", "docs/reference/GUIAS DE ITBI PAGAS (28012026) XLS.xlsx", "Path to XLSX file")
	flag.StringVar(&cfg.City, "city", defaultCity, "City slug (M14 supports: sp)")
	flag.StringVar(&cfg.Source, "source", defaultSource, "Source id")
	flag.StringVar(&cfg.AsOfMonth, "as-of-month", "", "Reference month in YYYY-MM")
	flag.StringVar(&cfg.DBURL, "db-url", os.Getenv("DATABASE_URL"), "Postgres DATABASE_URL")
	flag.BoolVar(&cfg.DryRun, "dry-run", false, "Parse workbook without DB writes")
	flag.Parse()

	cfg.City = strings.ToLower(strings.TrimSpace(cfg.City))
	cfg.Source = strings.TrimSpace(cfg.Source)
	cfg.FilePath = strings.TrimSpace(cfg.FilePath)
	cfg.AsOfMonth = strings.TrimSpace(cfg.AsOfMonth)

	if cfg.City != defaultCity {
		log.Fatalf("unsupported city %q (M14 supports only %q)", cfg.City, defaultCity)
	}
	if cfg.Source == "" {
		log.Fatalf("--source is required")
	}
	if cfg.FilePath == "" {
		log.Fatalf("--file is required")
	}
	if cfg.AsOfMonth == "" {
		log.Fatalf("--as-of-month is required (YYYY-MM)")
	}
	if !cfg.DryRun && strings.TrimSpace(cfg.DBURL) == "" {
		log.Fatalf("--db-url (or DATABASE_URL) is required unless --dry-run")
	}

	return cfg
}

func parseAsOfMonth(value string) (time.Time, error) {
	t, err := time.Parse("2006-01", value)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
}

func parseWorkbook(cfg config, asOfMonth time.Time) (parseResult, error) {
	f, err := excelize.OpenFile(cfg.FilePath)
	if err != nil {
		return parseResult{}, err
	}
	defer f.Close()

	sheets, err := monthlySheets(f.GetSheetList(), asOfMonth)
	if err != nil {
		return parseResult{}, err
	}

	res := parseResult{
		Records: make([]txRecord, 0, 8192),
	}
	touched := make(map[string]time.Time)

	for _, sheet := range sheets {
		sheetRes, err := parseMonthlySheet(f, cfg, sheet)
		if err != nil {
			return parseResult{}, fmt.Errorf("sheet %s: %w", sheet.Name, err)
		}
		res.InputRows += sheetRes.InputRows
		res.ValidRows += sheetRes.ValidRows
		res.Records = append(res.Records, sheetRes.Records...)
		touched[sheet.Month.Format("2006-01-02")] = sheet.Month
	}

	res.TouchedMths = make([]time.Time, 0, len(touched))
	for _, m := range touched {
		res.TouchedMths = append(res.TouchedMths, m)
	}
	sort.Slice(res.TouchedMths, func(i, j int) bool {
		return res.TouchedMths[i].Before(res.TouchedMths[j])
	})

	return res, nil
}

func monthlySheets(sheetNames []string, asOfMonth time.Time) ([]monthSheet, error) {
	out := make([]monthSheet, 0, len(sheetNames))
	for _, sheet := range sheetNames {
		if !reMonthSheet.MatchString(sheet) {
			continue
		}
		m, err := parseSheetMonth(sheet)
		if err != nil {
			return nil, err
		}
		if m.After(asOfMonth) {
			continue
		}
		out = append(out, monthSheet{Name: sheet, Month: m})
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

func parseMonthlySheet(f *excelize.File, cfg config, sheet monthSheet) (parseResult, error) {
	rows, err := f.Rows(sheet.Name)
	if err != nil {
		return parseResult{}, err
	}
	defer rows.Close()

	result := parseResult{Records: make([]txRecord, 0, 2048)}

	if !rows.Next() {
		return result, nil
	}
	headerRow, err := rows.Columns()
	if err != nil {
		return parseResult{}, err
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
			return parseResult{}, fmt.Errorf("missing required column %q in sheet %s", key, sheet.Name)
		}
	}

	for rows.Next() {
		cols, err := rows.Columns()
		if err != nil {
			return parseResult{}, err
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
		regionNormalized := normalizeText(regionRaw)
		iptuUse := strings.TrimSpace(getCol(cols, headerIndex, "USO IPTU"))
		iptuDescription := strings.TrimSpace(getCol(cols, headerIndex, "DESCRICAO DO USO IPTU"))
		propertyClass := classifyPropertyClass(iptuUse, iptuDescription)
		sqlRegistration := strings.TrimSpace(getCol(cols, headerIndex, "N DO CADASTRO SQL"))

		hashInput := fmt.Sprintf("%s|%s|%s|%.2f|%.2f|%s|%s|%s", cfg.City, cfg.Source, sheet.Month.Format("2006-01-02"), transactionValue, areaM2, regionNormalized, sqlRegistration, iptuDescription)
		rowHash := hashValue(hashInput)

		rec := txRecord{
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
		n := normalizeHeader(h)
		if n == "" {
			continue
		}
		idx[n] = i
	}
	return idx
}

func normalizeHeader(value string) string {
	v := strings.ToUpper(normalizeText(value))
	v = strings.ReplaceAll(v, "N ", "N ")
	v = reHeaderChars.ReplaceAllString(v, " ")
	v = reWhitespace.ReplaceAllString(v, " ")
	return strings.TrimSpace(v)
}

func getCol(cols []string, headerIndex map[string]int, key string) string {
	i, ok := headerIndex[key]
	if !ok || i < 0 || i >= len(cols) {
		return ""
	}
	return cols[i]
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

	v, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0, false
	}
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, false
	}
	return v, true
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
	v := strings.ToUpper(normalizeText(iptuUse + " " + desc))
	switch {
	case strings.Contains(v, "APART"):
		return "apartamento"
	case strings.Contains(v, "CASA"), strings.Contains(v, "RESIDENC"), strings.Contains(v, "SOBRADO"):
		return "casa"
	default:
		return "outros"
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

func hashValue(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func startRun(ctx context.Context, db *sql.DB, cfg config, asOfMonth time.Time) (string, error) {
	var runID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO market_ingestion_runs (source, city, as_of_month, status, started_at, created_at)
		VALUES ($1, $2, $3, 'running', NOW(), NOW())
		RETURNING id
	`, cfg.Source, cfg.City, asOfMonth).Scan(&runID)
	return runID, err
}

func finishRun(ctx context.Context, db *sql.DB, runID, status string, inputRows, validRows, outputGroups int, runErr error) error {
	var errMsg any
	if runErr != nil {
		errMsg = runErr.Error()
	}

	_, err := db.ExecContext(ctx, `
		UPDATE market_ingestion_runs
		SET status = $2,
			input_rows = $3,
			valid_rows = $4,
			output_groups = $5,
			error_message = $6,
			finished_at = NOW()
		WHERE id = $1
	`, runID, status, inputRows, validRows, outputGroups, errMsg)
	return err
}

func ingest(ctx context.Context, db *sql.DB, runID string, cfg config, asOfMonth time.Time, parsed parseResult) (int, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `SET LOCAL search_path TO flip, public`); err != nil {
		return 0, err
	}

	for _, month := range parsed.TouchedMths {
		if _, err := tx.ExecContext(ctx, `
			DELETE FROM market_transactions
			WHERE city = $1 AND source = $2 AND month = $3
		`, cfg.City, cfg.Source, month); err != nil {
			return 0, err
		}
	}

	regionIDs := make(map[string]string, 256)
	for _, rec := range parsed.Records {
		regionID, ok := regionIDs[rec.RegionNormalized]
		if !ok {
			regionID, err = upsertRegion(ctx, tx, cfg, rec.RegionRaw, rec.RegionNormalized)
			if err != nil {
				return 0, err
			}
			regionIDs[rec.RegionNormalized] = regionID
		}

		_, err := tx.ExecContext(ctx, `
			INSERT INTO market_transactions (
				run_id,
				city,
				source,
				month,
				region_id,
				region_name_raw,
				region_name_normalized,
				property_class,
				sql_registration,
				transaction_date,
				transaction_value,
				area_m2,
				price_m2,
				iptu_use,
				iptu_use_description,
				row_hash
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
			)
		`,
			runID,
			rec.City,
			rec.Source,
			rec.Month,
			regionID,
			rec.RegionRaw,
			rec.RegionNormalized,
			rec.PropertyClass,
			rec.SQLRegistration,
			rec.TransactionDate,
			rec.TransactionValue,
			rec.AreaM2,
			rec.PriceM2,
			rec.IPTUUse,
			rec.IPTUUseDescription,
			rec.RowHash,
		)
		if err != nil {
			return 0, err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM market_price_m2_aggregates
		WHERE city = $1 AND source = $2 AND as_of_month = $3
	`, cfg.City, cfg.Source, asOfMonth); err != nil {
		return 0, err
	}

	totalGroups := 0
	for _, period := range []int{1, 3, 6, 12} {
		startMonth := asOfMonth.AddDate(0, -(period - 1), 0)
		result, err := tx.ExecContext(ctx, `
			WITH base AS (
				SELECT city, region_id, price_m2, property_class
				FROM market_transactions
				WHERE city = $1
				  AND source = $2
				  AND month >= $3
				  AND month <= $4
			), expanded AS (
				SELECT city, region_id, price_m2, property_class FROM base
				UNION ALL
				SELECT city, region_id, price_m2, 'geral'::text AS property_class FROM base
			)
			INSERT INTO market_price_m2_aggregates (
				city,
				source,
				region_id,
				region_type,
				as_of_month,
				period_months,
				property_class,
				median_m2,
				p25_m2,
				p75_m2,
				tx_count,
				updated_at
			)
			SELECT
				e.city,
				$2,
				e.region_id,
				$5,
				$4,
				$6,
				e.property_class,
				ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY e.price_m2))::numeric, 2) AS median_m2,
				ROUND((percentile_cont(0.25) WITHIN GROUP (ORDER BY e.price_m2))::numeric, 2) AS p25_m2,
				ROUND((percentile_cont(0.75) WITHIN GROUP (ORDER BY e.price_m2))::numeric, 2) AS p75_m2,
				COUNT(*)::int,
				NOW()
			FROM expanded e
			GROUP BY e.city, e.region_id, e.property_class
			HAVING COUNT(*) > 0
		`, cfg.City, cfg.Source, startMonth, asOfMonth, regionType, period)
		if err != nil {
			return 0, err
		}
		affected, _ := result.RowsAffected()
		totalGroups += int(affected)
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return totalGroups, nil
}

func upsertRegion(ctx context.Context, tx *sql.Tx, cfg config, regionRaw, regionNormalized string) (string, error) {
	var regionID string
	err := tx.QueryRowContext(ctx, `
		INSERT INTO market_regions (
			city,
			region_type,
			name_raw,
			name_normalized,
			source,
			updated_at
		) VALUES (
			$1,$2,$3,$4,$5,NOW()
		)
		ON CONFLICT (city, region_type, name_normalized, source)
		DO UPDATE SET
			name_raw = EXCLUDED.name_raw,
			updated_at = NOW()
		RETURNING id
	`, cfg.City, regionType, regionRaw, regionNormalized, cfg.Source).Scan(&regionID)
	return regionID, err
}
