package viability

// FinancingInputs represents the user-provided inputs for financing viability analysis
type FinancingInputs struct {
	PurchasePrice      *float64 `json:"purchase_price"`
	SalePrice          *float64 `json:"sale_price"`
	DownPaymentPercent *float64 `json:"down_payment_percent"`
	DownPaymentValue   *float64 `json:"down_payment_value"`
	FinancedValue      *float64 `json:"financed_value"`
	TermMonths         *int     `json:"term_months"`
	CET                *float64 `json:"cet"`
	InterestRate       *float64 `json:"interest_rate"`
	Insurance          *float64 `json:"insurance"`
	AppraisalFee       *float64 `json:"appraisal_fee"`
	OtherFees          *float64 `json:"other_fees"`
	RemainingDebt      *float64 `json:"remaining_debt"`
}

// FinancingPayment represents a single payment made
type FinancingPayment struct {
	MonthIndex int     `json:"month_index"`
	Amount     float64 `json:"amount"`
}

// FinancingSettings represents workspace-level settings used in calculations
type FinancingSettings struct {
	ITBIRate     float64 `json:"itbi_rate"`
	RegistryRate float64 `json:"registry_rate"`
	BrokerRate   float64 `json:"broker_rate"`
	PJTaxRate    float64 `json:"pj_tax_rate"`
}

// FinancingOutputs represents the calculated outputs for financing viability analysis
type FinancingOutputs struct {
	DownPaymentValue     float64 `json:"down_payment_value"`
	FinancedValue        float64 `json:"financed_value"`
	PaymentsTotal        float64 `json:"payments_total"`
	BankFeesTotal        float64 `json:"bank_fees_total"`
	ITBIValue            float64 `json:"itbi_value"`
	RegistryValue        float64 `json:"registry_value"`
	AcquisitionFees      float64 `json:"acquisition_fees"`
	TotalPaid            float64 `json:"total_paid"`
	InvestmentTotal      float64 `json:"investment_total"`
	BrokerFee            float64 `json:"broker_fee"`
	GrossProfit          float64 `json:"gross_profit"`
	PJTaxValue           float64 `json:"pj_tax_value"`
	NetProfit            float64 `json:"net_profit"`
	ROI                  float64 `json:"roi"`
	InterestPaidEstimate float64 `json:"interest_paid_estimate"`
	IsPartial            bool    `json:"is_partial"`
}

// CalculateFinancing computes the financing viability outputs from inputs, payments and settings.
// Server-side is the source of truth for all calculations.
func CalculateFinancing(inputs FinancingInputs, payments []FinancingPayment, settings FinancingSettings) FinancingOutputs {
	outputs := FinancingOutputs{}

	// Check if required inputs are missing
	if inputs.PurchasePrice == nil || inputs.SalePrice == nil {
		outputs.IsPartial = true
		return outputs
	}

	purchasePrice := *inputs.PurchasePrice
	salePrice := *inputs.SalePrice

	// Calculate down payment value
	var downPaymentValue float64
	if inputs.DownPaymentValue != nil {
		downPaymentValue = *inputs.DownPaymentValue
	} else if inputs.DownPaymentPercent != nil {
		downPaymentValue = round2(purchasePrice * (*inputs.DownPaymentPercent))
	}
	outputs.DownPaymentValue = downPaymentValue

	// Calculate financed value
	financedValue := round2(purchasePrice - downPaymentValue)
	outputs.FinancedValue = financedValue

	// Calculate payments total
	var paymentsTotal float64
	for _, p := range payments {
		paymentsTotal += p.Amount
	}
	outputs.PaymentsTotal = round2(paymentsTotal)

	// Calculate bank fees total
	insurance := getFloatOrZero(inputs.Insurance)
	appraisalFee := getFloatOrZero(inputs.AppraisalFee)
	otherFees := getFloatOrZero(inputs.OtherFees)
	bankFeesTotal := round2(insurance + appraisalFee + otherFees)
	outputs.BankFeesTotal = bankFeesTotal

	// Calculate acquisition fees (ITBI + Registry)
	outputs.ITBIValue = round2(purchasePrice * settings.ITBIRate)
	outputs.RegistryValue = round2(purchasePrice * settings.RegistryRate)
	outputs.AcquisitionFees = round2(outputs.ITBIValue + outputs.RegistryValue)

	// Calculate total paid
	outputs.TotalPaid = round2(downPaymentValue + paymentsTotal + bankFeesTotal + outputs.AcquisitionFees)

	// Calculate investment total (what the investor actually put in)
	outputs.InvestmentTotal = round2(downPaymentValue + paymentsTotal + bankFeesTotal)

	// Calculate interest paid estimate (if CET and term_months provided)
	if inputs.CET != nil && inputs.TermMonths != nil && *inputs.TermMonths > 0 {
		cet := *inputs.CET
		termMonths := float64(*inputs.TermMonths)
		outputs.InterestPaidEstimate = round2(financedValue * cet * (termMonths / 12.0))
	}

	// Calculate broker fee
	outputs.BrokerFee = round2(salePrice * settings.BrokerRate)

	// Calculate remaining debt
	remainingDebt := getFloatOrZero(inputs.RemainingDebt)

	// Calculate gross profit
	// sale_price - total_paid - remaining_debt - broker_fee
	outputs.GrossProfit = round2(salePrice - outputs.TotalPaid - remainingDebt - outputs.BrokerFee)

	// Calculate PJ tax
	outputs.PJTaxValue = round2(salePrice * settings.PJTaxRate)

	// Calculate net profit
	outputs.NetProfit = round2(outputs.GrossProfit - outputs.PJTaxValue)

	// Calculate ROI
	if outputs.InvestmentTotal > 0 {
		outputs.ROI = round2((outputs.NetProfit / outputs.InvestmentTotal) * 100)
	}

	outputs.IsPartial = false
	return outputs
}

// getFloatOrZero returns the value or 0 if nil
func getFloatOrZero(v *float64) float64 {
	if v == nil {
		return 0
	}
	return *v
}

// Note: round2 is defined in cash.go and reused here
