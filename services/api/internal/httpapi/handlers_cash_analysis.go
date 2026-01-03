package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

type cashInputs struct {
	PurchasePrice  *float64 `json:"purchase_price"`
	RenovationCost *float64 `json:"renovation_cost"`
	OtherCosts     *float64 `json:"other_costs"`
	SalePrice      *float64 `json:"sale_price"`
}

type cashOutputs struct {
	ITBIValue       float64 `json:"itbi_value"`
	RegistryValue   float64 `json:"registry_value"`
	AcquisitionCost float64 `json:"acquisition_cost"`
	InvestmentTotal float64 `json:"investment_total"`
	BrokerFee       float64 `json:"broker_fee"`
	GrossProfit     float64 `json:"gross_profit"`
	PJTaxValue      float64 `json:"pj_tax_value"`
	NetProfit       float64 `json:"net_profit"`
	ROI             float64 `json:"roi"`
	IsPartial       bool    `json:"is_partial"`
}

type cashAnalysisResponse struct {
	Inputs         cashInputs     `json:"inputs"`
	Outputs        cashOutputs    `json:"outputs"`
	EffectiveRates effectiveRates `json:"effective_rates"`
}

type cashSnapshot struct {
	ID             string          `json:"id"`
	Inputs         json.RawMessage `json:"inputs"`
	Outputs        json.RawMessage `json:"outputs"`
	EffectiveRates json.RawMessage `json:"effective_rates,omitempty"`
	StatusPipeline *string         `json:"status_pipeline,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type listCashSnapshotsResponse struct {
	Items []cashSnapshot `json:"items"`
}

type createSnapshotResponse struct {
	SnapshotID string    `json:"snapshot_id"`
	CreatedAt  time.Time `json:"created_at"`
}

func (a *api) handlePropertyCashAnalysis(w http.ResponseWriter, r *http.Request, propertyID string, subparts []string) {
	// /api/v1/properties/:id/analysis/cash
	if len(subparts) == 0 {
		switch r.Method {
		case http.MethodGet:
			a.handleGetCashAnalysis(w, r, propertyID)
		case http.MethodPut:
			a.handleUpdateCashAnalysis(w, r, propertyID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/properties/:id/analysis/cash/snapshot
	if len(subparts) == 1 && subparts[0] == "snapshot" {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleCreateCashSnapshot(w, r, propertyID)
		return
	}

	// /api/v1/properties/:id/analysis/cash/snapshots
	if len(subparts) == 1 && subparts[0] == "snapshots" {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleListCashSnapshots(w, r, propertyID)
		return
	}

	// /api/v1/properties/:id/analysis/cash/snapshots/:snapshotId
	if len(subparts) == 2 && subparts[0] == "snapshots" {
		snapshotID := subparts[1]
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleDeleteCashSnapshot(w, r, propertyID, snapshotID)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleGetCashAnalysis(w http.ResponseWriter, r *http.Request, propertyID string) {
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
	settings, err := a.getEffectivePropertySettings(r.Context(), propertyID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	// Get current inputs
	var inputs cashInputs
	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT purchase_price, renovation_cost, other_costs, sale_price
		 FROM analysis_cash_inputs
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&inputs.PurchasePrice, &inputs.RenovationCost, &inputs.OtherCosts, &inputs.SalePrice)
	if err != nil {
		if err == sql.ErrNoRows {
			// Return empty inputs with partial outputs
			writeJSON(w, http.StatusOK, cashAnalysisResponse{
				Inputs:         inputs,
				Outputs:        cashOutputs{IsPartial: true},
				EffectiveRates: settingsToRates(settings),
			})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch analysis"})
		return
	}

	// Calculate outputs
	outputs := a.calculateCashOutputs(inputs, settings)

	writeJSON(w, http.StatusOK, cashAnalysisResponse{
		Inputs:         inputs,
		Outputs:        outputs,
		EffectiveRates: settingsToRates(settings),
	})
}

func (a *api) handleUpdateCashAnalysis(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req cashInputs
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

	// Upsert inputs
	var inputs cashInputs
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO analysis_cash_inputs (property_id, workspace_id, purchase_price, renovation_cost, other_costs, sale_price)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (property_id)
		 DO UPDATE SET
		   purchase_price = COALESCE($3, analysis_cash_inputs.purchase_price),
		   renovation_cost = COALESCE($4, analysis_cash_inputs.renovation_cost),
		   other_costs = COALESCE($5, analysis_cash_inputs.other_costs),
		   sale_price = COALESCE($6, analysis_cash_inputs.sale_price),
		   updated_at = now()
		 RETURNING purchase_price, renovation_cost, other_costs, sale_price`,
		propertyID, workspaceID, req.PurchasePrice, req.RenovationCost, req.OtherCosts, req.SalePrice,
	).Scan(&inputs.PurchasePrice, &inputs.RenovationCost, &inputs.OtherCosts, &inputs.SalePrice)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to save analysis", Details: []string{err.Error()}})
		return
	}

	// Get effective settings (property-level overrides + workspace fallback)
	settings, err := a.getEffectivePropertySettings(r.Context(), propertyID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	// Calculate outputs
	outputs := a.calculateCashOutputs(inputs, settings)

	writeJSON(w, http.StatusOK, cashAnalysisResponse{
		Inputs:         inputs,
		Outputs:        outputs,
		EffectiveRates: settingsToRates(settings),
	})
}

