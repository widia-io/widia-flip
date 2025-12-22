package flipscore

import "time"

const Version = "v0"

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
		Version:    Version,
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
