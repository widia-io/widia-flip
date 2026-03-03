package httpapi

import (
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var (
	validMarketPeriods     = map[int]struct{}{1: {}, 3: {}, 6: {}, 12: {}}
	validMarketClass       = map[string]struct{}{"geral": {}, "apartamento": {}, "casa": {}, "outros": {}}
	marketWhitespaceRE     = regexp.MustCompile(`\s+`)
	marketAliasToCanonical = map[string]string{
		"JD":  "JARDIM",
		"J":   "JARDIM",
		"VL":  "VILA",
		"V":   "VILA",
		"PQ":  "PARQUE",
		"PQE": "PARQUE",
		"STA": "SANTA",
		"STO": "SANTO",
		"ST":  "SANTO",
		"PCA": "PRACA",
		"PC":  "PRACA",
	}
	marketCanonicalToAlias = map[string]string{
		"JARDIM": "JD",
		"VILA":   "VL",
		"PARQUE": "PQ",
		"SANTA":  "STA",
		"SANTO":  "STO",
		"PRACA":  "PCA",
	}
)

type marketFiltersResponse struct {
	City            string   `json:"city"`
	Source          string   `json:"source"`
	AvailableMonths []string `json:"available_months"`
	PeriodOptions   []int    `json:"period_options"`
	PropertyClasses []string `json:"property_classes"`
	UpdatedAt       *string  `json:"updated_at"`
}

type marketPriceItem struct {
	RegionID   string  `json:"region_id"`
	RegionName string  `json:"region_name"`
	MedianM2   float64 `json:"median_m2"`
	P25M2      float64 `json:"p25_m2"`
	P75M2      float64 `json:"p75_m2"`
	TxCount    int     `json:"tx_count"`
	Band       string  `json:"band"`
	Confidence string  `json:"confidence"`
	UpdatedAt  string  `json:"updated_at"`
}

type marketPriceSummary struct {
	CityMedianM2          float64 `json:"city_median_m2"`
	Q1MedianM2            float64 `json:"q1_median_m2"`
	Q3MedianM2            float64 `json:"q3_median_m2"`
	SpreadM2              float64 `json:"spread_m2"`
	RegionsCount          int     `json:"regions_count"`
	TotalTxCount          int     `json:"total_tx_count"`
	HighConfidenceRegions int     `json:"high_confidence_regions"`
	LowConfidenceRegions  int     `json:"low_confidence_regions"`
}

type marketPriceResponse struct {
	City          string             `json:"city"`
	AsOfMonth     string             `json:"as_of_month"`
	PeriodMonths  int                `json:"period_months"`
	PropertyClass string             `json:"property_class"`
	MinTxCount    int                `json:"min_tx_count"`
	Source        string             `json:"source"`
	UpdatedAt     *string            `json:"updated_at"`
	Summary       marketPriceSummary `json:"summary"`
	Items         []marketPriceItem  `json:"items"`
}

type marketSeriesPoint struct {
	AsOfMonth string  `json:"as_of_month"`
	MedianM2  float64 `json:"median_m2"`
	P25M2     float64 `json:"p25_m2"`
	P75M2     float64 `json:"p75_m2"`
	TxCount   int     `json:"tx_count"`
	UpdatedAt string  `json:"updated_at"`
}

type marketSeriesResponse struct {
	City          string              `json:"city"`
	RegionName    string              `json:"region_name"`
	PeriodMonths  int                 `json:"period_months"`
	PropertyClass string              `json:"property_class"`
	Source        string              `json:"source"`
	Points        []marketSeriesPoint `json:"points"`
}

type marketConsolidatedAggregate struct {
	RegionID       string
	RegionName     string
	TxCount        int
	MedianWeighted float64
	P25Weighted    float64
	P75Weighted    float64
	UpdatedAt      time.Time
}

// handlePublicMarketSubroutes routes /api/v1/public/market/*
func (a *api) handlePublicMarketSubroutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/public/market")
	switch path {
	case "/filters", "/filters/":
		a.handlePublicMarketFilters(w, r)
	case "/price-m2", "/price-m2/":
		a.handlePublicMarketPriceM2(w, r)
	case "/series", "/series/":
		a.handlePublicMarketSeries(w, r)
	default:
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
	}
}

