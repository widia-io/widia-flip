package offerintelligence

import (
	"math"
	"sort"
	"strings"

	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

func Calculate(inputs ProspectInputs, settings WorkspaceSettings) (CalculationResult, error) {
	missing := missingCriticalInputs(inputs)
	if len(missing) > 0 {
		return CalculationResult{}, MissingCriticalInputsError{Fields: missing}
	}

	weights := settings.ConfidenceWeights
	if math.Abs(weights.Sum()-1.0) > 0.0001 {
		weights = DefaultWeights()
	}

	defaultsUsed := make([]string, 0)
	assumptions := make([]string, 0)

	holdMonths := 6
	if inputs.HoldMonths != nil && *inputs.HoldMonths > 0 {
		holdMonths = *inputs.HoldMonths
	} else {
		defaultsUsed = append(defaultsUsed, "Prazo da operação (meses)")
		assumptions = append(assumptions, "Prazo da operação assumido em 6 meses (padrão)")
	}

	otherCostsEstimate := float64(0)
	if inputs.OtherCostsEstimate != nil {
		otherCostsEstimate = *inputs.OtherCostsEstimate
	} else {
		defaultsUsed = append(defaultsUsed, "Outros custos estimados")
		assumptions = append(assumptions, "Outros custos assumidos em R$ 0,00 (padrão)")
	}

	condoFee := float64(0)
	if inputs.CondoFee != nil {
		condoFee = *inputs.CondoFee
	} else {
		defaultsUsed = append(defaultsUsed, "Condomínio mensal")
	}

	iptu := float64(0)
	if inputs.IPTU != nil {
		iptu = *inputs.IPTU
	} else {
		defaultsUsed = append(defaultsUsed, "IPTU anual")
	}

	asking := *inputs.AskingPrice
	expectedSale := *inputs.ExpectedSalePrice
	renovation := *inputs.RenovationCostEstimate

	carryCost := (condoFee + (iptu / 12.0)) * float64(holdMonths)
	combinedOtherCosts := otherCostsEstimate + carryCost
	if carryCost > 0 {
		assumptions = append(assumptions, "Custos de carregamento (condomínio + IPTU proporcional) incluídos na análise")
	}

	ceilingOffer := calculateCeilingOffer(asking, expectedSale, renovation, combinedOtherCosts, settings)
	aggressiveOffer, recommendedOffer := calculateOffers(asking, ceilingOffer)

	scenarioAggressive := calculateScenario(ScenarioAggressive, aggressiveOffer, expectedSale, renovation, combinedOtherCosts, settings.CashSettings)
	scenarioRecommended := calculateScenario(ScenarioRecommended, recommendedOffer, expectedSale, renovation, combinedOtherCosts, settings.CashSettings)
	scenarioCeiling := calculateScenario(ScenarioCeiling, ceilingOffer, expectedSale, renovation, combinedOtherCosts, settings.CashSettings)

	renovationToAskRatio := 0.0
	if asking > 0 {
		renovationToAskRatio = renovation / asking
	}
	riskScore := calculateRiskScore(inputs, renovationToAskRatio, holdMonths)

	optimisticSale := settings.MaxSaleToAskRatio > 0 && expectedSale > (asking*settings.MaxSaleToAskRatio)
	if optimisticSale {
		assumptions = append(assumptions, "Preço de venda esperado acima do limite configurado para validação")
	}

	confidence, confidenceBreakdown := CalculateConfidence(ConfidenceInput{
		CriticalPresent:      countCriticalPresent(inputs),
		CriticalTotal:        7,
		DefaultsCount:        countDefaultsUsed(inputs),
		DefaultsTotal:        4,
		OptimisticSalePrice:  optimisticSale,
		RenovationToAskRatio: renovationToAskRatio,
		RiskScore:            riskScore,
		HasNeighborhood:      inputs.Neighborhood != nil && strings.TrimSpace(*inputs.Neighborhood) != "",
		HasArea:              inputs.AreaUsable != nil && *inputs.AreaUsable > 0,
	}, weights)

	confidenceBucket := BucketFromConfidence(confidence)
	if optimisticSale && confidenceBucket == ConfidenceBucketHigh {
		confidenceBucket = ConfidenceBucketMedium
	}

	reasonSet := make(map[ReasonCode]struct{})
	if optimisticSale {
		reasonSet[ReasonOptimisticSalePriceEstimate] = struct{}{}
	}
	if scenarioRecommended.Margin < settings.MinMarginPct {
		reasonSet[ReasonLowMargin] = struct{}{}
	}
	if scenarioRecommended.NetProfit < settings.MinNetProfitBRL {
		reasonSet[ReasonLowNetProfit] = struct{}{}
	}
	if confidence < settings.MinConfidence {
		reasonSet[ReasonLowDataConfidence] = struct{}{}
	}
	if riskScore > settings.MaxRiskScore {
		reasonSet[ReasonHighRenovationRisk] = struct{}{}
	}
	if scenarioRecommended.BreakEvenSalePrice >= expectedSale {
		reasonSet[ReasonUnfavorableBreakEven] = struct{}{}
	}
	if inputs.Neighborhood == nil || strings.TrimSpace(*inputs.Neighborhood) == "" {
		reasonSet[ReasonMarketSampleTooLow] = struct{}{}
	}

	decision := DecisionReview
	if scenarioCeiling.Margin < settings.MinMarginPct || scenarioCeiling.NetProfit < settings.MinNetProfitBRL || riskScore > settings.MaxRiskScore {
		decision = DecisionNoGo
	} else if scenarioRecommended.Margin >= settings.MinMarginPct &&
		scenarioRecommended.NetProfit >= settings.MinNetProfitBRL &&
		confidence >= settings.MinConfidence &&
		riskScore <= settings.MaxRiskScore {
		decision = DecisionGO
	}
	if decision == DecisionReview && len(reasonSet) == 0 {
		reasonSet[ReasonLowDataConfidence] = struct{}{}
	}

	reasonCodes := orderedReasonCodes(reasonSet)
	reasonLabels := make([]string, 0, len(reasonCodes))
	for _, code := range reasonCodes {
		if label, ok := ReasonLabelByCode[code]; ok {
			reasonLabels = append(reasonLabels, label)
		}
	}

	inputHash, err := HashInputSnapshot(InputSnapshot{
		AskingPrice:            inputs.AskingPrice,
		AreaUsable:             inputs.AreaUsable,
		ExpectedSalePrice:      inputs.ExpectedSalePrice,
		RenovationCostEstimate: inputs.RenovationCostEstimate,
		HoldMonths:             holdMonths,
		OtherCostsEstimate:     otherCostsEstimate,
		CondoFee:               condoFee,
		IPTU:                   iptu,
		OfferPrice:             inputs.OfferPrice,
		Neighborhood:           inputs.Neighborhood,
		FlipScore:              inputs.FlipScore,
	})
	if err != nil {
		return CalculationResult{}, err
	}

	settingsHash, err := HashSettingsSnapshot(SettingsSnapshot{
		FormulaVersion:          FormulaVersion,
		ITBIRate:                settings.CashSettings.ITBIRate,
		RegistryRate:            settings.CashSettings.RegistryRate,
		BrokerRate:              settings.CashSettings.BrokerRate,
		PJTaxRate:               settings.CashSettings.PJTaxRate,
		MinMarginPct:            settings.MinMarginPct,
		MinNetProfitBRL:         settings.MinNetProfitBRL,
		MinConfidence:           settings.MinConfidence,
		MaxRiskScore:            settings.MaxRiskScore,
		MaxSaleToAskRatio:       settings.MaxSaleToAskRatio,
		GenerateRateLimitPerMin: settings.GenerateRateLimitPerMin,
		ConfidenceWeights:       weights.ToMap(),
	})
	if err != nil {
		return CalculationResult{}, err
	}

	result := CalculationResult{
		FormulaVersion:      FormulaVersion,
		Decision:            decision,
		Confidence:          confidence,
		ConfidenceBucket:    confidenceBucket,
		ReasonCodes:         reasonCodes,
		ReasonLabels:        reasonLabels,
		RiskScore:           riskScore,
		Assumptions:         dedupeStrings(assumptions),
		DefaultsUsed:        dedupeStrings(defaultsUsed),
		Scenarios:           []Scenario{scenarioAggressive, scenarioRecommended, scenarioCeiling},
		InputHash:           inputHash,
		SettingsHash:        settingsHash,
		ConfidenceBreakdown: confidenceBreakdown,
	}
	result.MessageTemplates = BuildMessageTemplates(result)
	return result, nil
}

func missingCriticalInputs(inputs ProspectInputs) []string {
	missing := make([]string, 0, 4)
	if inputs.AskingPrice == nil || *inputs.AskingPrice <= 0 {
		missing = append(missing, "asking_price")
	}
	if inputs.AreaUsable == nil || *inputs.AreaUsable <= 0 {
		missing = append(missing, "area_usable")
	}
	if inputs.ExpectedSalePrice == nil || *inputs.ExpectedSalePrice <= 0 {
		missing = append(missing, "expected_sale_price")
	}
	if inputs.RenovationCostEstimate == nil || *inputs.RenovationCostEstimate < 0 {
		missing = append(missing, "renovation_cost_estimate")
	}
	return missing
}

func calculateCeilingOffer(asking, salePrice, renovation, otherCosts float64, settings WorkspaceSettings) float64 {
	if asking <= 0 {
		return 0
	}

	acquisitionFactor := 1.0 + settings.CashSettings.ITBIRate + settings.CashSettings.RegistryRate
	if acquisitionFactor <= 0 {
		return round2(asking)
	}

	profitFactor := 1.0 - settings.CashSettings.PJTaxRate
	if profitFactor <= 0 {
		profitFactor = 0.01
	}

	fixedCosts := renovation + otherCosts
	maxByProfit := (salePrice*(1.0-settings.CashSettings.BrokerRate) - fixedCosts - (settings.MinNetProfitBRL / profitFactor)) / acquisitionFactor
	maxByMargin := (salePrice*(1.0-settings.CashSettings.BrokerRate) - fixedCosts - ((salePrice * settings.MinMarginPct / 100.0) / profitFactor)) / acquisitionFactor

	ceiling := minFloat(asking, maxByProfit, maxByMargin)
	if math.IsNaN(ceiling) || math.IsInf(ceiling, 0) {
		ceiling = asking
	}
	if ceiling < 0 {
		ceiling = 0
	}
	return round2(ceiling)
}

func calculateOffers(asking, ceiling float64) (float64, float64) {
	if ceiling <= 0 {
		return 0, 0
	}

	recommended := minFloat(asking*0.93, ceiling*0.95)
	aggressive := minFloat(asking*0.88, recommended*0.95)

	if recommended <= 0 {
		recommended = ceiling * 0.90
	}
	if aggressive <= 0 {
		aggressive = recommended * 0.90
	}

	if recommended > ceiling {
		recommended = ceiling
	}
	if aggressive > recommended {
		aggressive = recommended
	}
	if aggressive < 0 {
		aggressive = 0
	}

	return round2(aggressive), round2(recommended)
}

func calculateScenario(key ScenarioKey, offerPrice, salePrice, renovation, otherCosts float64, cashSettings viability.CashSettings) Scenario {
	purchase := offerPrice
	renovationCost := renovation
	otherCostsValue := otherCosts
	sale := salePrice

	outputs := viability.CalculateCash(viability.CashInputs{
		PurchasePrice:  &purchase,
		RenovationCost: &renovationCost,
		OtherCosts:     &otherCostsValue,
		SalePrice:      &sale,
	}, cashSettings)

	margin := float64(0)
	if salePrice > 0 {
		margin = (outputs.NetProfit / salePrice) * 100.0
	}

	return Scenario{
		Key:                key,
		OfferPrice:         round2(offerPrice),
		NetProfit:          round2(outputs.NetProfit),
		ROI:                round2(outputs.ROI),
		Margin:             round2(margin),
		BreakEvenSalePrice: calculateBreakEven(outputs.InvestmentTotal, cashSettings.BrokerRate, cashSettings.PJTaxRate),
	}
}

func calculateBreakEven(investmentTotal, brokerRate, taxRate float64) float64 {
	if investmentTotal <= 0 {
		return 0
	}
	denominator := 1.0 - brokerRate - taxRate
	if denominator <= 0 {
		return 0
	}
	return round2(investmentTotal / denominator)
}

func calculateRiskScore(inputs ProspectInputs, renovationToAskRatio float64, holdMonths int) float64 {
	risk := 50.0
	if inputs.FlipScore != nil {
		risk = 100.0 - float64(*inputs.FlipScore)
	}

	switch {
	case renovationToAskRatio > 0.40:
		risk += 20
	case renovationToAskRatio > 0.25:
		risk += 10
	}

	switch {
	case holdMonths > 12:
		risk += 10
	case holdMonths > 6:
		risk += 5
	}

	if risk < 0 {
		risk = 0
	}
	if risk > 100 {
		risk = 100
	}

	return round2(risk)
}

func countCriticalPresent(inputs ProspectInputs) int {
	count := 0
	if inputs.AskingPrice != nil && *inputs.AskingPrice > 0 {
		count++
	}
	if inputs.AreaUsable != nil && *inputs.AreaUsable > 0 {
		count++
	}
	if inputs.ExpectedSalePrice != nil && *inputs.ExpectedSalePrice > 0 {
		count++
	}
	if inputs.RenovationCostEstimate != nil && *inputs.RenovationCostEstimate >= 0 {
		count++
	}
	if inputs.CondoFee != nil {
		count++
	}
	if inputs.IPTU != nil {
		count++
	}
	if inputs.HoldMonths != nil && *inputs.HoldMonths > 0 {
		count++
	}
	return count
}

func countDefaultsUsed(inputs ProspectInputs) int {
	count := 0
	if inputs.HoldMonths == nil || *inputs.HoldMonths <= 0 {
		count++
	}
	if inputs.OtherCostsEstimate == nil {
		count++
	}
	if inputs.CondoFee == nil {
		count++
	}
	if inputs.IPTU == nil {
		count++
	}
	return count
}

func orderedReasonCodes(reasonSet map[ReasonCode]struct{}) []ReasonCode {
	items := make([]ReasonCode, 0, len(reasonSet))
	for _, code := range ReasonCodeOrder {
		if _, ok := reasonSet[code]; ok {
			items = append(items, code)
		}
	}

	if len(items) == len(reasonSet) {
		return items
	}

	remaining := make([]string, 0)
	for code := range reasonSet {
		found := false
		for _, existing := range items {
			if existing == code {
				found = true
				break
			}
		}
		if !found {
			remaining = append(remaining, string(code))
		}
	}
	sort.Strings(remaining)
	for _, code := range remaining {
		items = append(items, ReasonCode(code))
	}

	return items
}

func dedupeStrings(items []string) []string {
	if len(items) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(items))
	out := make([]string, 0, len(items))
	for _, item := range items {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func minFloat(v float64, values ...float64) float64 {
	min := v
	for _, candidate := range values {
		if candidate < min {
			min = candidate
		}
	}
	return min
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
