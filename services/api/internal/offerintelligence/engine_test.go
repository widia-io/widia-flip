package offerintelligence

import (
	"testing"

	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

func TestCalculateDecisionGO(t *testing.T) {
	asking := 300000.0
	area := 80.0
	expectedSale := 460000.0
	renovation := 40000.0
	holdMonths := 6
	neighborhood := "Moema"
	flipScore := 78

	result, err := Calculate(ProspectInputs{
		ID:                     "p1",
		WorkspaceID:            "w1",
		AskingPrice:            &asking,
		AreaUsable:             &area,
		ExpectedSalePrice:      &expectedSale,
		RenovationCostEstimate: &renovation,
		HoldMonths:             &holdMonths,
		Neighborhood:           &neighborhood,
		FlipScore:              &flipScore,
	}, testSettings())
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}

	if result.Decision != DecisionGO {
		t.Fatalf("decision=%s want=%s", result.Decision, DecisionGO)
	}
	if len(result.Scenarios) != 3 {
		t.Fatalf("scenarios=%d want=3", len(result.Scenarios))
	}
}

func TestCalculateDecisionReview(t *testing.T) {
	asking := 320000.0
	area := 65.0
	expectedSale := 420000.0
	renovation := 90000.0

	settings := testSettings()
	settings.MinConfidence = 0.80

	result, err := Calculate(ProspectInputs{
		ID:                     "p2",
		WorkspaceID:            "w1",
		AskingPrice:            &asking,
		AreaUsable:             &area,
		ExpectedSalePrice:      &expectedSale,
		RenovationCostEstimate: &renovation,
		// hold_months, condo_fee, iptu and neighborhood omitted on purpose
	}, settings)
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}

	if result.Decision != DecisionReview {
		t.Fatalf("decision=%s want=%s", result.Decision, DecisionReview)
	}
	if !hasReason(result.ReasonCodes, ReasonLowDataConfidence) {
		t.Fatalf("expected reason code %s", ReasonLowDataConfidence)
	}
}

func TestCalculateDecisionNoGo(t *testing.T) {
	asking := 500000.0
	area := 90.0
	expectedSale := 620000.0
	renovation := 180000.0
	holdMonths := 8

	settings := testSettings()
	settings.MinMarginPct = 35
	settings.MinNetProfitBRL = 180000
	settings.MaxRiskScore = 40

	result, err := Calculate(ProspectInputs{
		ID:                     "p3",
		WorkspaceID:            "w1",
		AskingPrice:            &asking,
		AreaUsable:             &area,
		ExpectedSalePrice:      &expectedSale,
		RenovationCostEstimate: &renovation,
		HoldMonths:             &holdMonths,
	}, settings)
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}

	if result.Decision != DecisionNoGo {
		t.Fatalf("decision=%s want=%s", result.Decision, DecisionNoGo)
	}
}

func TestCalculateOptimisticSalePriceFlag(t *testing.T) {
	asking := 300000.0
	area := 70.0
	expectedSale := 520000.0 // > 1.5x ask
	renovation := 35000.0
	holdMonths := 6

	settings := testSettings()
	settings.MaxSaleToAskRatio = 1.5

	result, err := Calculate(ProspectInputs{
		ID:                     "p4",
		WorkspaceID:            "w1",
		AskingPrice:            &asking,
		AreaUsable:             &area,
		ExpectedSalePrice:      &expectedSale,
		RenovationCostEstimate: &renovation,
		HoldMonths:             &holdMonths,
	}, settings)
	if err != nil {
		t.Fatalf("Calculate returned error: %v", err)
	}

	if !hasReason(result.ReasonCodes, ReasonOptimisticSalePriceEstimate) {
		t.Fatalf("expected reason code %s", ReasonOptimisticSalePriceEstimate)
	}
	if result.ConfidenceBucket == ConfidenceBucketHigh {
		t.Fatalf("confidence_bucket=%s want not high", result.ConfidenceBucket)
	}
}

func hasReason(items []ReasonCode, target ReasonCode) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

func testSettings() WorkspaceSettings {
	return WorkspaceSettings{
		CashSettings: viability.CashSettings{
			ITBIRate:     0.03,
			RegistryRate: 0.01,
			BrokerRate:   0.06,
			PJTaxRate:    0.15,
		},
		MinMarginPct:            10,
		MinNetProfitBRL:         20000,
		MinConfidence:           0.55,
		MaxRiskScore:            65,
		MaxSaleToAskRatio:       1.5,
		GenerateRateLimitPerMin: 10,
		ConfidenceWeights:       DefaultWeights(),
	}
}