func (a *api) handlePublicMarketFilters(w http.ResponseWriter, r *http.Request) {
	city := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("city")))
	if city == "" {
		city = "sp"
	}
	if city != "sp" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT TO_CHAR(as_of_month, 'YYYY-MM') AS as_of_month
		FROM market_price_m2_aggregates
		WHERE city = $1
		GROUP BY as_of_month
		ORDER BY as_of_month DESC
	`, city)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query market months"})
		return
	}
	defer rows.Close()

	months := make([]string, 0, 24)
	for rows.Next() {
		var m string
		if scanErr := rows.Scan(&m); scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan market month"})
			return
		}
		months = append(months, m)
	}

	var source sql.NullString
	var updatedAt sql.NullTime
	_ = a.db.QueryRowContext(r.Context(), `
		SELECT source, MAX(updated_at)
		FROM market_price_m2_aggregates
		WHERE city = $1
		GROUP BY source
		ORDER BY MAX(updated_at) DESC
		LIMIT 1
	`, city).Scan(&source, &updatedAt)

	var updatedAtStr *string
	if updatedAt.Valid {
		v := updatedAt.Time.UTC().Format(time.RFC3339)
		updatedAtStr = &v
	}

	writeJSON(w, http.StatusOK, marketFiltersResponse{
		City:            city,
		Source:          source.String,
		AvailableMonths: months,
		PeriodOptions:   []int{1, 3, 6, 12},
		PropertyClasses: []string{"geral", "apartamento", "casa", "outros"},
		UpdatedAt:       updatedAtStr,
	})
}

func (a *api) handlePublicMarketPriceM2(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	city := strings.ToLower(strings.TrimSpace(q.Get("city")))
	if city == "" {
		city = "sp"
	}
	if city != "sp" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	asOfMonth, err := parseMarketMonth(q.Get("as_of_month"))
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "as_of_month must be YYYY-MM"})
		return
	}

	periodMonths, err := parseMarketPeriod(q.Get("period_months"), 6)
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "period_months must be one of 1,3,6,12"})
		return
	}

	propertyClass, err := parseMarketPropertyClass(q.Get("property_class"), "geral")
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "property_class must be geral|apartamento|casa|outros"})
		return
	}

	minTxCount, err := parsePositiveInt(q.Get("min_tx_count"), 15)
	if err != nil || minTxCount < 1 || minTxCount > 500 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "min_tx_count must be between 1 and 500"})
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT
			a.region_id,
			r.name_raw,
			r.name_normalized,
			a.median_m2,
			a.p25_m2,
			a.p75_m2,
			a.tx_count,
			a.updated_at,
			a.source
		FROM market_price_m2_aggregates a
		JOIN market_regions r ON r.id = a.region_id
		WHERE a.city = $1
		  AND a.as_of_month = $2
		  AND a.period_months = $3
		  AND a.property_class = $4
		  AND a.tx_count >= $5
		ORDER BY a.median_m2 DESC
	`, city, asOfMonth, periodMonths, propertyClass, minTxCount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query market aggregates"})
		return
	}
	defer rows.Close()

	consolidated := make(map[string]*marketConsolidatedAggregate, 256)
	source := ""

	for rows.Next() {
		var regionID string
		var regionRaw string
		var regionNormalized string
		var medianM2 float64
		var p25M2 float64
		var p75M2 float64
		var txCount int
		var updated time.Time
		var rowSource string
		if scanErr := rows.Scan(
			&regionID,
			&regionRaw,
			&regionNormalized,
			&medianM2,
			&p25M2,
			&p75M2,
			&txCount,
			&updated,
			&rowSource,
		); scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan market aggregate"})
			return
		}

		canonical := canonicalizeMarketRegion(regionNormalized, regionRaw)
		if canonical == "" {
			continue
		}
		agg, ok := consolidated[canonical]
		if !ok {
			agg = &marketConsolidatedAggregate{
				RegionID:   regionID,
				RegionName: humanizeRegionName(canonical, regionRaw),
			}
			consolidated[canonical] = agg
		}

		weight := float64(txCount)
		agg.TxCount += txCount
		agg.MedianWeighted += medianM2 * weight
		agg.P25Weighted += p25M2 * weight
		agg.P75Weighted += p75M2 * weight
		if updated.After(agg.UpdatedAt) {
			agg.UpdatedAt = updated
		}

		if strings.TrimSpace(rowSource) != "" {
			source = rowSource
		}
	}

	items := make([]marketPriceItem, 0, len(consolidated))
	medians := make([]float64, 0, len(consolidated))
	weightedSum := 0.0
	totalTx := 0
	highConfidence := 0
	lowConfidence := 0
	var updatedAt *string

	for canonical, agg := range consolidated {
		if agg.TxCount <= 0 {
			continue
		}

		item := marketPriceItem{
			RegionID:   agg.RegionID,
			RegionName: agg.RegionName,
			MedianM2:   round2(agg.MedianWeighted / float64(agg.TxCount)),
			P25M2:      round2(agg.P25Weighted / float64(agg.TxCount)),
			P75M2:      round2(agg.P75Weighted / float64(agg.TxCount)),
			TxCount:    agg.TxCount,
		}
		if item.RegionID == "" {
			item.RegionID = canonical
		}

		if agg.UpdatedAt.IsZero() {
			item.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		} else {
			item.UpdatedAt = agg.UpdatedAt.UTC().Format(time.RFC3339)
		}
		if updatedAt == nil || item.UpdatedAt > *updatedAt {
			v := item.UpdatedAt
			updatedAt = &v
		}

		item.Confidence = confidenceFromTxCount(item.TxCount)
		if item.Confidence == "alta" {
			highConfidence++
		}
		if item.Confidence == "baixa" {
			lowConfidence++
		}

		totalTx += item.TxCount
		weightedSum += item.MedianM2 * float64(item.TxCount)
		medians = append(medians, item.MedianM2)
		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].MedianM2 == items[j].MedianM2 {
			return items[i].RegionName < items[j].RegionName
		}
		return items[i].MedianM2 > items[j].MedianM2
	})

	cityMedian := 0.0
	if totalTx > 0 {
		cityMedian = weightedSum / float64(totalTx)
	}
	q1 := quantileFloat64(medians, 0.25)
	q3 := quantileFloat64(medians, 0.75)

	for i := range items {
		items[i].Band = bandFromMedian(items[i].MedianM2, cityMedian, q1, q3)
	}

	writeJSON(w, http.StatusOK, marketPriceResponse{
		City:          city,
		AsOfMonth:     asOfMonth.Format("2006-01"),
		PeriodMonths:  periodMonths,
		PropertyClass: propertyClass,
		MinTxCount:    minTxCount,
		Source:        source,
		UpdatedAt:     updatedAt,
		Summary: marketPriceSummary{
			CityMedianM2:          round2(cityMedian),
			Q1MedianM2:            round2(q1),
			Q3MedianM2:            round2(q3),
			SpreadM2:              round2(math.Max(q3-q1, 0)),
			RegionsCount:          len(items),
			TotalTxCount:          totalTx,
			HighConfidenceRegions: highConfidence,
			LowConfidenceRegions:  lowConfidence,
		},
		Items: items,
	})
}

