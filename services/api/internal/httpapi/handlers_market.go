package httpapi

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var (
	validMarketPeriods = map[int]struct{}{1: {}, 3: {}, 6: {}, 12: {}}
	validMarketClass   = map[string]struct{}{"geral": {}, "apartamento": {}, "casa": {}, "outros": {}}
	marketWhitespaceRE = regexp.MustCompile(`\s+`)
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
	UpdatedAt  string  `json:"updated_at"`
}

type marketPriceResponse struct {
	City          string            `json:"city"`
	AsOfMonth     string            `json:"as_of_month"`
	PeriodMonths  int               `json:"period_months"`
	PropertyClass string            `json:"property_class"`
	Source        string            `json:"source"`
	UpdatedAt     *string           `json:"updated_at"`
	Items         []marketPriceItem `json:"items"`
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

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT
			a.region_id,
			r.name_raw,
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
		ORDER BY a.median_m2 DESC
	`, city, asOfMonth, periodMonths, propertyClass)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query market aggregates"})
		return
	}
	defer rows.Close()

	items := make([]marketPriceItem, 0, 256)
	var source string
	var updatedAt *string
	for rows.Next() {
		var item marketPriceItem
		var updated time.Time
		if scanErr := rows.Scan(
			&item.RegionID,
			&item.RegionName,
			&item.MedianM2,
			&item.P25M2,
			&item.P75M2,
			&item.TxCount,
			&updated,
			&source,
		); scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan market aggregate"})
			return
		}
		item.UpdatedAt = updated.UTC().Format(time.RFC3339)
		if updatedAt == nil || item.UpdatedAt > *updatedAt {
			value := item.UpdatedAt
			updatedAt = &value
		}
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, marketPriceResponse{
		City:          city,
		AsOfMonth:     asOfMonth.Format("2006-01"),
		PeriodMonths:  periodMonths,
		PropertyClass: propertyClass,
		Source:        source,
		UpdatedAt:     updatedAt,
		Items:         items,
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
	regionNormalized := normalizeMarketLabel(regionName)

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

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT
			TO_CHAR(a.as_of_month, 'YYYY-MM') AS as_of_month,
			a.median_m2,
			a.p25_m2,
			a.p75_m2,
			a.tx_count,
			a.updated_at,
			a.source,
			r.name_raw
		FROM market_price_m2_aggregates a
		JOIN market_regions r ON r.id = a.region_id
		WHERE a.city = $1
		  AND r.name_normalized = $2
		  AND a.period_months = $3
		  AND a.property_class = $4
		ORDER BY a.as_of_month DESC
		LIMIT $5
	`, city, regionNormalized, periodMonths, propertyClass, months)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query market series"})
		return
	}
	defer rows.Close()

	points := make([]marketSeriesPoint, 0, months)
	source := ""
	resolvedRegionName := regionName
	for rows.Next() {
		var p marketSeriesPoint
		var updated time.Time
		if scanErr := rows.Scan(&p.AsOfMonth, &p.MedianM2, &p.P25M2, &p.P75M2, &p.TxCount, &updated, &source, &resolvedRegionName); scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan market series"})
			return
		}
		p.UpdatedAt = updated.UTC().Format(time.RFC3339)
		points = append(points, p)
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
