package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

// Timeline event type for financing
const (
	EventTypeAnalysisFinancingSaved = "analysis_financing_saved"
)

type financingInputs struct {
	PurchasePrice      *float64 `json:"purchase_price"`
	SalePrice          *float64 `json:"sale_price"`
	DownPaymentPercent *float64 `json:"down_payment_percent"`
	DownPaymentValue   *float64 `json:"down_payment_value"`
	FinancedValue      *float64 `json:"financed_value"`
	TermMonths         *int     `json:"term_months"`
	CET                *float64 `json:"cet"`
	InterestRate       *float64 `json:"interest_rate"`
	Insurance          *float64 `json:"insurance"`
	AppraisalFee       *float64 `json:"appraisal_fee"`
	OtherFees          *float64 `json:"other_fees"`
	RemainingDebt      *float64 `json:"remaining_debt"`
}

type financingOutputs struct {
	DownPaymentValue     float64 `json:"down_payment_value"`
	FinancedValue        float64 `json:"financed_value"`
	PaymentsTotal        float64 `json:"payments_total"`
	BankFeesTotal        float64 `json:"bank_fees_total"`
	ITBIValue            float64 `json:"itbi_value"`
	RegistryValue        float64 `json:"registry_value"`
	AcquisitionFees      float64 `json:"acquisition_fees"`
	TotalPaid            float64 `json:"total_paid"`
	InvestmentTotal      float64 `json:"investment_total"`
	BrokerFee            float64 `json:"broker_fee"`
	GrossProfit          float64 `json:"gross_profit"`
	PJTaxValue           float64 `json:"pj_tax_value"`
	NetProfit            float64 `json:"net_profit"`
	ROI                  float64 `json:"roi"`
	InterestPaidEstimate float64 `json:"interest_paid_estimate"`
	IsPartial            bool    `json:"is_partial"`
}

type financingPayment struct {
	ID         string    `json:"id"`
	MonthIndex int       `json:"month_index"`
	Amount     float64   `json:"amount"`
	CreatedAt  time.Time `json:"created_at"`
}

type financingAnalysisResponse struct {
	PlanID         string             `json:"plan_id"`
	Inputs         financingInputs    `json:"inputs"`
	Payments       []financingPayment `json:"payments"`
	Outputs        financingOutputs   `json:"outputs"`
	EffectiveRates effectiveRates     `json:"effective_rates"`
}

