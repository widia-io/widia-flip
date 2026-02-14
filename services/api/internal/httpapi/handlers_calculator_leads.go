package httpapi

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

var whatsappRegex = regexp.MustCompile(`^\d{10,13}$`)

type publicCalculatorLeadRequest struct {
	Name             string   `json:"name"`
	Email            string   `json:"email"`
	WhatsApp         string   `json:"whatsapp"`
	MarketingConsent bool     `json:"marketingConsent"`
	PurchasePrice    *float64 `json:"purchase_price"`
	RenovationCost   *float64 `json:"renovation_cost"`
	OtherCosts       *float64 `json:"other_costs"`
	SalePrice        *float64 `json:"sale_price"`
}

type publicCalculatorLeadResponse struct {
	Status  string                    `json:"status"`
	LeadID  string                    `json:"lead_id"`
	Outputs publicCashDetailedOutputs `json:"outputs"`
}

// handlePublicCalculatorLead handles POST /api/v1/public/calculator-leads
func (a *api) handlePublicCalculatorLead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req publicCalculatorLeadRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "invalid json body",
			Details: []string{err.Error()},
		})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.WhatsApp = digitsOnly(req.WhatsApp)

	if len(req.Name) < 2 || len(req.Name) > 120 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "nome inválido"})
		return
	}
	if req.Email == "" || !emailRegex.MatchString(req.Email) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "email inválido"})
		return
	}
	if !whatsappRegex.MatchString(req.WhatsApp) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "whatsapp inválido"})
		return
	}
	if !req.MarketingConsent {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "consentimento de marketing é obrigatório",
		})
		return
	}

	if req.PurchasePrice != nil && *req.PurchasePrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "purchase_price must be >= 0"})
		return
	}
	if req.RenovationCost != nil && *req.RenovationCost < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "renovation_cost must be >= 0"})
		return
	}
	if req.OtherCosts != nil && *req.OtherCosts < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "other_costs must be >= 0"})
		return
	}
	if req.SalePrice != nil && *req.SalePrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "sale_price must be >= 0"})
		return
	}

	result := viability.CalculateCash(
		viability.CashInputs{
			PurchasePrice:  req.PurchasePrice,
			RenovationCost: req.RenovationCost,
			OtherCosts:     req.OtherCosts,
			SalePrice:      req.SalePrice,
		},
		defaultPublicSettings,
	)

	ctx := r.Context()
	ip := clientIP(r)
	ua := r.Header.Get("User-Agent")

	var leadID string
	err := a.db.QueryRowContext(ctx, `
		INSERT INTO flip.calculator_leads (
			name,
			email,
			whatsapp,
			marketing_consent,
			purchase_price,
			renovation_cost,
			other_costs,
			sale_price,
			roi,
			net_profit,
			investment_total,
			is_partial,
			ip_address,
			user_agent,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
		ON CONFLICT (email)
		DO UPDATE SET
			name = EXCLUDED.name,
			whatsapp = EXCLUDED.whatsapp,
			marketing_consent = EXCLUDED.marketing_consent,
			purchase_price = EXCLUDED.purchase_price,
			renovation_cost = EXCLUDED.renovation_cost,
			other_costs = EXCLUDED.other_costs,
			sale_price = EXCLUDED.sale_price,
			roi = EXCLUDED.roi,
			net_profit = EXCLUDED.net_profit,
			investment_total = EXCLUDED.investment_total,
			is_partial = EXCLUDED.is_partial,
			ip_address = EXCLUDED.ip_address,
			user_agent = EXCLUDED.user_agent,
			updated_at = now()
		RETURNING id
	`,
		req.Name,
		req.Email,
		req.WhatsApp,
		req.MarketingConsent,
		req.PurchasePrice,
		req.RenovationCost,
		req.OtherCosts,
		req.SalePrice,
		result.ROI,
		result.NetProfit,
		result.InvestmentTotal,
		result.IsPartial,
		ip,
		ua,
	).Scan(&leadID)
	if err != nil {
		log.Printf("calculator lead: db error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to save lead"})
		return
	}

	writeJSON(w, http.StatusOK, publicCalculatorLeadResponse{
		Status: "ok",
		LeadID: leadID,
		Outputs: publicCashDetailedOutputs{
			ITBIValue:       result.ITBIValue,
			RegistryValue:   result.RegistryValue,
			AcquisitionCost: result.AcquisitionCost,
			InvestmentTotal: result.InvestmentTotal,
			BrokerFee:       result.BrokerFee,
			GrossProfit:     result.GrossProfit,
			PJTaxValue:      result.PJTaxValue,
			NetProfit:       result.NetProfit,
			ROI:             result.ROI,
			IsPartial:       result.IsPartial,
		},
	})
}

