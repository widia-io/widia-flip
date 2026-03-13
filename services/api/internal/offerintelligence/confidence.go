package offerintelligence

import (
	"errors"
	"math"
)

func WeightsFromMap(raw map[string]float64) (ConfidenceWeights, error) {
	if raw == nil {
		return ConfidenceWeights{}, errors.New("weights are nil")
	}

	required := []string{
		"input_quality",
		"default_dependency",
		"economic_consistency",
		"risk_signals",
		"market_coverage",
	}
	for _, key := range required {
		v, ok := raw[key]
		if !ok {
			return ConfidenceWeights{}, errors.New("missing confidence weight key")
		}
		if v < 0 {
			return ConfidenceWeights{}, errors.New("confidence weights must be >= 0")
		}
	}

	w := ConfidenceWeights{
		InputQuality:        raw["input_quality"],
		DefaultDependency:   raw["default_dependency"],
		EconomicConsistency: raw["economic_consistency"],
		RiskSignals:         raw["risk_signals"],
		MarketCoverage:      raw["market_coverage"],
	}

	if math.Abs(w.Sum()-1.0) > 0.0001 {
		return ConfidenceWeights{}, errors.New("confidence weights must sum to 1")
	}

	return w, nil
}

type ConfidenceInput struct {
	CriticalPresent      int
	CriticalTotal        int
	DefaultsCount        int
	DefaultsTotal        int
	OptimisticSalePrice  bool
	RenovationToAskRatio float64
	RiskScore            float64
	HasNeighborhood      bool
	HasArea              bool
}

func CalculateConfidence(input ConfidenceInput, weights ConfidenceWeights) (float64, ConfidenceComponents) {
	inputQuality := safeRatio(input.CriticalPresent, input.CriticalTotal)
	defaultDependency := 1.0 - safeRatio(input.DefaultsCount, input.DefaultsTotal)

	economicConsistency := 1.0
	if input.OptimisticSalePrice {
		economicConsistency -= 0.45
	}
	switch {
	case input.RenovationToAskRatio > 0.40:
		economicConsistency -= 0.25
	case input.RenovationToAskRatio > 0.25:
		economicConsistency -= 0.15
	}
	economicConsistency = clamp01(economicConsistency)

	riskSignals := 1.0 - clamp01(input.RiskScore/100.0)

	marketCoverage := 0.60
	switch {
	case input.HasNeighborhood && input.HasArea:
		marketCoverage = 0.80
	case input.HasNeighborhood || input.HasArea:
		marketCoverage = 0.65
	}

	score :=
		weights.InputQuality*inputQuality +
			weights.DefaultDependency*defaultDependency +
			weights.EconomicConsistency*economicConsistency +
			weights.RiskSignals*riskSignals +
			weights.MarketCoverage*marketCoverage

	components := ConfidenceComponents{
		InputQuality:        round4(inputQuality),
		DefaultDependency:   round4(defaultDependency),
		EconomicConsistency: round4(economicConsistency),
		RiskSignals:         round4(riskSignals),
		MarketCoverage:      round4(marketCoverage),
	}

	return round4(clamp01(score)), components
}

func BucketFromConfidence(confidence float64) ConfidenceBucket {
	switch {
	case confidence >= 0.75:
		return ConfidenceBucketHigh
	case confidence >= 0.55:
		return ConfidenceBucketMedium
	default:
		return ConfidenceBucketLow
	}
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func safeRatio(numerator, denominator int) float64 {
	if denominator <= 0 {
		return 0
	}
	return float64(numerator) / float64(denominator)
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}
