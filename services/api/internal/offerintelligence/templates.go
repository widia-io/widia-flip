package offerintelligence

import (
	"fmt"
	"strings"
)

func BuildMessageTemplates(result CalculationResult) MessageTemplates {
	recommended := findScenario(result.Scenarios, ScenarioRecommended)
	if recommended == nil {
		return MessageTemplates{}
	}

	reasons := "sem bloqueios relevantes"
	if len(result.ReasonLabels) > 0 {
		reasons = strings.Join(result.ReasonLabels, "; ")
	}

	short := fmt.Sprintf(
		"Oferta sugerida: R$ %.0f | Decisão: %s | Margem: %.1f%% | Lucro: R$ %.0f",
		recommended.OfferPrice,
		result.Decision,
		recommended.Margin,
		recommended.NetProfit,
	)

	full := fmt.Sprintf(
		"Decisão: %s\n"+
			"Cenário recomendado: R$ %.0f (margem %.1f%%, lucro líquido R$ %.0f, ROI %.1f%%).\n"+
			"Agressivo: R$ %.0f | Teto: R$ %.0f.\n"+
			"Confiança: %.2f (%s).\n"+
			"Motivos: %s.",
		result.Decision,
		recommended.OfferPrice,
		recommended.Margin,
		recommended.NetProfit,
		recommended.ROI,
		valueOrZero(findScenario(result.Scenarios, ScenarioAggressive)),
		valueOrZero(findScenario(result.Scenarios, ScenarioCeiling)),
		result.Confidence,
		result.ConfidenceBucket,
		reasons,
	)

	return MessageTemplates{Short: short, Full: full}
}

func valueOrZero(s *Scenario) float64 {
	if s == nil {
		return 0
	}
	return s.OfferPrice
}

func findScenario(items []Scenario, key ScenarioKey) *Scenario {
	for i := range items {
		if items[i].Key == key {
			return &items[i]
		}
	}
	return nil
}
