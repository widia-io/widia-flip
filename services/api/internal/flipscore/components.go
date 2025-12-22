package flipscore

import "math"

// CalculateSPrice computes S_price (40% weight) - "cheap vs. your prospects"
// Uses percentile rank within cohort (neighborhood or workspace)
// Lower price_per_sqm = higher score
func CalculateSPrice(cohort CohortStats) float64 {
	// Fallback if cohort too small
	if cohort.N < 5 {
		return 50
	}
	// PercentileRank is 0-1 where lower = cheaper = better
	// Score = 100 * (1 - percentile_rank)
	return clamp(round2(100*(1-cohort.PercentileRank)), 0, 100)
}

// CalculateSCarry computes S_carry (15% weight) - recurring cost relative to ticket
// carry_ratio = carry_month / asking_price
// Linear interpolation: <= 0.10% → 100, >= 1.00% → 0
func CalculateSCarry(askingPrice, condoFee, iptu *float64) (float64, *float64) {
	if askingPrice == nil || *askingPrice == 0 {
		return 50, nil
	}

	// carry_month = condo_fee + (iptu / 12)
	carryMonth := float64(0)
	if condoFee != nil {
		carryMonth += *condoFee
	}
	if iptu != nil {
		carryMonth += *iptu / 12
	}

	carryRatio := carryMonth / *askingPrice
	carryRatioPtr := &carryRatio

	// Linear interpolation table (ratio as percentage, score)
	// <= 0.0010 (0.10%) → 100
	// 0.0020 (0.20%) → 85
	// 0.0030 (0.30%) → 70
	// 0.0050 (0.50%) → 50
	// 0.0070 (0.70%) → 30
	// >= 0.0100 (1.00%) → 0

	var score float64
	switch {
	case carryRatio <= 0.0010:
		score = 100
	case carryRatio <= 0.0020:
		score = interpolate(carryRatio, 0.0010, 0.0020, 100, 85)
	case carryRatio <= 0.0030:
		score = interpolate(carryRatio, 0.0020, 0.0030, 85, 70)
	case carryRatio <= 0.0050:
		score = interpolate(carryRatio, 0.0030, 0.0050, 70, 50)
	case carryRatio <= 0.0070:
		score = interpolate(carryRatio, 0.0050, 0.0070, 50, 30)
	case carryRatio <= 0.0100:
		score = interpolate(carryRatio, 0.0070, 0.0100, 30, 0)
	default:
		score = 0
	}

	return round2(score), carryRatioPtr
}

// CalculateSLiquidity computes S_liquidity (20% weight) - simple "saleability" proxy
// Base 50, with adjustments clamped 0-100
func CalculateSLiquidity(bedrooms, parking *int, areaUsable *float64, elevator *bool) float64 {
	score := 50.0

	// Bedrooms: 2-3 → +15, 1 or 4+ → -5
	if bedrooms != nil {
		b := *bedrooms
		if b >= 2 && b <= 3 {
			score += 15
		} else if b == 1 || b >= 4 {
			score -= 5
		}
	}

	// Parking: >= 1 → +10, == 0 → -5
	if parking != nil {
		if *parking >= 1 {
			score += 10
		} else {
			score -= 5
		}
	}

	// Area: 50-120m² → +15, outside → -5
	if areaUsable != nil {
		a := *areaUsable
		if a >= 50 && a <= 120 {
			score += 15
		} else {
			score -= 5
		}
	}

	// Elevator: true → +5
	if elevator != nil && *elevator {
		score += 5
	}

	return clamp(score, 0, 100)
}

// CalculateSRisk computes S_risk (25% weight) - risk penalties + rehab level
// No risk_assessment → 50
// With assessment: 100 - rehab_penalty - risk_penalty
func CalculateSRisk(assessment *FlipRiskAssessment) float64 {
	if assessment == nil {
		return 50 // Default when no LLM assessment
	}

	// Rehab penalty
	rehabPenalty := float64(0)
	if assessment.RehabLevel != nil {
		if penalty, ok := RehabPenalties[*assessment.RehabLevel]; ok {
			rehabPenalty = penalty
		}
	}

	// Red flag penalty: Σ (weight[category] * severity * confidence)
	riskPenalty := float64(0)
	for _, flag := range assessment.RedFlags {
		weight := CategoryWeights[flag.Category]
		if weight == 0 {
			weight = 5 // Default for unknown category
		}
		riskPenalty += weight * float64(flag.Severity) * flag.Confidence
	}

	return clamp(100-rehabPenalty-riskPenalty, 0, 100)
}