type financingSnapshot struct {
	ID             string          `json:"id"`
	InputsJSON     json.RawMessage `json:"inputs"`
	PaymentsJSON   json.RawMessage `json:"payments"`
	OutputsJSON    json.RawMessage `json:"outputs"`
	EffectiveRates json.RawMessage `json:"effective_rates,omitempty"`
	StatusPipeline *string         `json:"status_pipeline,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type listFinancingSnapshotsResponse struct {
	Items []financingSnapshot `json:"items"`
}

type listPaymentsResponse struct {
	Items []financingPayment `json:"items"`
	Total float64            `json:"total"`
}

type createPaymentRequest struct {
	MonthIndex int     `json:"month_index"`
	Amount     float64 `json:"amount"`
}

// handleFinancingSubroutes routes /api/v1/financing/:planId/...
func (a *api) handleFinancingSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/financing/")
	parts := strings.Split(rest, "/")

	planID := strings.TrimSpace(parts[0])
	if planID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// /api/v1/financing/:planId/payments
	if len(parts) == 2 && parts[1] == "payments" {
		switch r.Method {
		case http.MethodGet:
			a.handleListFinancingPayments(w, r, planID)
		case http.MethodPost:
			a.handleCreateFinancingPayment(w, r, planID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/financing/:planId/payments/:paymentId
	if len(parts) == 3 && parts[1] == "payments" {
		paymentID := strings.TrimSpace(parts[2])
		if paymentID == "" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.Method == http.MethodDelete {
			a.handleDeleteFinancingPayment(w, r, planID, paymentID)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

// handlePropertyFinancing routes /api/v1/properties/:id/financing
func (a *api) handlePropertyFinancing(w http.ResponseWriter, r *http.Request, propertyID string, subparts []string) {
	// /api/v1/properties/:id/financing
	if len(subparts) == 0 {
		switch r.Method {
		case http.MethodGet:
			a.handleGetFinancing(w, r, propertyID)
		case http.MethodPut:
			a.handleUpdateFinancing(w, r, propertyID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

// handlePropertyFinancingAnalysis routes /api/v1/properties/:id/analysis/financing/...
func (a *api) handlePropertyFinancingAnalysis(w http.ResponseWriter, r *http.Request, propertyID string, subparts []string) {
	// /api/v1/properties/:id/analysis/financing/snapshot
	if len(subparts) == 1 && subparts[0] == "snapshot" {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleCreateFinancingSnapshot(w, r, propertyID)
		return
	}

	// /api/v1/properties/:id/analysis/financing/snapshots
	if len(subparts) == 1 && subparts[0] == "snapshots" {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleListFinancingSnapshots(w, r, propertyID)
		return
	}

	// /api/v1/properties/:id/analysis/financing/snapshots/:snapshotId
	if len(subparts) == 2 && subparts[0] == "snapshots" {
		snapshotID := subparts[1]
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleDeleteFinancingSnapshot(w, r, propertyID, snapshotID)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleGetFinancing(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access and get workspace_id
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// Get effective settings (property-level overrides + workspace fallback)
	settings, err := a.getEffectiveFinancingSettings(r.Context(), propertyID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	// Get financing plan
	var planID string
	var inputs financingInputs
	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT id, purchase_price, sale_price, down_payment_percent, down_payment_value, financed_value,
		        term_months, cet, interest_rate, insurance, appraisal_fee, other_fees, remaining_debt
		 FROM financing_plans
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&planID, &inputs.PurchasePrice, &inputs.SalePrice, &inputs.DownPaymentPercent,
		&inputs.DownPaymentValue, &inputs.FinancedValue, &inputs.TermMonths,
		&inputs.CET, &inputs.InterestRate, &inputs.Insurance, &inputs.AppraisalFee,
		&inputs.OtherFees, &inputs.RemainingDebt)
	if err != nil {
		if err == sql.ErrNoRows {
			// Return empty response with partial outputs
			writeJSON(w, http.StatusOK, financingAnalysisResponse{
				Inputs:         inputs,
				Payments:       []financingPayment{},
				Outputs:        financingOutputs{IsPartial: true},
				EffectiveRates: financingSettingsToRates(settings),
			})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch financing"})
		return
	}

	// Get payments
	payments, err := a.getFinancingPayments(r.Context(), planID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch payments"})
		return
	}

	// Calculate outputs
	outputs := a.calculateFinancingOutputs(inputs, payments, settings)

	writeJSON(w, http.StatusOK, financingAnalysisResponse{
		PlanID:         planID,
		Inputs:         inputs,
		Payments:       payments,
		Outputs:        outputs,
		EffectiveRates: financingSettingsToRates(settings),
	})
}

func (a *api) handleUpdateFinancing(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req financingInputs
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate inputs
	if req.PurchasePrice != nil && *req.PurchasePrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "purchase_price must be >= 0"})
		return
	}
	if req.SalePrice != nil && *req.SalePrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "sale_price must be >= 0"})
		return
	}
	if req.DownPaymentPercent != nil && (*req.DownPaymentPercent < 0 || *req.DownPaymentPercent > 1) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "down_payment_percent must be between 0 and 1"})
		return
	}
	if req.TermMonths != nil && *req.TermMonths < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "term_months must be >= 0"})
		return
	}
	if req.CET != nil && *req.CET < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "cet must be >= 0"})
		return
	}
	if req.InterestRate != nil && *req.InterestRate < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "interest_rate must be >= 0"})
		return
	}
	if req.Insurance != nil && *req.Insurance < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "insurance must be >= 0"})
		return
	}
	if req.AppraisalFee != nil && *req.AppraisalFee < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "appraisal_fee must be >= 0"})
		return
	}
	if req.OtherFees != nil && *req.OtherFees < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "other_fees must be >= 0"})
		return
	}
	if req.RemainingDebt != nil && *req.RemainingDebt < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "remaining_debt must be >= 0"})
		return
	}

	// Check access and get workspace_id
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// Upsert financing plan
	var planID string
	var inputs financingInputs
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO financing_plans (property_id, workspace_id, purchase_price, sale_price, down_payment_percent,
		                              down_payment_value, financed_value, term_months, cet, interest_rate,
		                              insurance, appraisal_fee, other_fees, remaining_debt)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		 ON CONFLICT (property_id)
		 DO UPDATE SET
		   purchase_price = COALESCE($3, financing_plans.purchase_price),
		   sale_price = COALESCE($4, financing_plans.sale_price),
		   down_payment_percent = COALESCE($5, financing_plans.down_payment_percent),
		   down_payment_value = COALESCE($6, financing_plans.down_payment_value),
		   financed_value = COALESCE($7, financing_plans.financed_value),
		   term_months = COALESCE($8, financing_plans.term_months),
		   cet = COALESCE($9, financing_plans.cet),
		   interest_rate = COALESCE($10, financing_plans.interest_rate),
		   insurance = COALESCE($11, financing_plans.insurance),
		   appraisal_fee = COALESCE($12, financing_plans.appraisal_fee),
		   other_fees = COALESCE($13, financing_plans.other_fees),
		   remaining_debt = COALESCE($14, financing_plans.remaining_debt),
		   updated_at = now()
		 RETURNING id, purchase_price, sale_price, down_payment_percent, down_payment_value, financed_value,
		           term_months, cet, interest_rate, insurance, appraisal_fee, other_fees, remaining_debt`,
		propertyID, workspaceID, req.PurchasePrice, req.SalePrice, req.DownPaymentPercent,
		req.DownPaymentValue, req.FinancedValue, req.TermMonths, req.CET, req.InterestRate,
		req.Insurance, req.AppraisalFee, req.OtherFees, req.RemainingDebt,
	).Scan(&planID, &inputs.PurchasePrice, &inputs.SalePrice, &inputs.DownPaymentPercent,
		&inputs.DownPaymentValue, &inputs.FinancedValue, &inputs.TermMonths,
		&inputs.CET, &inputs.InterestRate, &inputs.Insurance, &inputs.AppraisalFee,
		&inputs.OtherFees, &inputs.RemainingDebt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to save financing", Details: []string{err.Error()}})
		return
	}

	// Get payments
	payments, err := a.getFinancingPayments(r.Context(), planID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch payments"})
		return
	}

	// Get effective settings (property-level overrides + workspace fallback)
	settings, err := a.getEffectiveFinancingSettings(r.Context(), propertyID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	// Calculate outputs
	outputs := a.calculateFinancingOutputs(inputs, payments, settings)

	writeJSON(w, http.StatusOK, financingAnalysisResponse{
		PlanID:         planID,
		Inputs:         inputs,
		Payments:       payments,
		Outputs:        outputs,
		EffectiveRates: financingSettingsToRates(settings),
	})
}