func (a *api) handleCreateCashSnapshot(w http.ResponseWriter, r *http.Request, propertyID string) {
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

	// Get current inputs
	var inputs cashInputs
	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT purchase_price, renovation_cost, other_costs, sale_price
		 FROM analysis_cash_inputs
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&inputs.PurchasePrice, &inputs.RenovationCost, &inputs.OtherCosts, &inputs.SalePrice)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusBadRequest, apiError{Code: "NO_ANALYSIS", Message: "no analysis to snapshot"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch analysis"})
		return
	}

	// Get effective settings (property-level overrides + workspace fallback)
	settings, err := a.getEffectivePropertySettings(r.Context(), propertyID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	// Calculate outputs
	outputs := a.calculateCashOutputs(inputs, settings)

	// Create snapshot
	inputsJSON, _ := json.Marshal(inputs)
	outputsJSON, _ := json.Marshal(outputs)
	ratesJSON, _ := json.Marshal(settingsToRates(settings))

	var snapshotID string
	var createdAt time.Time
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO analysis_cash_snapshots (property_id, workspace_id, inputs, outputs, effective_rates, status_pipeline)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		propertyID, workspaceID, inputsJSON, outputsJSON, ratesJSON, statusPipeline,
	).Scan(&snapshotID, &createdAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create snapshot"})
		return
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeAnalysisCashSaved, map[string]any{
		"snapshot_id": snapshotID,
		"net_profit":  outputs.NetProfit,
		"roi":         outputs.ROI,
	}, userID)

	writeJSON(w, http.StatusCreated, createSnapshotResponse{SnapshotID: snapshotID, CreatedAt: createdAt})
}

func (a *api) handleListCashSnapshots(w http.ResponseWriter, r *http.Request, propertyID string) {
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
		`SELECT id, inputs, outputs, effective_rates, status_pipeline, created_at
		 FROM analysis_cash_snapshots
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

	items := make([]cashSnapshot, 0)
	for rows.Next() {
		var s cashSnapshot
		var rates, status sql.NullString
		err := rows.Scan(&s.ID, &s.Inputs, &s.Outputs, &rates, &status, &s.CreatedAt)
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

	writeJSON(w, http.StatusOK, listCashSnapshotsResponse{Items: items})
}

func (a *api) handleDeleteCashSnapshot(w http.ResponseWriter, r *http.Request, propertyID, snapshotID string) {
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
		`DELETE FROM analysis_cash_snapshots
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

func (a *api) getWorkspaceCashSettings(ctx context.Context, workspaceID string) (viability.CashSettings, error) {
	var s viability.CashSettings
	err := a.db.QueryRowContext(
		ctx,
		`SELECT itbi_rate, registry_rate, broker_rate, pj_tax_rate
		 FROM workspace_settings
		 WHERE workspace_id = $1`,
		workspaceID,
	).Scan(&s.ITBIRate, &s.RegistryRate, &s.BrokerRate, &s.PJTaxRate)
	return s, err
}

func (a *api) calculateCashOutputs(inputs cashInputs, settings viability.CashSettings) cashOutputs {
	viabilityInputs := viability.CashInputs{
		PurchasePrice:  inputs.PurchasePrice,
		RenovationCost: inputs.RenovationCost,
		OtherCosts:     inputs.OtherCosts,
		SalePrice:      inputs.SalePrice,
	}

	result := viability.CalculateCash(viabilityInputs, settings)

	return cashOutputs{
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
	}
}
