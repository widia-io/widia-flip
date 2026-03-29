package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandlePublicCashCalcReturnsDetailedOutputsWhenComplete(t *testing.T) {
	a := &api{}

	body := bytes.NewBufferString(`{
		"purchase_price": 500000,
		"renovation_cost": 50000,
		"other_costs": 10000,
		"sale_price": 700000
	}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/cash-calc", body)
	rr := httptest.NewRecorder()

	a.handlePublicCashCalc(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var resp publicCashCalcResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v body=%s", err, rr.Body.String())
	}

	if resp.Outputs.IsPartial {
		t.Fatalf("outputs.isPartial=true want=false")
	}
	if resp.Outputs.InvestmentTotal <= 0 {
		t.Fatalf("outputs.investmentTotal=%v want>0", resp.Outputs.InvestmentTotal)
	}
	if resp.Outputs.ROI == 0 {
		t.Fatalf("outputs.roi=%v want non-zero", resp.Outputs.ROI)
	}
	if resp.Outputs.AcquisitionCost <= 0 {
		t.Fatalf("outputs.acquisitionCost=%v want>0", resp.Outputs.AcquisitionCost)
	}
}

func TestHandlePublicCashCalcReturnsDetailedOutputsWhenPartial(t *testing.T) {
	a := &api{}

	body := bytes.NewBufferString(`{
		"purchase_price": 500000
	}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/cash-calc", body)
	rr := httptest.NewRecorder()

	a.handlePublicCashCalc(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var resp publicCashCalcResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v body=%s", err, rr.Body.String())
	}

	if !resp.Outputs.IsPartial {
		t.Fatalf("outputs.isPartial=false want=true")
	}
	if resp.Outputs.ROI != 0 {
		t.Fatalf("outputs.roi=%v want=0", resp.Outputs.ROI)
	}
	if resp.Outputs.AcquisitionCost != 0 {
		t.Fatalf("outputs.acquisitionCost=%v want=0", resp.Outputs.AcquisitionCost)
	}
}