func (a *api) handleListFinancingPayments(w http.ResponseWriter, r *http.Request, planID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access via plan
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT fp.workspace_id
		 FROM financing_plans fp
		 JOIN workspace_memberships m ON m.workspace_id = fp.workspace_id
		 WHERE fp.id = $1 AND m.user_id = $2`,
		planID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "financing plan not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check plan"})
		return
	}

	payments, err := a.getFinancingPayments(r.Context(), planID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch payments"})
		return
	}

	var total float64
	for _, p := range payments {
		total += p.Amount
	}

	writeJSON(w, http.StatusOK, listPaymentsResponse{Items: payments, Total: total})
}

func (a *api) handleCreateFinancingPayment(w http.ResponseWriter, r *http.Request, planID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createPaymentRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if req.MonthIndex <= 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "month_index must be > 0"})
		return
	}
	if req.Amount < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "amount must be >= 0"})
		return
	}

	// Check access via plan
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT fp.workspace_id
		 FROM financing_plans fp
		 JOIN workspace_memberships m ON m.workspace_id = fp.workspace_id
		 WHERE fp.id = $1 AND m.user_id = $2`,
		planID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "financing plan not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check plan"})
		return
	}

	// Insert payment
	var payment financingPayment
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO financing_payments (plan_id, workspace_id, month_index, amount)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, month_index, amount, created_at`,
		planID, workspaceID, req.MonthIndex, req.Amount,
	).Scan(&payment.ID, &payment.MonthIndex, &payment.Amount, &payment.CreatedAt)
	if err != nil {
		// Check for unique constraint violation
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			writeError(w, http.StatusConflict, apiError{Code: "DUPLICATE_MONTH", Message: "payment for this month already exists"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create payment", Details: []string{err.Error()}})
		return
	}

	writeJSON(w, http.StatusCreated, payment)
}

func (a *api) handleDeleteFinancingPayment(w http.ResponseWriter, r *http.Request, planID, paymentID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access via plan
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT fp.workspace_id
		 FROM financing_plans fp
		 JOIN workspace_memberships m ON m.workspace_id = fp.workspace_id
		 WHERE fp.id = $1 AND m.user_id = $2`,
		planID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "financing plan not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check plan"})
		return
	}

	// Delete payment
	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM financing_payments WHERE id = $1 AND plan_id = $2`,
		paymentID, planID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete payment"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "payment not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *api) handleCreateFinancingSnapshot(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access and get workspace_id + status_pipeline
	var workspaceID, statusPipeline string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id, p.status_pipeline
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID, &statusPipeline)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// M12 - Enforce snapshot creation limit
	requestID := r.Header.Get("X-Request-ID")
	if !a.enforceSnapshotCreation(w, r, userID, workspaceID, requestID) {
		return
	}

	// Get financing plan
	var planID string
	var inputs financingInputs
	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT id, purchase_price, sale_price, down_payment_percent, down_payment_value, financed_value,
		        term_months, cet, interest_rate, insurance, appraisal_fee, other_fees, remaining_debt
		 FROM financing_plans
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&planID, &inputs.PurchasePrice, &inputs.SalePrice, &inputs.DownPaymentPercent,
		&inputs.DownPaymentValue, &inputs.FinancedValue, &inputs.TermMonths,
		&inputs.CET, &inputs.InterestRate, &inputs.Insurance, &inputs.AppraisalFee,
		&inputs.OtherFees, &inputs.RemainingDebt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusBadRequest, apiError{Code: "NO_ANALYSIS", Message: "no financing to snapshot"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch financing"})
		return
	}

	// Get payments
	payments, err := a.getFinancingPayments(r.Context(), planID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch payments"})
		return
	}

	// Get effective settings (property-level overrides + workspace fallback)
	settings, err := a.getEffectiveFinancingSettings(r.Context(), propertyID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	// Calculate outputs
	outputs := a.calculateFinancingOutputs(inputs, payments, settings)

	// Create snapshot
	inputsJSON, _ := json.Marshal(inputs)
	paymentsJSON, _ := json.Marshal(payments)
	outputsJSON, _ := json.Marshal(outputs)
	ratesJSON, _ := json.Marshal(financingSettingsToRates(settings))

	var snapshotID string
	var createdAt time.Time
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO analysis_financing_snapshots (property_id, workspace_id, inputs_json, payments_json, outputs_json, effective_rates, status_pipeline)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		propertyID, workspaceID, inputsJSON, paymentsJSON, outputsJSON, ratesJSON, statusPipeline,
	).Scan(&snapshotID, &createdAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create snapshot"})
		return
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeAnalysisFinancingSaved, map[string]any{
		"snapshot_id": snapshotID,
		"net_profit":  outputs.NetProfit,
		"roi":         outputs.ROI,
	}, userID)

	writeJSON(w, http.StatusCreated, createSnapshotResponse{SnapshotID: snapshotID, CreatedAt: createdAt})
}

func (a *api) handleListFinancingSnapshots(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT id, inputs_json, payments_json, outputs_json, effective_rates, status_pipeline, created_at
		 FROM analysis_financing_snapshots
		 WHERE property_id = $1
		 ORDER BY created_at DESC
		 LIMIT 50`,
		propertyID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query snapshots"})
		return
	}
	defer rows.Close()

	items := make([]financingSnapshot, 0)
	for rows.Next() {
		var s financingSnapshot
		var rates, status sql.NullString
		err := rows.Scan(&s.ID, &s.InputsJSON, &s.PaymentsJSON, &s.OutputsJSON, &rates, &status, &s.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan snapshot"})
			return
		}
		if rates.Valid {
			s.EffectiveRates = json.RawMessage(rates.String)
		}
		if status.Valid {
			s.StatusPipeline = &status.String
		}
		items = append(items, s)
	}

	writeJSON(w, http.StatusOK, listFinancingSnapshotsResponse{Items: items})
}

