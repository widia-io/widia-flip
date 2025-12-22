package flipscore

import "time"

// RedFlag represents a risk flag identified by the LLM
type RedFlag struct {
	Category   string  `json:"category"` // legal, structural, moisture, condo_rules, security, noise, access, listing_inconsistency
	Severity   int     `json:"severity"` // 1-5
	Confidence float64 `json:"confidence"` // 0-1
	Evidence   string  `json:"evidence"`
}

// FlipRiskAssessment represents the LLM output for risk analysis
type FlipRiskAssessment struct {
	RehabLevel      *string   `json:"rehab_level"` // light, medium, heavy, or nil
	LLMConfidence   float64   `json:"llm_confidence"` // 0-1
	RedFlags        []RedFlag `json:"red_flags"`
	MissingCritical []string  `json:"missing_critical"`
}

// ProspectInputs contains the prospect data needed for score calculation
type ProspectInputs struct {
	AskingPrice *float64
	AreaUsable  *float64
	CondoFee    *float64
	IPTU        *float64
	Bedrooms    *int
	Parking     *int
	Elevator    *bool
	Neighborhood *string
}

// CohortStats contains statistics about the comparison cohort
type CohortStats struct {
	Scope         string  // "neighborhood" or "workspace"
	N             int     // number of prospects in cohort
	PercentileRank float64 // 0-1, where lower = cheaper = better
}

// Components holds the individual score components (0-100 each)
type Components struct {
	SPrice     float64 `json:"s_price"`
	SCarry     float64 `json:"s_carry"`
	SLiquidity float64 `json:"s_liquidity"`
	SRisk      float64 `json:"s_risk"`
	SData      float64 `json:"s_data"`
}

// Intermediate holds intermediate calculation values for debugging/display
type Intermediate struct {
	PricePerSqm *float64 `json:"price_per_sqm"`
	CarryRatio  *float64 `json:"carry_ratio"`
	CohortN     int      `json:"cohort_n"`
	CohortScope string   `json:"cohort_scope"` // "neighborhood" or "workspace"
}

// Multipliers holds the score multipliers
type Multipliers struct {
	MData float64 `json:"m_data"`
	MLLM  float64 `json:"m_llm"`
}

// Breakdown contains all components needed to explain the score
type Breakdown struct {
	Components     Components          `json:"components"`
	Intermediate   Intermediate        `json:"intermediate"`
	RiskAssessment *FlipRiskAssessment `json:"risk_assessment"`
	MissingFields  []string            `json:"missing_fields"`
	Multipliers    Multipliers         `json:"multipliers"`
	RawScore       float64             `json:"raw_score"`
}

// Result is the final output of the flip score calculation
type Result struct {
	Score       int       `json:"score"`       // 0-100
	Version     string    `json:"version"`     // "v0"
	Confidence  float64   `json:"confidence"`  // 0-1
	Breakdown   Breakdown `json:"breakdown"`
	ComputedAt  time.Time `json:"computed_at"`
}

// Version constants
const (
	VersionV0 = "v0"
	VersionV1 = "v1"
)

// Weights for v0 score components (must sum to 1.0)
const (
	WeightPrice     = 0.40
	WeightCarry     = 0.15
	WeightLiquidity = 0.20
	WeightRisk      = 0.25
)

// Weights for v1 score components (must sum to 1.0)
const (
	WeightV1Econ      = 0.60
	WeightV1Liquidity = 0.20
	WeightV1Risk      = 0.20
)

// Category weights for red flag penalty calculation
var CategoryWeights = map[string]float64{
	"legal":                 10,
	"structural":            9,
	"moisture":              8,
	"condo_rules":           6,
	"security":              6,
	"listing_inconsistency": 5,
	"noise":                 4,
	"access":                3,
}

// Rehab level penalties
var RehabPenalties = map[string]float64{
	"light":  0,
	"medium": 8,
	"heavy":  15,
}

// ============================================================================
// V1 Types (Economics-based scoring)
// ============================================================================

// ProspectInputsV1 extends ProspectInputs with investment estimate fields
type ProspectInputsV1 struct {
	ProspectInputs // Embed v0 inputs

	// V1 investment estimates
	OfferPrice             *float64 // If nil, use AskingPrice
	ExpectedSalePrice      *float64 // ARV target (required for v1)
	RenovationCostEstimate *float64
	HoldMonths             *int // Default 6 if nil
	OtherCostsEstimate     *float64
}

// EconomicsBreakdown contains ROI-based calculation outputs
type EconomicsBreakdown struct {
	ROI                float64 `json:"roi"`
	NetProfit          float64 `json:"net_profit"`
	GrossProfit        float64 `json:"gross_profit"`
	InvestmentTotal    float64 `json:"investment_total"`
	BrokerFee          float64 `json:"broker_fee"`
	PJTaxValue         float64 `json:"pj_tax_value"`
	BreakEvenSalePrice float64 `json:"break_even_sale_price"`
	Buffer             float64 `json:"buffer"` // expected_sale_price - break_even_sale_price
	IsPartial          bool    `json:"is_partial"`
}

// ComponentsV1 holds v1 score components (60/20/20 weights)
type ComponentsV1 struct {
	SEcon      float64 `json:"s_econ"`      // 60% - ROI-based
	SLiquidity float64 `json:"s_liquidity"` // 20% - same as v0
	SRisk      float64 `json:"s_risk"`      // 20% - same as v0
	SData      float64 `json:"s_data"`      // Used for multiplier
}

// BreakdownV1 contains all components to explain the v1 score
type BreakdownV1 struct {
	Components     ComponentsV1        `json:"components"`
	Economics      *EconomicsBreakdown `json:"economics"`
	Intermediate   Intermediate        `json:"intermediate"`
	RiskAssessment *FlipRiskAssessment `json:"risk_assessment"`
	MissingFields  []string            `json:"missing_fields"`
	Multipliers    Multipliers         `json:"multipliers"`
	RawScore       float64             `json:"raw_score"`
}

// ResultV1 is the final output of the v1 flip score calculation
type ResultV1 struct {
	Score      int         `json:"score"`      // 0-100
	Version    string      `json:"version"`    // "v1"
	Confidence float64     `json:"confidence"` // 0-1
	Breakdown  BreakdownV1 `json:"breakdown"`
	ComputedAt time.Time   `json:"computed_at"`
}
