package flipscore

import (
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

// Calculate computes the Flip Score v0 using the inputs, optional risk assessment, and cohort stats.
// The score is deterministic given the same inputs.
// If riskAssessment is nil, S_risk defaults to 50 and llm_confidence to 0.
func Calculate(inputs ProspectInputs, riskAssessment *FlipRiskAssessment, cohort CohortStats) Result {
	// Calculate all components
	sPrice := CalculateSPrice(cohort)
	sCarry, carryRatio := CalculateSCarry(inputs.AskingPrice, inputs.CondoFee, inputs.IPTU)
	sLiquidity := CalculateSLiquidity(inputs.Bedrooms, inputs.Parking, inputs.AreaUsable, inputs.Elevator)
	sRisk := CalculateSRisk(riskAssessment)
	sData, missingFields := CalculateSData(inputs)

	// Calculate price per sqm for intermediate values
	var pricePerSqm *float64
	if inputs.AskingPrice != nil && inputs.AreaUsable != nil && *inputs.AreaUsable > 0 {
		pps := *inputs.AskingPrice / *inputs.AreaUsable
		pricePerSqm = &pps
	}

	// Build components struct
	components := Components{
		SPrice:     sPrice,
		SCarry:     sCarry,
		SLiquidity: sLiquidity,
		SRisk:      sRisk,
		SData:      sData,
	}

	// Calculate raw score (weighted average)
	rawScore := WeightPrice*sPrice +
		WeightCarry*sCarry +
		WeightLiquidity*sLiquidity +
		WeightRisk*sRisk

	// Calculate multipliers
	// Data quality multiplier: m_data = 0.6 + 0.4*(S_data/100)
	mData := 0.6 + 0.4*(sData/100)

	// LLM confidence multiplier: m_llm = 0.7 + 0.3*llm_confidence
	// If no risk assessment, llm_confidence = 0, so m_llm = 0.7
	llmConfidence := float64(0)
	if riskAssessment != nil {
		llmConfidence = riskAssessment.LLMConfidence
	}
	mLLM := 0.7 + 0.3*llmConfidence

	// Final score
	finalScore := rawScore * mData * mLLM
	finalScoreInt := int(clamp(round2(finalScore), 0, 100))

	// Calculate overall confidence (combination of data completeness and LLM confidence)
	confidence := (sData/100)*0.5 + llmConfidence*0.5

	return Result{
		Score:      finalScoreInt,
		Version:    VersionV0,
		Confidence: round2(confidence),
		Breakdown: Breakdown{
			Components: components,
			Intermediate: Intermediate{
				PricePerSqm: pricePerSqm,
				CarryRatio:  carryRatio,
				CohortN:     cohort.N,
				CohortScope: cohort.Scope,
			},
			RiskAssessment: riskAssessment,
			MissingFields:  missingFields,
			Multipliers: Multipliers{
				MData: round2(mData),
				MLLM:  round2(mLLM),
			},
			RawScore: round2(rawScore),
		},
		ComputedAt: time.Now().UTC(),
	}
}

// ComputePricePerSqm is a helper to calculate price per square meter
func ComputePricePerSqm(askingPrice, areaUsable *float64) *float64 {
	if askingPrice == nil || areaUsable == nil || *areaUsable == 0 {
		return nil
	}
	pps := round2(*askingPrice / *areaUsable)
	return &pps
}

// ============================================================================
// V1 Score Calculation (Economics-based)
// ============================================================================

// CalculateV1 computes Flip Score v1 using economics-based scoring.
// Requires: ExpectedSalePrice and (OfferPrice or AskingPrice)
// Uses viability.CalculateCash for ROI calculation.
func CalculateV1(inputs ProspectInputsV1, riskAssessment *FlipRiskAssessment, cohort CohortStats, settings viability.CashSettings) ResultV1 {
	// Determine purchase price (offer_price or asking_price)
	var purchasePrice *float64
	if inputs.OfferPrice != nil {
		purchasePrice = inputs.OfferPrice
	} else {
		purchasePrice = inputs.AskingPrice
	}

	// Hold months defaults to 6
	holdMonths := 6
	if inputs.HoldMonths != nil && *inputs.HoldMonths > 0 {
		holdMonths = *inputs.HoldMonths
	}

	// Calculate carry cost for hold period
	// carry = (condo_fee + iptu/12) * hold_months
	carryCost := float64(0)
	if inputs.CondoFee != nil {
		carryCost += *inputs.CondoFee * float64(holdMonths)
	}
	if inputs.IPTU != nil {
		carryCost += (*inputs.IPTU / 12) * float64(holdMonths)
	}

	// Combine other costs: carry + user-provided other costs
	otherCosts := carryCost
	if inputs.OtherCostsEstimate != nil {
		otherCosts += *inputs.OtherCostsEstimate
	}

	// Prepare viability inputs
	viabilityInputs := viability.CashInputs{
		PurchasePrice:  purchasePrice,
		RenovationCost: inputs.RenovationCostEstimate,
		OtherCosts:     &otherCosts,
		SalePrice:      inputs.ExpectedSalePrice,
	}

	// Calculate cash viability
	cashOutputs := viability.CalculateCash(viabilityInputs, settings)

	// Calculate break-even sale price
	breakEven := CalculateBreakEvenSalePrice(
		cashOutputs.InvestmentTotal,
		settings.BrokerRate,
		settings.PJTaxRate,
	)

	// Calculate buffer (safety margin)
	buffer := float64(0)
	if inputs.ExpectedSalePrice != nil && breakEven > 0 {
		buffer = *inputs.ExpectedSalePrice - breakEven
	}

	// Build economics breakdown
	economics := &EconomicsBreakdown{
		ROI:                cashOutputs.ROI,
		NetProfit:          cashOutputs.NetProfit,
		GrossProfit:        cashOutputs.GrossProfit,
		InvestmentTotal:    cashOutputs.InvestmentTotal,
		BrokerFee:          cashOutputs.BrokerFee,
		PJTaxValue:         cashOutputs.PJTaxValue,
		BreakEvenSalePrice: breakEven,
		Buffer:             round2(buffer),
		IsPartial:          cashOutputs.IsPartial,
	}

	// Calculate components
	sEcon := CalculateSEcon(cashOutputs.ROI)
	sLiquidity := CalculateSLiquidity(inputs.Bedrooms, inputs.Parking, inputs.AreaUsable, inputs.Elevator)
	sRisk := CalculateSRisk(riskAssessment)
	sData, missingFields := CalculateSDataV1(inputs)

	components := ComponentsV1{
		SEcon:      round2(sEcon),
		SLiquidity: round2(sLiquidity),
		SRisk:      round2(sRisk),
		SData:      round2(sData),
	}

	// Calculate raw score (v1 weights: 60/20/20)
	rawScore := WeightV1Econ*sEcon +
		WeightV1Liquidity*sLiquidity +
		WeightV1Risk*sRisk

	// Calculate multipliers
	mData := 0.6 + 0.4*(sData/100)

	llmConfidence := float64(0)
	if riskAssessment != nil {
		llmConfidence = riskAssessment.LLMConfidence
	}
	mLLM := 0.7 + 0.3*llmConfidence

	// Final score
	finalScore := rawScore * mData * mLLM
	finalScoreInt := int(clamp(round2(finalScore), 0, 100))

	// Calculate confidence
	confidence := (sData/100)*0.5 + llmConfidence*0.5

	// Price per sqm for display
	var pricePerSqm *float64
	if purchasePrice != nil && inputs.AreaUsable != nil && *inputs.AreaUsable > 0 {
		pps := round2(*purchasePrice / *inputs.AreaUsable)
		pricePerSqm = &pps
	}

	return ResultV1{
		Score:      finalScoreInt,
		Version:    VersionV1,
		Confidence: round2(confidence),
		Breakdown: BreakdownV1{
			Components: components,
			Economics:  economics,
			Intermediate: Intermediate{
				PricePerSqm: pricePerSqm,
				CarryRatio:  nil, // Not used in v1
				CohortN:     cohort.N,
				CohortScope: cohort.Scope,
			},
			RiskAssessment: riskAssessment,
			MissingFields:  missingFields,
			Multipliers: Multipliers{
				MData: round2(mData),
				MLLM:  round2(mLLM),
			},
			RawScore: round2(rawScore),
		},
		ComputedAt: time.Now().UTC(),
	}
}