func (a *api) handlePublicMarketSeries(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	city := strings.ToLower(strings.TrimSpace(q.Get("city")))
	if city == "" {
		city = "sp"
	}
	if city != "sp" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	regionName := strings.TrimSpace(q.Get("region_name"))
	if regionName == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "region_name is required"})
		return
	}
	targetCanonical := canonicalizeMarketRegion(normalizeMarketLabel(regionName), regionName)
	if targetCanonical == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "region_name is invalid"})
		return
	}

	periodMonths, err := parseMarketPeriod(q.Get("period_months"), 6)
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "period_months must be one of 1,3,6,12"})
		return
	}

	propertyClass, err := parseMarketPropertyClass(q.Get("property_class"), "geral")
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "property_class must be geral|apartamento|casa|outros"})
		return
	}

	months, err := parsePositiveInt(q.Get("months"), 12)
	if err != nil || months <= 0 || months > 24 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "months must be between 1 and 24"})
		return
	}

	candidates := marketRegionCandidates(targetCanonical)
	if len(candidates) == 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "region_name is invalid"})
		return
	}

	queryArgs := make([]any, 0, 4+len(candidates))
	queryArgs = append(queryArgs, city, periodMonths, propertyClass)

	placeholders := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		queryArgs = append(queryArgs, candidate)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(queryArgs)))
	}

	limitArg := months * len(candidates)
	if limitArg < months {
		limitArg = months
	}
	queryArgs = append(queryArgs, limitArg)

	query := fmt.Sprintf(`
		SELECT
			TO_CHAR(a.as_of_month, 'YYYY-MM') AS as_of_month,
			a.median_m2,
			a.p25_m2,
			a.p75_m2,
			a.tx_count,
			a.updated_at,
			a.source,
			r.name_raw,
			r.name_normalized
		FROM market_price_m2_aggregates a
		JOIN market_regions r ON r.id = a.region_id
		WHERE a.city = $1
		  AND a.period_months = $2
		  AND a.property_class = $3
		  AND r.name_normalized IN (%s)
		ORDER BY a.as_of_month DESC
		LIMIT $%d
	`, strings.Join(placeholders, ","), len(queryArgs))

	rows, err := a.db.QueryContext(r.Context(), query, queryArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query market series"})
		return
	}
	defer rows.Close()

	type seriesAggregate struct {
		AsOfMonth string
		TxCount   int
		MedianSum float64
		P25Sum    float64
		P75Sum    float64
		UpdatedAt time.Time
	}
	seriesByMonth := make(map[string]*seriesAggregate, months)
	source := ""
	resolvedRegionName := humanizeRegionName(targetCanonical, regionName)

	for rows.Next() {
		var asOfMonth string
		var medianM2 float64
		var p25M2 float64
		var p75M2 float64
		var txCount int
		var updated time.Time
		var rowSource string
		var rowNameRaw string
		var rowNameNormalized string
		if scanErr := rows.Scan(&asOfMonth, &medianM2, &p25M2, &p75M2, &txCount, &updated, &rowSource, &rowNameRaw, &rowNameNormalized); scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan market series"})
			return
		}

		rowCanonical := canonicalizeMarketRegion(rowNameNormalized, rowNameRaw)
		if rowCanonical != targetCanonical {
			continue
		}

		agg, ok := seriesByMonth[asOfMonth]
		if !ok {
			agg = &seriesAggregate{AsOfMonth: asOfMonth}
			seriesByMonth[asOfMonth] = agg
		}

		weight := float64(txCount)
		agg.TxCount += txCount
		agg.MedianSum += medianM2 * weight
		agg.P25Sum += p25M2 * weight
		agg.P75Sum += p75M2 * weight
		if updated.After(agg.UpdatedAt) {
			agg.UpdatedAt = updated
		}

		if strings.TrimSpace(rowSource) != "" {
			source = rowSource
		}
	}

	if len(seriesByMonth) == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "no series found for region"})
		return
	}

	monthKeys := make([]string, 0, len(seriesByMonth))
	for key := range seriesByMonth {
		monthKeys = append(monthKeys, key)
	}
	sort.Strings(monthKeys)
	for i, j := 0, len(monthKeys)-1; i < j; i, j = i+1, j-1 {
		monthKeys[i], monthKeys[j] = monthKeys[j], monthKeys[i]
	}

	points := make([]marketSeriesPoint, 0, len(monthKeys))
	for _, key := range monthKeys {
		agg := seriesByMonth[key]
		if agg.TxCount <= 0 {
			continue
		}
		point := marketSeriesPoint{
			AsOfMonth: key,
			MedianM2:  round2(agg.MedianSum / float64(agg.TxCount)),
			P25M2:     round2(agg.P25Sum / float64(agg.TxCount)),
			P75M2:     round2(agg.P75Sum / float64(agg.TxCount)),
			TxCount:   agg.TxCount,
			UpdatedAt: agg.UpdatedAt.UTC().Format(time.RFC3339),
		}
		points = append(points, point)
		if len(points) >= months {
			break
		}
	}

	if len(points) == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "no series found for region"})
		return
	}

	writeJSON(w, http.StatusOK, marketSeriesResponse{
		City:          city,
		RegionName:    resolvedRegionName,
		PeriodMonths:  periodMonths,
		PropertyClass: propertyClass,
		Source:        source,
		Points:        points,
	})
}