// CalculateSData computes S_data (data completeness score)
// Start at 100, deduct for missing fields
func CalculateSData(inputs ProspectInputs) (float64, []string) {
	score := 100.0
	missing := []string{}

	if inputs.AskingPrice == nil {
		score -= 35
		missing = append(missing, "asking_price")
	}
	if inputs.AreaUsable == nil {
		score -= 35
		missing = append(missing, "area_usable")
	}
	if inputs.Neighborhood == nil || *inputs.Neighborhood == "" {
		score -= 15
		missing = append(missing, "neighborhood")
	}
	if inputs.Bedrooms == nil {
		score -= 10
		missing = append(missing, "bedrooms")
	}
	if inputs.CondoFee == nil {
		score -= 5
		missing = append(missing, "condo_fee")
	}
	if inputs.IPTU == nil {
		score -= 5
		missing = append(missing, "iptu")
	}

	return clamp(score, 0, 100), missing
}

// Helper functions

func clamp(val, min, max float64) float64 {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}

func interpolate(x, x0, x1, y0, y1 float64) float64 {
	return y0 + (y1-y0)*(x-x0)/(x1-x0)
}

// ============================================================================
// V1 Components (Economics-based scoring)
// ============================================================================

// CalculateSEcon computes S_econ (60% weight in v1) - ROI-based score
// ROI interpolation: 0%→0, 10%→40, 20%→70, 30%→90, 40%+→100
func CalculateSEcon(roi float64) float64 {
	switch {
	case roi <= 0:
		return 0
	case roi <= 10:
		return interpolate(roi, 0, 10, 0, 40)
	case roi <= 20:
		return interpolate(roi, 10, 20, 40, 70)
	case roi <= 30:
		return interpolate(roi, 20, 30, 70, 90)
	case roi < 40:
		return interpolate(roi, 30, 40, 90, 100)
	default:
		return 100
	}
}

// CalculateBreakEvenSalePrice calculates minimum sale price for 0% profit
// breakEven = investmentTotal / (1 - brokerRate - pjTaxRate)
func CalculateBreakEvenSalePrice(investmentTotal, brokerRate, pjTaxRate float64) float64 {
	if investmentTotal <= 0 {
		return 0
	}
	denominator := 1 - brokerRate - pjTaxRate
	if denominator <= 0 {
		return 0 // Invalid rates
	}
	return round2(investmentTotal / denominator)
}

// CalculateSDataV1 computes data completeness score for v1
// Core v1 fields: expected_sale_price (required), offer_price or asking_price
func CalculateSDataV1(inputs ProspectInputsV1) (float64, []string) {
	score := 100.0
	missing := []string{}

	// V1 critical: expected_sale_price
	if inputs.ExpectedSalePrice == nil {
		score -= 40
		missing = append(missing, "expected_sale_price")
	}

	// Purchase price (offer or asking)
	if inputs.OfferPrice == nil && inputs.AskingPrice == nil {
		score -= 30
		missing = append(missing, "offer_price_or_asking_price")
	}

	// Optional but valuable
	if inputs.AreaUsable == nil {
		score -= 10
		missing = append(missing, "area_usable")
	}
	if inputs.RenovationCostEstimate == nil {
		score -= 10
		missing = append(missing, "renovation_cost_estimate")
	}
	if inputs.Bedrooms == nil {
		score -= 5
		missing = append(missing, "bedrooms")
	}
	if inputs.Neighborhood == nil || *inputs.Neighborhood == "" {
		score -= 5
		missing = append(missing, "neighborhood")
	}

	return clamp(score, 0, 100), missing
}

// CanCalculateV1 checks if v1 inputs are sufficient for calculation
func CanCalculateV1(inputs ProspectInputsV1) bool {
	hasPrice := inputs.OfferPrice != nil || inputs.AskingPrice != nil
	hasSalePrice := inputs.ExpectedSalePrice != nil
	return hasPrice && hasSalePrice
}