type adminCalculatorLead struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Email            string   `json:"email"`
	WhatsApp         string   `json:"whatsapp"`
	MarketingConsent bool     `json:"marketingConsent"`
	PurchasePrice    *float64 `json:"purchasePrice"`
	RenovationCost   *float64 `json:"renovationCost"`
	OtherCosts       *float64 `json:"otherCosts"`
	SalePrice        *float64 `json:"salePrice"`
	ROI              float64  `json:"roi"`
	NetProfit        float64  `json:"netProfit"`
	InvestmentTotal  float64  `json:"investmentTotal"`
	IsPartial        bool     `json:"isPartial"`
	CreatedAt        string   `json:"createdAt"`
	UpdatedAt        string   `json:"updatedAt"`
}

type listAdminCalculatorLeadsResponse struct {
	Items []adminCalculatorLead `json:"items"`
	Total int                   `json:"total"`
}

// handleAdminCalculatorLeads handles GET /api/v1/admin/calculator-leads
func (a *api) handleAdminCalculatorLeads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	rows, err := a.db.QueryContext(ctx, `
		SELECT
			id,
			name,
			email,
			whatsapp,
			marketing_consent,
			purchase_price,
			renovation_cost,
			other_costs,
			sale_price,
			roi,
			net_profit,
			investment_total,
			is_partial,
			created_at,
			updated_at
		FROM flip.calculator_leads
		ORDER BY created_at DESC
		LIMIT 200
	`)
	if err != nil {
		log.Printf("admin list calculator leads: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list calculator leads"})
		return
	}
	defer rows.Close()

	items := make([]adminCalculatorLead, 0)
	for rows.Next() {
		var lead adminCalculatorLead
		var purchasePrice sql.NullFloat64
		var renovationCost sql.NullFloat64
		var otherCosts sql.NullFloat64
		var salePrice sql.NullFloat64
		var createdAt time.Time
		var updatedAt time.Time

		if err := rows.Scan(
			&lead.ID,
			&lead.Name,
			&lead.Email,
			&lead.WhatsApp,
			&lead.MarketingConsent,
			&purchasePrice,
			&renovationCost,
			&otherCosts,
			&salePrice,
			&lead.ROI,
			&lead.NetProfit,
			&lead.InvestmentTotal,
			&lead.IsPartial,
			&createdAt,
			&updatedAt,
		); err != nil {
			log.Printf("admin list calculator leads: scan error: %v", err)
			continue
		}

		lead.PurchasePrice = nullFloatToPtr(purchasePrice)
		lead.RenovationCost = nullFloatToPtr(renovationCost)
		lead.OtherCosts = nullFloatToPtr(otherCosts)
		lead.SalePrice = nullFloatToPtr(salePrice)
		lead.CreatedAt = createdAt.Format(time.RFC3339)
		lead.UpdatedAt = updatedAt.Format(time.RFC3339)

		items = append(items, lead)
	}

	var total int
	if err := a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM flip.calculator_leads`).Scan(&total); err != nil {
		log.Printf("admin list calculator leads: count error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count calculator leads"})
		return
	}

	writeJSON(w, http.StatusOK, listAdminCalculatorLeadsResponse{Items: items, Total: total})
}

func digitsOnly(value string) string {
	var b strings.Builder
	b.Grow(len(value))
	for _, r := range value {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		if idx := strings.Index(forwarded, ","); idx >= 0 {
			return strings.TrimSpace(forwarded[:idx])
		}
		return forwarded
	}
	return r.RemoteAddr
}

func nullFloatToPtr(value sql.NullFloat64) *float64 {
	if !value.Valid {
		return nil
	}
	v := value.Float64
	return &v
}
