package offerintelligence

import (
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

const FormulaVersion = "offer-intelligence-v1"

type Decision string

const (
	DecisionGO     Decision = "GO"
	DecisionReview Decision = "REVIEW"
	DecisionNoGo   Decision = "NO_GO"
)

type ConfidenceBucket string

const (
	ConfidenceBucketHigh   ConfidenceBucket = "high"
	ConfidenceBucketMedium ConfidenceBucket = "medium"
	ConfidenceBucketLow    ConfidenceBucket = "low"
)

type ReasonCode string

const (
	ReasonLowMargin                   ReasonCode = "LOW_MARGIN"
	ReasonLowNetProfit                ReasonCode = "LOW_NET_PROFIT"
	ReasonLowDataConfidence           ReasonCode = "LOW_DATA_CONFIDENCE"
	ReasonMissingCriticalInput        ReasonCode = "MISSING_CRITICAL_INPUT"
	ReasonHighRenovationRisk          ReasonCode = "HIGH_RENOVATION_RISK"
	ReasonMarketSampleTooLow          ReasonCode = "MARKET_SAMPLE_TOO_LOW"
	ReasonUnfavorableBreakEven        ReasonCode = "UNFAVORABLE_BREAK_EVEN"
	ReasonOptimisticSalePriceEstimate ReasonCode = "OPTIMISTIC_SALE_PRICE_ESTIMATE"
)

var ReasonLabelByCode = map[ReasonCode]string{
	ReasonLowMargin:                   "Margem abaixo do mínimo configurado",
	ReasonLowNetProfit:                "Lucro líquido abaixo do mínimo configurado",
	ReasonLowDataConfidence:           "Baixa confiança por dados incompletos/inconsistentes",
	ReasonMissingCriticalInput:        "Faltam campos críticos para recomendação confiável",
	ReasonHighRenovationRisk:          "Risco elevado de reforma/carry",
	ReasonMarketSampleTooLow:          "Cobertura de mercado limitada para este prospect",
	ReasonUnfavorableBreakEven:        "Break-even desfavorável para o preço de venda informado",
	ReasonOptimisticSalePriceEstimate: "Preço de venda esperado parece otimista para o ticket",
}

var ReasonCodeOrder = []ReasonCode{
	ReasonMissingCriticalInput,
	ReasonOptimisticSalePriceEstimate,
	ReasonLowMargin,
	ReasonLowNetProfit,
	ReasonLowDataConfidence,
	ReasonHighRenovationRisk,
	ReasonMarketSampleTooLow,
	ReasonUnfavorableBreakEven,
}

type ScenarioKey string

const (
	ScenarioAggressive  ScenarioKey = "aggressive"
	ScenarioRecommended ScenarioKey = "recommended"
	ScenarioCeiling     ScenarioKey = "ceiling"
)

type MessageLevel string

const (
	MessageLevelShort MessageLevel = "short"
	MessageLevelFull  MessageLevel = "full"
)

type StaleReason string

const (
	StaleReasonInputChanged    StaleReason = "INPUT_CHANGED"
	StaleReasonSettingsChanged StaleReason = "SETTINGS_CHANGED"
	StaleReasonFormulaChanged  StaleReason = "FORMULA_CHANGED"
)

type ConfidenceWeights struct {
	InputQuality        float64 `json:"input_quality"`
	DefaultDependency   float64 `json:"default_dependency"`
	EconomicConsistency float64 `json:"economic_consistency"`
	RiskSignals         float64 `json:"risk_signals"`
	MarketCoverage      float64 `json:"market_coverage"`
}

func DefaultWeights() ConfidenceWeights {
	return ConfidenceWeights{
		InputQuality:        0.30,
		DefaultDependency:   0.25,
		EconomicConsistency: 0.20,
		RiskSignals:         0.15,
		MarketCoverage:      0.10,
	}
}

func (w ConfidenceWeights) Sum() float64 {
	return w.InputQuality + w.DefaultDependency + w.EconomicConsistency + w.RiskSignals + w.MarketCoverage
}

func (w ConfidenceWeights) ToMap() map[string]float64 {
	return map[string]float64{
		"input_quality":        w.InputQuality,
		"default_dependency":   w.DefaultDependency,
		"economic_consistency": w.EconomicConsistency,
		"risk_signals":         w.RiskSignals,
		"market_coverage":      w.MarketCoverage,
	}
}

type WorkspaceSettings struct {
	CashSettings             viability.CashSettings
	MinMarginPct             float64
	MinNetProfitBRL          float64
	MinConfidence            float64
	MaxRiskScore             float64
	MaxSaleToAskRatio        float64
	GenerateRateLimitPerMin  int
	ConfidenceWeights        ConfidenceWeights
	FirstFullPreviewConsumed *time.Time
	FirstFullPreviewUserID   *string
}

type ProspectInputs struct {
	ID                     string
	WorkspaceID            string
	AskingPrice            *float64
	AreaUsable             *float64
	ExpectedSalePrice      *float64
	RenovationCostEstimate *float64
	HoldMonths             *int
	OtherCostsEstimate     *float64
	CondoFee               *float64
	IPTU                   *float64
	OfferPrice             *float64
	Neighborhood           *string
	FlipScore              *int
}

type Scenario struct {
	Key                ScenarioKey `json:"key"`
	OfferPrice         float64     `json:"offer_price"`
	NetProfit          float64     `json:"net_profit"`
	ROI                float64     `json:"roi"`
	Margin             float64     `json:"margin"`
	BreakEvenSalePrice float64     `json:"break_even_sale_price"`
}

type MessageTemplates struct {
	Short string `json:"short"`
	Full  string `json:"full"`
}

type ConfidenceComponents struct {
	InputQuality        float64 `json:"input_quality"`
	DefaultDependency   float64 `json:"default_dependency"`
	EconomicConsistency float64 `json:"economic_consistency"`
	RiskSignals         float64 `json:"risk_signals"`
	MarketCoverage      float64 `json:"market_coverage"`
}

type CalculationResult struct {
	FormulaVersion      string               `json:"formula_version"`
	Decision            Decision             `json:"decision"`
	Confidence          float64              `json:"confidence"`
	ConfidenceBucket    ConfidenceBucket     `json:"confidence_bucket"`
	ReasonCodes         []ReasonCode         `json:"reason_codes"`
	ReasonLabels        []string             `json:"reason_labels"`
	RiskScore           float64              `json:"risk_score"`
	Assumptions         []string             `json:"assumptions"`
	DefaultsUsed        []string             `json:"defaults_used"`
	Scenarios           []Scenario           `json:"scenarios"`
	MessageTemplates    MessageTemplates     `json:"message_templates"`
	InputHash           string               `json:"input_hash"`
	SettingsHash        string               `json:"settings_hash"`
	ConfidenceBreakdown ConfidenceComponents `json:"confidence_breakdown"`
}

type InputSnapshot struct {
	AskingPrice            *float64 `json:"asking_price"`
	AreaUsable             *float64 `json:"area_usable"`
	ExpectedSalePrice      *float64 `json:"expected_sale_price"`
	RenovationCostEstimate *float64 `json:"renovation_cost_estimate"`
	HoldMonths             int      `json:"hold_months"`
	OtherCostsEstimate     float64  `json:"other_costs_estimate"`
	CondoFee               float64  `json:"condo_fee"`
	IPTU                   float64  `json:"iptu"`
	OfferPrice             *float64 `json:"offer_price"`
	Neighborhood           *string  `json:"neighborhood"`
	FlipScore              *int     `json:"flip_score"`
}

type SettingsSnapshot struct {
	FormulaVersion          string             `json:"formula_version"`
	ITBIRate                float64            `json:"itbi_rate"`
	RegistryRate            float64            `json:"registry_rate"`
	BrokerRate              float64            `json:"broker_rate"`
	PJTaxRate               float64            `json:"pj_tax_rate"`
	MinMarginPct            float64            `json:"offer_min_margin_pct"`
	MinNetProfitBRL         float64            `json:"offer_min_net_profit_brl"`
	MinConfidence           float64            `json:"offer_min_confidence"`
	MaxRiskScore            float64            `json:"offer_max_risk_score"`
	MaxSaleToAskRatio       float64            `json:"offer_max_sale_to_ask_ratio"`
	GenerateRateLimitPerMin int                `json:"offer_generate_rate_limit_per_min"`
	ConfidenceWeights       map[string]float64 `json:"offer_confidence_weights_json"`
}

type MissingCriticalInputsError struct {
	Fields []string
}

func (e MissingCriticalInputsError) Error() string {
	return "missing critical inputs"
}