func parseMarketMonth(raw string) (time.Time, error) {
	v := strings.TrimSpace(raw)
	if v == "" {
		return time.Time{}, fmt.Errorf("empty")
	}
	t, err := time.Parse("2006-01", v)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
}

func parseMarketPeriod(raw string, fallback int) (int, error) {
	if strings.TrimSpace(raw) == "" {
		if _, ok := validMarketPeriods[fallback]; ok {
			return fallback, nil
		}
		return 0, fmt.Errorf("invalid fallback")
	}
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0, err
	}
	if _, ok := validMarketPeriods[value]; !ok {
		return 0, fmt.Errorf("invalid period")
	}
	return value, nil
}

func parseMarketPropertyClass(raw string, fallback string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		value = fallback
	}
	if _, ok := validMarketClass[value]; !ok {
		return "", fmt.Errorf("invalid property class")
	}
	return value, nil
}

func parsePositiveInt(raw string, fallback int) (int, error) {
	if strings.TrimSpace(raw) == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0, err
	}
	if value <= 0 {
		return 0, fmt.Errorf("must be positive")
	}
	return value, nil
}

func canonicalizeMarketRegion(normalized, fallback string) string {
	value := strings.TrimSpace(normalized)
	if value == "" {
		value = normalizeMarketLabel(fallback)
	}
	if value == "" {
		return ""
	}

	parts := strings.Fields(value)
	for i, token := range parts {
		if replacement, ok := marketAliasToCanonical[token]; ok {
			if isAmbiguousShortMarketToken(token) && i > 0 {
				continue
			}
			parts[i] = replacement
		}
	}
	return strings.Join(parts, " ")
}

