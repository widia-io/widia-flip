package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// Promotion types
type promotion struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	BannerText     string  `json:"bannerText"`
	BannerEmoji    string  `json:"bannerEmoji"`
	StripeCouponID *string `json:"stripeCouponId"`
	EndsAt         string  `json:"endsAt"`
	IsActive       bool    `json:"isActive"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}

type activeBannerResponse struct {
	ID             string  `json:"id"`
	BannerText     string  `json:"bannerText"`
	BannerEmoji    string  `json:"bannerEmoji"`
	StripeCouponID *string `json:"stripeCouponId"`
	EndsAt         string  `json:"endsAt"`
}

type createPromotionRequest struct {
	Name           string  `json:"name"`
	BannerText     string  `json:"bannerText"`
	BannerEmoji    string  `json:"bannerEmoji"`
	StripeCouponID *string `json:"stripeCouponId"`
	EndsAt         string  `json:"endsAt"`
	IsActive       bool    `json:"isActive"`
}

type updatePromotionRequest struct {
	Name           *string `json:"name"`
	BannerText     *string `json:"bannerText"`
	BannerEmoji    *string `json:"bannerEmoji"`
	StripeCouponID *string `json:"stripeCouponId"`
	EndsAt         *string `json:"endsAt"`
	IsActive       *bool   `json:"isActive"`
}

type listPromotionsResponse struct {
	Items []promotion `json:"items"`
}

// Public handler: GET /api/v1/public/promotions/active-banner
func (a *api) handlePublicActiveBanner(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	var p activeBannerResponse
	var endsAt time.Time

	// Debug: log all promotions and current time
	var dbNow time.Time
	a.db.QueryRowContext(ctx, `SELECT NOW()`).Scan(&dbNow)
	log.Printf("active-banner: DB NOW() = %v", dbNow)

	rows, _ := a.db.QueryContext(ctx, `SELECT id, is_active, ends_at, ends_at > NOW() as valid FROM flip.promotions`)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var id string
			var isActive, valid bool
			var et time.Time
			rows.Scan(&id, &isActive, &et, &valid)
			log.Printf("active-banner: promo id=%s is_active=%v ends_at=%v valid=%v", id, isActive, et, valid)
		}
	}

	err := a.db.QueryRowContext(ctx, `
		SELECT id, banner_text, banner_emoji, stripe_coupon_id, ends_at
		FROM flip.promotions
		WHERE is_active = true AND ends_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`).Scan(&p.ID, &p.BannerText, &p.BannerEmoji, &p.StripeCouponID, &endsAt)

	if err == sql.ErrNoRows {
		log.Printf("active-banner: no active banner found (is_active=true AND ends_at > NOW)")
		writeJSON(w, http.StatusOK, map[string]interface{}{"banner": nil})
		return
	}
	if err != nil {
		log.Printf("public active banner: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch banner"})
		return
	}

	p.EndsAt = endsAt.Format(time.RFC3339)
	writeJSON(w, http.StatusOK, map[string]interface{}{"banner": p})
}

// Admin handler: /api/v1/admin/promotions
func (a *api) handleAdminPromotionsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleAdminListPromotions(w, r)
	case http.MethodPost:
		a.handleAdminCreatePromotion(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// Admin handler: /api/v1/admin/promotions/{id}
func (a *api) handleAdminPromotionsSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/promotions/")
	promotionID := strings.TrimSpace(rest)
	if promotionID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	switch r.Method {
	case http.MethodGet:
		a.handleAdminGetPromotion(w, r, promotionID)
	case http.MethodPut:
		a.handleAdminUpdatePromotion(w, r, promotionID)
	case http.MethodDelete:
		a.handleAdminDeletePromotion(w, r, promotionID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleAdminListPromotions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rows, err := a.db.QueryContext(ctx, `
		SELECT id, name, banner_text, banner_emoji, stripe_coupon_id, ends_at, is_active, created_at, updated_at
		FROM flip.promotions
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("admin list promotions: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch promotions"})
		return
	}
	defer rows.Close()

	items := make([]promotion, 0)
	for rows.Next() {
		var p promotion
		var endsAt, createdAt, updatedAt time.Time
		if err := rows.Scan(&p.ID, &p.Name, &p.BannerText, &p.BannerEmoji, &p.StripeCouponID, &endsAt, &p.IsActive, &createdAt, &updatedAt); err != nil {
			log.Printf("admin list promotions: scan error: %v", err)
			continue
		}
		p.EndsAt = endsAt.Format(time.RFC3339)
		p.CreatedAt = createdAt.Format(time.RFC3339)
		p.UpdatedAt = updatedAt.Format(time.RFC3339)
		items = append(items, p)
	}

	writeJSON(w, http.StatusOK, listPromotionsResponse{Items: items})
}