func (a *api) handleDeleteFinancingSnapshot(w http.ResponseWriter, r *http.Request, propertyID, snapshotID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// Delete snapshot (only if it belongs to this property and workspace)
	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM analysis_financing_snapshots
		 WHERE id = $1 AND property_id = $2 AND workspace_id = $3`,
		snapshotID, propertyID, workspaceID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete snapshot"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "snapshot not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper functions

func (a *api) getFinancingPayments(ctx context.Context, planID string) ([]financingPayment, error) {
	rows, err := a.db.QueryContext(
		ctx,
		`SELECT id, month_index, amount, created_at
		 FROM financing_payments
		 WHERE plan_id = $1
		 ORDER BY month_index`,
		planID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	payments := make([]financingPayment, 0)
	for rows.Next() {
		var p financingPayment
		if err := rows.Scan(&p.ID, &p.MonthIndex, &p.Amount, &p.CreatedAt); err != nil {
			return nil, err
		}
		payments = append(payments, p)
	}
	return payments, nil
}

func (a *api) getWorkspaceFinancingSettings(ctx context.Context, workspaceID string) (viability.FinancingSettings, error) {
	var s viability.FinancingSettings
	err := a.db.QueryRowContext(
		ctx,
		`SELECT itbi_rate, registry_rate, broker_rate, pj_tax_rate
		 FROM workspace_settings
		 WHERE workspace_id = $1`,
		workspaceID,
	).Scan(&s.ITBIRate, &s.RegistryRate, &s.BrokerRate, &s.PJTaxRate)
	return s, err
}

func (a *api) calculateFinancingOutputs(inputs financingInputs, payments []financingPayment, settings viability.FinancingSettings) financingOutputs {
	viabilityInputs := viability.FinancingInputs{
		PurchasePrice:      inputs.PurchasePrice,
		SalePrice:          inputs.SalePrice,
		DownPaymentPercent: inputs.DownPaymentPercent,
		DownPaymentValue:   inputs.DownPaymentValue,
		FinancedValue:      inputs.FinancedValue,
		TermMonths:         inputs.TermMonths,
		CET:                inputs.CET,
		InterestRate:       inputs.InterestRate,
		Insurance:          inputs.Insurance,
		AppraisalFee:       inputs.AppraisalFee,
		OtherFees:          inputs.OtherFees,
		RemainingDebt:      inputs.RemainingDebt,
	}

	viabilityPayments := make([]viability.FinancingPayment, len(payments))
	for i, p := range payments {
		viabilityPayments[i] = viability.FinancingPayment{
			MonthIndex: p.MonthIndex,
			Amount:     p.Amount,
		}
	}

	result := viability.CalculateFinancing(viabilityInputs, viabilityPayments, settings)

	return financingOutputs{
		DownPaymentValue:     result.DownPaymentValue,
		FinancedValue:        result.FinancedValue,
		PaymentsTotal:        result.PaymentsTotal,
		BankFeesTotal:        result.BankFeesTotal,
		ITBIValue:            result.ITBIValue,
		RegistryValue:        result.RegistryValue,
		AcquisitionFees:      result.AcquisitionFees,
		TotalPaid:            result.TotalPaid,
		InvestmentTotal:      result.InvestmentTotal,
		BrokerFee:            result.BrokerFee,
		GrossProfit:          result.GrossProfit,
		PJTaxValue:           result.PJTaxValue,
		NetProfit:            result.NetProfit,
		ROI:                  result.ROI,
		InterestPaidEstimate: result.InterestPaidEstimate,
		IsPartial:            result.IsPartial,
	}
}
