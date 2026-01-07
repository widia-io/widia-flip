package viability

import "math"

// CashInputs represents the user-provided inputs for cash viability analysis
type CashInputs struct {
	PurchasePrice  *float64 `json:"purchase_price"`
	RenovationCost *float64 `json:"renovation_cost"`
	OtherCosts     *float64 `json:"other_costs"`
	SalePrice      *float64 `json:"sale_price"`
}

// CashSettings represents workspace-level settings used in calculations
type CashSettings struct {
	ITBIRate     float64 `json:"itbi_rate"`
	RegistryRate float64 `json:"registry_rate"`
	BrokerRate   float64 `json:"broker_rate"`
	PJTaxRate    float64 `json:"pj_tax_rate"`
}

// CashOutputs represents the calculated outputs for cash viability analysis
type CashOutputs struct {
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

// CalculateCash computes the cash viability outputs from inputs and settings.
// Server-side is the source of truth for all calculations.
func CalculateCash(inputs CashInputs, settings CashSettings) CashOutputs {
	outputs := CashOutputs{}

	// Check if required inputs are missing
	if inputs.PurchasePrice == nil || inputs.SalePrice == nil {
		outputs.IsPartial = true
		return outputs
	}

	purchasePrice := *inputs.PurchasePrice
	salePrice := *inputs.SalePrice

	// Default optional inputs to 0
	renovationCost := float64(0)
	if inputs.RenovationCost != nil {
		renovationCost = *inputs.RenovationCost
	}

	otherCosts := float64(0)
	if inputs.OtherCosts != nil {
		otherCosts = *inputs.OtherCosts
	}

	// Calculate acquisition costs
	outputs.ITBIValue = round2(purchasePrice * settings.ITBIRate)
	outputs.RegistryValue = round2(purchasePrice * settings.RegistryRate)
	outputs.AcquisitionCost = round2(purchasePrice + outputs.ITBIValue + outputs.RegistryValue)

	// Calculate total investment
	outputs.InvestmentTotal = round2(outputs.AcquisitionCost + renovationCost + otherCosts)

	// Calculate sale costs and profit
	outputs.BrokerFee = round2(salePrice * settings.BrokerRate)
	outputs.GrossProfit = round2(salePrice - outputs.InvestmentTotal - outputs.BrokerFee)

	// Calculate taxes (PJ tax rate on gross profit, not sale price)
	outputs.PJTaxValue = round2(outputs.GrossProfit * settings.PJTaxRate)
	outputs.NetProfit = round2(outputs.GrossProfit - outputs.PJTaxValue)

	// Calculate ROI
	if outputs.InvestmentTotal > 0 {
		outputs.ROI = round2((outputs.NetProfit / outputs.InvestmentTotal) * 100)
	}

	outputs.IsPartial = false
	return outputs
}

// round2 rounds a float64 to 2 decimal places
func round2(val float64) float64 {
	return math.Round(val*100) / 100
}