func (a *api) handleAdminCreatePromotion(w http.ResponseWriter, r *http.Request) {
	var req createPromotionRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate required fields
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "name is required"})
		return
	}
	if req.BannerText == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "bannerText is required"})
		return
	}
	if req.EndsAt == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "endsAt is required"})
		return
	}

	// Parse ends_at
	endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "endsAt must be RFC3339 format"})
		return
	}

	// Default emoji
	emoji := req.BannerEmoji
	if emoji == "" {
		emoji = "🎉"
	}

	ctx := r.Context()

	// If setting active, deactivate others first
	if req.IsActive {
		_, err := a.db.ExecContext(ctx, `UPDATE flip.promotions SET is_active = false WHERE is_active = true`)
		if err != nil {
			log.Printf("admin create promotion: deactivate error: %v", err)
		}
	}

	var p promotion
	var createdAt, updatedAt time.Time
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO flip.promotions (name, banner_text, banner_emoji, stripe_coupon_id, ends_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, banner_text, banner_emoji, stripe_coupon_id, ends_at, is_active, created_at, updated_at
	`, req.Name, req.BannerText, emoji, req.StripeCouponID, endsAt, req.IsActive).Scan(
		&p.ID, &p.Name, &p.BannerText, &p.BannerEmoji, &p.StripeCouponID, &endsAt, &p.IsActive, &createdAt, &updatedAt,
	)
	if err != nil {
		log.Printf("admin create promotion: insert error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create promotion"})
		return
	}

	p.EndsAt = endsAt.Format(time.RFC3339)
	p.CreatedAt = createdAt.Format(time.RFC3339)
	p.UpdatedAt = updatedAt.Format(time.RFC3339)

	writeJSON(w, http.StatusCreated, p)
}

func (a *api) handleAdminGetPromotion(w http.ResponseWriter, r *http.Request, promotionID string) {
	ctx := r.Context()

	var p promotion
	var endsAt, createdAt, updatedAt time.Time
	err := a.db.QueryRowContext(ctx, `
		SELECT id, name, banner_text, banner_emoji, stripe_coupon_id, ends_at, is_active, created_at, updated_at
		FROM flip.promotions
		WHERE id = $1
	`, promotionID).Scan(&p.ID, &p.Name, &p.BannerText, &p.BannerEmoji, &p.StripeCouponID, &endsAt, &p.IsActive, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "promotion not found"})
		return
	}
	if err != nil {
		log.Printf("admin get promotion: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch promotion"})
		return
	}

	p.EndsAt = endsAt.Format(time.RFC3339)
	p.CreatedAt = createdAt.Format(time.RFC3339)
	p.UpdatedAt = updatedAt.Format(time.RFC3339)

	writeJSON(w, http.StatusOK, p)
}

func (a *api) handleAdminUpdatePromotion(w http.ResponseWriter, r *http.Request, promotionID string) {
	var req updatePromotionRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	ctx := r.Context()

	// Check exists
	var exists bool
	a.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM flip.promotions WHERE id = $1)`, promotionID).Scan(&exists)
	if !exists {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "promotion not found"})
		return
	}

	// If setting active, deactivate others first
	if req.IsActive != nil && *req.IsActive {
		_, err := a.db.ExecContext(ctx, `UPDATE flip.promotions SET is_active = false WHERE is_active = true AND id != $1`, promotionID)
		if err != nil {
			log.Printf("admin update promotion: deactivate error: %v", err)
		}
	}

	// Build dynamic update
	updates := make([]string, 0)
	args := make([]interface{}, 0)
	argNum := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argNum))
		args = append(args, *req.Name)
		argNum++
	}
	if req.BannerText != nil {
		updates = append(updates, fmt.Sprintf("banner_text = $%d", argNum))
		args = append(args, *req.BannerText)
		argNum++
	}
	if req.BannerEmoji != nil {
		updates = append(updates, fmt.Sprintf("banner_emoji = $%d", argNum))
		args = append(args, *req.BannerEmoji)
		argNum++
	}
	if req.StripeCouponID != nil {
		updates = append(updates, fmt.Sprintf("stripe_coupon_id = $%d", argNum))
		args = append(args, *req.StripeCouponID)
		argNum++
	}
	if req.EndsAt != nil {
		endsAt, err := time.Parse(time.RFC3339, *req.EndsAt)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "endsAt must be RFC3339 format"})
			return
		}
		updates = append(updates, fmt.Sprintf("ends_at = $%d", argNum))
		args = append(args, endsAt)
		argNum++
	}
	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argNum))
		args = append(args, *req.IsActive)
		argNum++
	}

	if len(updates) == 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "no fields to update"})
		return
	}

	args = append(args, promotionID)
	query := fmt.Sprintf("UPDATE flip.promotions SET %s WHERE id = $%d", strings.Join(updates, ", "), argNum)

	_, err := a.db.ExecContext(ctx, query, args...)
	if err != nil {
		log.Printf("admin update promotion: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update promotion"})
		return
	}

	// Fetch updated record
	a.handleAdminGetPromotion(w, r, promotionID)
}

func (a *api) handleAdminDeletePromotion(w http.ResponseWriter, r *http.Request, promotionID string) {
	ctx := r.Context()

	result, err := a.db.ExecContext(ctx, `DELETE FROM flip.promotions WHERE id = $1`, promotionID)
	if err != nil {
		log.Printf("admin delete promotion: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete promotion"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "promotion not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
