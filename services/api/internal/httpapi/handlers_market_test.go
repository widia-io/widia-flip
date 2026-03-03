package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

func TestHandlePublicMarketPriceM2Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	updatedAt := time.Date(2026, time.January, 15, 10, 0, 0, 0, time.UTC)
	rows := sqlmock.NewRows([]string{
		"region_id", "name_raw", "name_normalized", "median_m2", "p25_m2", "p75_m2", "tx_count", "updated_at", "source",
	}).AddRow("region-1", "MOOCA", "MOOCA", 8500.0, 7000.0, 9800.0, 42, updatedAt, "itbi_sp_guias_pagas")

	mock.ExpectQuery("FROM market_price_m2_aggregates").
		WithArgs("sp", sqlmock.AnyArg(), 6, "geral", 15).
		WillReturnRows(rows)

	a := &api{db: db}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/public/market/price-m2?city=sp&as_of_month=2025-12&period_months=6&property_class=geral", nil)
	rr := httptest.NewRecorder()

	a.handlePublicMarketPriceM2(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestHandlePublicMarketPriceM2Validation(t *testing.T) {
	a := &api{}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/public/market/price-m2?city=sp&as_of_month=2025-13&period_months=2", nil)
	rr := httptest.NewRecorder()

	a.handlePublicMarketPriceM2(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
}

func TestHandlePublicMarketSeriesNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	mock.ExpectQuery("FROM market_price_m2_aggregates a").
		WillReturnRows(sqlmock.NewRows([]string{"as_of_month", "median_m2", "p25_m2", "p75_m2", "tx_count", "updated_at", "source", "name_raw", "name_normalized"}))

	a := &api{db: db}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/public/market/series?city=sp&region_name=Mooca&period_months=6&property_class=geral&months=12", nil)
	rr := httptest.NewRecorder()

	a.handlePublicMarketSeries(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}