func marketRegionCandidates(canonical string) []string {
	value := strings.TrimSpace(canonical)
	if value == "" {
		return nil
	}

	choices := map[string]struct{}{value: {}}
	parts := strings.Fields(value)
	if len(parts) > 0 {
		if alias, ok := marketCanonicalToAlias[parts[0]]; ok {
			withAlias := append([]string{alias}, parts[1:]...)
			choices[strings.Join(withAlias, " ")] = struct{}{}
		}
	}

	out := make([]string, 0, len(choices))
	for candidate := range choices {
		out = append(out, candidate)
	}
	sort.Strings(out)
	return out
}

func isAmbiguousShortMarketToken(token string) bool {
	return token == "J" || token == "V"
}

func normalizeMarketLabel(value string) string {
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

	out := marketWhitespaceRE.ReplaceAllString(builder.String(), " ")
	return strings.TrimSpace(out)
}

func humanizeRegionName(normalized, fallback string) string {
	value := strings.TrimSpace(normalized)
	if value == "" {
		value = normalizeMarketLabel(fallback)
	}
	if value == "" {
		return fallback
	}

	parts := strings.Fields(strings.ToLower(value))
	for i, part := range parts {
		if part == "dos" || part == "das" || part == "de" || part == "da" || part == "do" {
			parts[i] = part
			continue
		}
		runes := []rune(part)
		if len(runes) == 0 {
			continue
		}
		runes[0] = unicode.ToUpper(runes[0])
		parts[i] = string(runes)
	}
	return strings.Join(parts, " ")
}

func confidenceFromTxCount(txCount int) string {
	switch {
	case txCount >= 80:
		return "alta"
	case txCount >= 30:
		return "media"
	default:
		return "baixa"
	}
}

func bandFromMedian(median, cityMedian, q1, q3 float64) string {
	switch {
	case median >= q3:
		return "premium"
	case median >= cityMedian:
		return "acima_media"
	case median >= q1:
		return "media"
	default:
		return "abaixo_media"
	}
}

func quantileFloat64(values []float64, q float64) float64 {
	if len(values) == 0 {
		return 0
	}
	copied := append([]float64(nil), values...)
	sort.Float64s(copied)
	if len(copied) == 1 {
		return copied[0]
	}

	position := q * float64(len(copied)-1)
	lower := int(math.Floor(position))
	upper := int(math.Ceil(position))
	if lower == upper {
		return copied[lower]
	}
	weight := position - float64(lower)
	return copied[lower]*(1-weight) + copied[upper]*weight
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
