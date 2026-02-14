package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

// publicCashCalcRequest represents the request for public cash calculation
type publicCashCalcRequest struct {
	PurchasePrice  *float64            `json:"purchase_price"`
	RenovationCost *float64            `json:"renovation_cost"`
	OtherCosts     *float64            `json:"other_costs"`
	SalePrice      *float64            `json:"sale_price"`
	Settings       *publicCashSettings `json:"settings,omitempty"`
}

type publicCashSettings struct {
	ITBIRate     *float64 `json:"itbi_rate"`
	RegistryRate *float64 `json:"registry_rate"`
	BrokerRate   *float64 `json:"broker_rate"`
	PJTaxRate    *float64 `json:"pj_tax_rate"`
}

type publicCashCalcResponse struct {
	Inputs  publicCashInputs       `json:"inputs"`
	Outputs publicCashBasicOutputs `json:"outputs"`
}

type publicCashInputs struct {
	PurchasePrice  *float64 `json:"purchase_price"`
	RenovationCost *float64 `json:"renovation_cost"`
	OtherCosts     *float64 `json:"other_costs"`
	SalePrice      *float64 `json:"sale_price"`
}

type publicCashBasicOutputs struct {
	ROI       float64 `json:"roi"`
	IsPartial bool    `json:"is_partial"`
}

type publicCashDetailedOutputs struct {
	ITBIValue       float64 `json:"itbi_value"`
	RegistryValue   float64 `json:"registry_value"`
	AcquisitionCost float64 `json:"acquisition_cost"`
	InvestmentTotal float64 `json:"investment_total"`
	BrokerFee       float64 `json:"broker_fee"`
	GrossProfit     float64 `json:"gross_profit"`
	PJTaxValue      float64 `json:"pj_tax_value"`
	NetProfit       float64 `json:"net_profit"`
	ROI             float64 `json:"roi"`
	IsPartial       bool    `json:"is_partial"`
}

// Default settings for public calculator (BR defaults)
var defaultPublicSettings = viability.CashSettings{
	ITBIRate:     0.03, // 3%
	RegistryRate: 0.01, // 1%
	BrokerRate:   0.06, // 6%
	PJTaxRate:    0,    // 0% (optional)
}

// handlePublicCashCalc handles POST /api/v1/public/cash-calc
// This endpoint does NOT require authentication and does NOT persist any data.
func (a *api) handlePublicCashCalc(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req publicCashCalcRequest
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "invalid json body",
			Details: []string{err.Error()},
		})
		return
	}

	// Validate inputs
	if req.PurchasePrice != nil && *req.PurchasePrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "purchase_price must be >= 0"})
		return
	}
	if req.RenovationCost != nil && *req.RenovationCost < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "renovation_cost must be >= 0"})
		return
	}
	if req.OtherCosts != nil && *req.OtherCosts < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "other_costs must be >= 0"})
		return
	}
	if req.SalePrice != nil && *req.SalePrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "sale_price must be >= 0"})
		return
	}

	// Validate settings rates (must be between 0 and 1)
	if req.Settings != nil {
		if req.Settings.ITBIRate != nil && (*req.Settings.ITBIRate < 0 || *req.Settings.ITBIRate > 1) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "itbi_rate must be between 0 and 1"})
			return
		}
		if req.Settings.RegistryRate != nil && (*req.Settings.RegistryRate < 0 || *req.Settings.RegistryRate > 1) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "registry_rate must be between 0 and 1"})
			return
		}
		if req.Settings.BrokerRate != nil && (*req.Settings.BrokerRate < 0 || *req.Settings.BrokerRate > 1) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "broker_rate must be between 0 and 1"})
			return
		}
		if req.Settings.PJTaxRate != nil && (*req.Settings.PJTaxRate < 0 || *req.Settings.PJTaxRate > 1) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "pj_tax_rate must be between 0 and 1"})
			return
		}
	}

	// Build settings from request or use defaults
	settings := defaultPublicSettings
	if req.Settings != nil {
		if req.Settings.ITBIRate != nil {
			settings.ITBIRate = *req.Settings.ITBIRate
		}
		if req.Settings.RegistryRate != nil {
			settings.RegistryRate = *req.Settings.RegistryRate
		}
		if req.Settings.BrokerRate != nil {
			settings.BrokerRate = *req.Settings.BrokerRate
		}
		if req.Settings.PJTaxRate != nil {
			settings.PJTaxRate = *req.Settings.PJTaxRate
		}
	}

	// Build viability inputs
	viabilityInputs := viability.CashInputs{
		PurchasePrice:  req.PurchasePrice,
		RenovationCost: req.RenovationCost,
		OtherCosts:     req.OtherCosts,
		SalePrice:      req.SalePrice,
	}

	// Calculate
	result := viability.CalculateCash(viabilityInputs, settings)

	// Build response
	resp := publicCashCalcResponse{
		Inputs: publicCashInputs{
			PurchasePrice:  req.PurchasePrice,
			RenovationCost: req.RenovationCost,
			OtherCosts:     req.OtherCosts,
			SalePrice:      req.SalePrice,
		},
		Outputs: publicCashBasicOutputs{
			ROI:       result.ROI,
			IsPartial: result.IsPartial,
		},
	}

	writeJSON(w, http.StatusOK, resp)
}
