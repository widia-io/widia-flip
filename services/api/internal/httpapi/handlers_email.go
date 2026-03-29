package httpapi

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// generateToken creates a secure random token (64 hex chars)
func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Email campaign types

type emailCampaign struct {
	ID             string  `json:"id"`
	Subject        string  `json:"subject"`
	BodyHTML       string  `json:"bodyHtml"`
	AudienceKey    string  `json:"audienceKey"`
	Status         string  `json:"status"`
	CreatedBy      string  `json:"createdBy"`
	CreatedAt      string  `json:"createdAt"`
	QueuedAt       *string `json:"queuedAt"`
	SentAt         *string `json:"sentAt"`
	RecipientCount int     `json:"recipientCount"`
}

type listCampaignsResponse struct {
	Items []emailCampaign `json:"items"`
}

type eligibleRecipientAudienceCounts struct {
	AllEligible         int `json:"allEligible"`
	TrialExpiredEngaged int `json:"trialExpiredEngaged"`
	CalculatorLeadsHot  int `json:"calculatorLeadsHot"`
}

type eligibleRecipientsResponse struct {
	EligibleCount       int                             `json:"eligibleCount"`
	UserCount           int                             `json:"userCount"`
	LeadCount           int                             `json:"leadCount"`
	EbookLeadCount      int                             `json:"ebookLeadCount"`
	CalculatorLeadCount int                             `json:"calculatorLeadCount"`
	AudienceCounts      eligibleRecipientAudienceCounts `json:"audienceCounts"`
}

type eligibleRecipient struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	OptInAt   string `json:"optInAt"`
	CreatedAt string `json:"createdAt"`
	Source    string `json:"source"`
}

type listEligibleRecipientsResponse struct {
	Items []eligibleRecipient `json:"items"`
	Total int                 `json:"total"`
}

type createCampaignRequest struct {
	Subject     string `json:"subject"`
	BodyHTML    string `json:"bodyHtml"`
	AudienceKey string `json:"audienceKey"`
}

type queueCampaignResponse struct {
	RecipientCount int `json:"recipientCount"`
}

type sendBatchResponse struct {
	Processed int    `json:"processed"`
	Sent      int    `json:"sent"`
	Failed    int    `json:"failed"`
	Status    string `json:"status"`
}

const (
	emailAudienceAllEligible         = "all_eligible"
	emailAudienceTrialExpiredEngaged = "trial_expired_engaged"
	emailAudienceCalculatorLeadsHot  = "calculator_leads_hot"

	emailRecipientSourceUser           = "user"
	emailRecipientSourceEbookLead      = "ebook_lead"
	emailRecipientSourceCalculatorLead = "calculator_lead"

	hotCalculatorLeadMinROI = 20.0
)

type emailRecipientCandidate struct {
	ID               string
	Email            string
	Name             string
	Source           string
	OptInAt          time.Time
	CreatedAt        time.Time
	UserID           *string
	EbookLeadID      *string
	CalculatorLeadID *string
}

func normalizeRecipientEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func mergeRecipientGroups(groups ...[]emailRecipientCandidate) []emailRecipientCandidate {
	seen := make(map[string]struct{})
	merged := make([]emailRecipientCandidate, 0)

	for _, group := range groups {
		for _, recipient := range group {
			emailKey := normalizeRecipientEmail(recipient.Email)
			if emailKey == "" {
				continue
			}
			if _, exists := seen[emailKey]; exists {
				continue
			}
			seen[emailKey] = struct{}{}
			merged = append(merged, recipient)
		}
	}

	return merged
}

func recipientEmailSet(recipients []emailRecipientCandidate) map[string]struct{} {
	emails := make(map[string]struct{}, len(recipients))
	for _, recipient := range recipients {
		emailKey := normalizeRecipientEmail(recipient.Email)
		if emailKey == "" {
			continue
		}
		emails[emailKey] = struct{}{}
	}
	return emails
}

func filterUsersByEmailSet(users []emailRecipientCandidate, emails map[string]struct{}) []emailRecipientCandidate {
	filtered := make([]emailRecipientCandidate, 0)
	for _, user := range users {
		if _, ok := emails[normalizeRecipientEmail(user.Email)]; ok {
			filtered = append(filtered, user)
		}
	}
	return filtered
}

// Handler for /api/v1/admin/email/* routes
func (a *api) handleAdminEmailSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/email/")

	// /api/v1/admin/email/recipients
	if rest == "recipients" {
		if r.Method == http.MethodGet {
			a.handleEmailRecipients(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/admin/email/recipients/list
	if rest == "recipients/list" {
		if r.Method == http.MethodGet {
			a.handleListEligibleRecipients(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/admin/email/campaigns
	if rest == "campaigns" || rest == "campaigns/" {
		switch r.Method {
		case http.MethodGet:
			a.handleListCampaigns(w, r)
		case http.MethodPost:
			a.handleCreateCampaign(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/admin/email/campaigns/{id}/*
	if after, found := strings.CutPrefix(rest, "campaigns/"); found {
		parts := strings.Split(after, "/")
		campaignID := parts[0]
		if campaignID == "" {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		// /api/v1/admin/email/campaigns/{id}
		if len(parts) == 1 {
			if r.Method == http.MethodGet {
				a.handleGetCampaign(w, r, campaignID)
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}

		// /api/v1/admin/email/campaigns/{id}/queue
		if len(parts) == 2 && parts[1] == "queue" {
			if r.Method == http.MethodPost {
				a.handleQueueCampaign(w, r, campaignID)
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}

		// /api/v1/admin/email/campaigns/{id}/send
		if len(parts) == 2 && parts[1] == "send" {
			if r.Method == http.MethodPost {
				a.handleSendCampaignBatch(w, r, campaignID)
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}

		// /api/v1/admin/email/campaigns/{id}/stats
		if len(parts) == 2 && parts[1] == "stats" {
			if r.Method == http.MethodGet {
				a.handleGetCampaignStats(w, r, campaignID)
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}
	}

	w.WriteHeader(http.StatusNotFound)
}

func validAudienceKey(audienceKey string) bool {
	switch audienceKey {
	case emailAudienceAllEligible, emailAudienceTrialExpiredEngaged, emailAudienceCalculatorLeadsHot:
		return true
	default:
		return false
	}
}

func (a *api) loadEligibleUsers(ctx context.Context) ([]emailRecipientCandidate, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, email, COALESCE(NULLIF(name, ''), email) AS name, marketing_opt_in_at, "createdAt"
		FROM "user"
		WHERE "emailVerified" = true
		  AND is_active = true
		  AND marketing_opt_in_at IS NOT NULL
		  AND marketing_opt_out_at IS NULL
		ORDER BY marketing_opt_in_at DESC, "createdAt" DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipients := make([]emailRecipientCandidate, 0)
	for rows.Next() {
		var recipient emailRecipientCandidate
		var userID string
		if err := rows.Scan(&userID, &recipient.Email, &recipient.Name, &recipient.OptInAt, &recipient.CreatedAt); err != nil {
			return nil, err
		}
		recipient.ID = userID
		recipient.Source = emailRecipientSourceUser
		recipient.UserID = &userID
		recipients = append(recipients, recipient)
	}

	return recipients, rows.Err()
}

func (a *api) loadEligibleEbookLeads(ctx context.Context) ([]emailRecipientCandidate, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, email, email AS name, created_at, created_at
		FROM flip.ebook_leads
		WHERE marketing_consent = true
		  AND converted_at IS NULL
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipients := make([]emailRecipientCandidate, 0)
	for rows.Next() {
		var recipient emailRecipientCandidate
		var leadID string
		if err := rows.Scan(&leadID, &recipient.Email, &recipient.Name, &recipient.OptInAt, &recipient.CreatedAt); err != nil {
			return nil, err
		}
		recipient.ID = leadID
		recipient.Source = emailRecipientSourceEbookLead
		recipient.EbookLeadID = &leadID
		recipients = append(recipients, recipient)
	}

	return recipients, rows.Err()
}

func (a *api) loadHotCalculatorLeads(ctx context.Context) ([]emailRecipientCandidate, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, email, name, updated_at, created_at
		FROM flip.calculator_leads
		WHERE marketing_consent = true
		  AND is_partial = false
		  AND roi >= $1
		  AND net_profit > 0
		ORDER BY updated_at DESC, created_at DESC
	`, hotCalculatorLeadMinROI)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipients := make([]emailRecipientCandidate, 0)
	for rows.Next() {
		var recipient emailRecipientCandidate
		var leadID string
		if err := rows.Scan(&leadID, &recipient.Email, &recipient.Name, &recipient.OptInAt, &recipient.CreatedAt); err != nil {
			return nil, err
		}
		recipient.ID = leadID
		recipient.Source = emailRecipientSourceCalculatorLead
		recipient.CalculatorLeadID = &leadID
		recipients = append(recipients, recipient)
	}

	return recipients, rows.Err()
}

func (a *api) loadTrialExpiredEngagedUsers(ctx context.Context) ([]emailRecipientCandidate, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT
			u.id,
			u.email,
			COALESCE(NULLIF(u.name, ''), u.email) AS name,
			u.marketing_opt_in_at,
			u."createdAt"
		FROM "user" u
		JOIN user_billing b ON b.user_id = u.id
		WHERE b.trial_end IS NOT NULL
		  AND b.trial_end < now()
		  AND b.status != 'active'
		  AND u.is_admin = false
		  AND u.is_active = true
		  AND u."emailVerified" = true
		  AND u.marketing_opt_in_at IS NOT NULL
		  AND u.marketing_opt_out_at IS NULL
		  AND (
		    EXISTS (
		      SELECT 1
		      FROM workspace_memberships wm
		      JOIN prospecting_properties p ON p.workspace_id = wm.workspace_id
		      WHERE wm.user_id = u.id
		        AND p.deleted_at IS NULL
		    )
		    OR EXISTS (
		      SELECT 1
		      FROM workspace_memberships wm
		      JOIN analysis_cash_snapshots cs ON cs.workspace_id = wm.workspace_id
		      WHERE wm.user_id = u.id
		    )
		    OR EXISTS (
		      SELECT 1
		      FROM workspace_memberships wm
		      JOIN analysis_financing_snapshots fs ON fs.workspace_id = wm.workspace_id
		      WHERE wm.user_id = u.id
		    )
		  )
		ORDER BY b.trial_end DESC, u."createdAt" DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipients := make([]emailRecipientCandidate, 0)
	for rows.Next() {
		var recipient emailRecipientCandidate
		var userID string
		if err := rows.Scan(&userID, &recipient.Email, &recipient.Name, &recipient.OptInAt, &recipient.CreatedAt); err != nil {
			return nil, err
		}
		recipient.ID = userID
		recipient.Source = emailRecipientSourceUser
		recipient.UserID = &userID
		recipients = append(recipients, recipient)
	}

	return recipients, rows.Err()
}

func (a *api) resolveAudienceRecipients(
	ctx context.Context,
	audienceKey string,
) ([]emailRecipientCandidate, []emailRecipientCandidate, []emailRecipientCandidate, []emailRecipientCandidate, error) {
	users, err := a.loadEligibleUsers(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	trialExpiredEngaged, err := a.loadTrialExpiredEngagedUsers(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	hotCalculatorLeads, err := a.loadHotCalculatorLeads(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	ebookLeads, err := a.loadEligibleEbookLeads(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	switch audienceKey {
	case emailAudienceAllEligible:
		return mergeRecipientGroups(users, hotCalculatorLeads, ebookLeads), users, trialExpiredEngaged, hotCalculatorLeads, nil
	case emailAudienceTrialExpiredEngaged:
		return mergeRecipientGroups(trialExpiredEngaged), users, trialExpiredEngaged, hotCalculatorLeads, nil
	case emailAudienceCalculatorLeadsHot:
		userPriorityRecipients := filterUsersByEmailSet(users, recipientEmailSet(hotCalculatorLeads))
		return mergeRecipientGroups(userPriorityRecipients, hotCalculatorLeads), users, trialExpiredEngaged, hotCalculatorLeads, nil
	default:
		return nil, nil, nil, nil, fmt.Errorf("invalid audience key: %s", audienceKey)
	}
}

func (a *api) buildRecipientCounts(ctx context.Context) (eligibleRecipientsResponse, []emailRecipientCandidate, error) {
	allEligible, users, trialExpiredEngaged, hotCalculatorLeads, err := a.resolveAudienceRecipients(ctx, emailAudienceAllEligible)
	if err != nil {
		return eligibleRecipientsResponse{}, nil, err
	}

	ebookLeads, err := a.loadEligibleEbookLeads(ctx)
	if err != nil {
		return eligibleRecipientsResponse{}, nil, err
	}

	hotAudienceRecipients, _, _, _, err := a.resolveAudienceRecipients(ctx, emailAudienceCalculatorLeadsHot)
	if err != nil {
		return eligibleRecipientsResponse{}, nil, err
	}

	return eligibleRecipientsResponse{
		EligibleCount:       len(allEligible),
		UserCount:           len(users),
		LeadCount:           len(ebookLeads) + len(hotCalculatorLeads),
		EbookLeadCount:      len(ebookLeads),
		CalculatorLeadCount: len(hotCalculatorLeads),
		AudienceCounts: eligibleRecipientAudienceCounts{
			AllEligible:         len(allEligible),
			TrialExpiredEngaged: len(trialExpiredEngaged),
			CalculatorLeadsHot:  len(hotAudienceRecipients),
		},
	}, allEligible, nil
}

// Handler for /api/v1/public/unsubscribe/{token}
func (a *api) handlePublicUnsubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	token := strings.TrimPrefix(r.URL.Path, "/api/v1/public/unsubscribe/")
	if token == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "token is required"})
		return
	}

	ctx := r.Context()

	userResult, err := a.db.ExecContext(ctx, `
		UPDATE "user"
		SET marketing_opt_out_at = now()
		WHERE unsubscribe_token = $1
		AND marketing_opt_out_at IS NULL
	`, token)
	if err != nil {
		log.Printf("unsubscribe: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to unsubscribe"})
		return
	}

	leadResult, err := a.db.ExecContext(ctx, `
		UPDATE flip.ebook_leads
		SET marketing_consent = false
		WHERE unsubscribe_token = $1
		  AND marketing_consent = true
	`, token)
	if err != nil {
		log.Printf("unsubscribe ebook lead: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to unsubscribe"})
		return
	}

	calculatorResult, err := a.db.ExecContext(ctx, `
		UPDATE flip.calculator_leads
		SET marketing_consent = false,
		    updated_at = now()
		WHERE unsubscribe_token = $1
		  AND marketing_consent = true
	`, token)
	if err != nil {
		log.Printf("unsubscribe calculator lead: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to unsubscribe"})
		return
	}

	userRows, _ := userResult.RowsAffected()
	leadRows, _ := leadResult.RowsAffected()
	calculatorRows, _ := calculatorResult.RowsAffected()
	if userRows == 0 && leadRows == 0 && calculatorRows == 0 {
		// Token not found or already unsubscribed - still return success for privacy.
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "unsubscribed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "unsubscribed"})
}

// Get count of eligible recipients
func (a *api) handleEmailRecipients(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	counts, _, err := a.buildRecipientCounts(ctx)
	if err != nil {
		log.Printf("email recipients: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count recipients"})
		return
	}

	writeJSON(w, http.StatusOK, counts)
}

// List eligible recipients
func (a *api) handleListEligibleRecipients(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	recipients, _, _, _, err := a.resolveAudienceRecipients(ctx, emailAudienceAllEligible)
	if err != nil {
		log.Printf("list eligible recipients: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list recipients"})
		return
	}

	items := make([]eligibleRecipient, 0)
	for i, recipient := range recipients {
		if i >= 500 {
			break
		}
		items = append(items, eligibleRecipient{
			ID:        recipient.ID,
			Email:     recipient.Email,
			Name:      recipient.Name,
			OptInAt:   recipient.OptInAt.Format(time.RFC3339),
			CreatedAt: recipient.CreatedAt.Format(time.RFC3339),
			Source:    recipient.Source,
		})
	}

	writeJSON(w, http.StatusOK, listEligibleRecipientsResponse{Items: items, Total: len(items)})
}

// List all campaigns
func (a *api) handleListCampaigns(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rows, err := a.db.QueryContext(ctx, `
		SELECT id, subject, body_html, audience_key, status, created_by, created_at, queued_at, sent_at, recipient_count
		FROM email_campaigns
		ORDER BY created_at DESC
		LIMIT 100
	`)
	if err != nil {
		log.Printf("list campaigns: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list campaigns"})
		return
	}
	defer rows.Close()

	items := make([]emailCampaign, 0)
	for rows.Next() {
		var c emailCampaign
		var createdAt time.Time
		var queuedAt, sentAt sql.NullTime

		if err := rows.Scan(&c.ID, &c.Subject, &c.BodyHTML, &c.AudienceKey, &c.Status, &c.CreatedBy, &createdAt, &queuedAt, &sentAt, &c.RecipientCount); err != nil {
			log.Printf("list campaigns: scan error: %v", err)
			continue
		}

		c.CreatedAt = createdAt.Format(time.RFC3339)
		if queuedAt.Valid {
			t := queuedAt.Time.Format(time.RFC3339)
			c.QueuedAt = &t
		}
		if sentAt.Valid {
			t := sentAt.Time.Format(time.RFC3339)
			c.SentAt = &t
		}

		items = append(items, c)
	}

	writeJSON(w, http.StatusOK, listCampaignsResponse{Items: items})
}

// Create new campaign
func (a *api) handleCreateCampaign(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createCampaignRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	if strings.TrimSpace(req.Subject) == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "subject is required"})
		return
	}
	if strings.TrimSpace(req.BodyHTML) == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "bodyHtml is required"})
		return
	}
	if req.AudienceKey == "" {
		req.AudienceKey = emailAudienceAllEligible
	}
	if !validAudienceKey(req.AudienceKey) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "audienceKey is invalid"})
		return
	}

	ctx := r.Context()
	var c emailCampaign
	var createdAt time.Time

	err := a.db.QueryRowContext(ctx, `
		INSERT INTO email_campaigns (subject, body_html, audience_key, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, subject, body_html, audience_key, status, created_by, created_at, recipient_count
	`, req.Subject, req.BodyHTML, req.AudienceKey, userID).Scan(
		&c.ID, &c.Subject, &c.BodyHTML, &c.AudienceKey, &c.Status, &c.CreatedBy, &createdAt, &c.RecipientCount,
	)
	if err != nil {
		log.Printf("create campaign: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create campaign"})
		return
	}

	c.CreatedAt = createdAt.Format(time.RFC3339)
	writeJSON(w, http.StatusCreated, c)
}

// Get single campaign
func (a *api) handleGetCampaign(w http.ResponseWriter, r *http.Request, campaignID string) {
	ctx := r.Context()

	var c emailCampaign
	var createdAt time.Time
	var queuedAt, sentAt sql.NullTime

	err := a.db.QueryRowContext(ctx, `
		SELECT id, subject, body_html, audience_key, status, created_by, created_at, queued_at, sent_at, recipient_count
		FROM email_campaigns
		WHERE id = $1
	`, campaignID).Scan(&c.ID, &c.Subject, &c.BodyHTML, &c.AudienceKey, &c.Status, &c.CreatedBy, &createdAt, &queuedAt, &sentAt, &c.RecipientCount)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "campaign not found"})
		return
	}
	if err != nil {
		log.Printf("get campaign: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get campaign"})
		return
	}

	c.CreatedAt = createdAt.Format(time.RFC3339)
	if queuedAt.Valid {
		t := queuedAt.Time.Format(time.RFC3339)
		c.QueuedAt = &t
	}
	if sentAt.Valid {
		t := sentAt.Time.Format(time.RFC3339)
		c.SentAt = &t
	}

	writeJSON(w, http.StatusOK, c)
}

func (a *api) ensureRecipientToken(ctx context.Context, tx *sql.Tx, recipient emailRecipientCandidate) error {
	token := generateToken()

	switch recipient.Source {
	case emailRecipientSourceUser:
		if recipient.UserID == nil {
			return fmt.Errorf("missing user recipient id")
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE "user"
			SET unsubscribe_token = COALESCE(unsubscribe_token, $2)
			WHERE id = $1
		`, *recipient.UserID, token)
		return err
	case emailRecipientSourceEbookLead:
		if recipient.EbookLeadID == nil {
			return fmt.Errorf("missing ebook lead recipient id")
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE flip.ebook_leads
			SET unsubscribe_token = COALESCE(unsubscribe_token, $2)
			WHERE id = $1
		`, *recipient.EbookLeadID, token)
		return err
	case emailRecipientSourceCalculatorLead:
		if recipient.CalculatorLeadID == nil {
			return fmt.Errorf("missing calculator lead recipient id")
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE flip.calculator_leads
			SET unsubscribe_token = COALESCE(unsubscribe_token, $2)
			WHERE id = $1
		`, *recipient.CalculatorLeadID, token)
		return err
	default:
		return fmt.Errorf("unsupported recipient source: %s", recipient.Source)
	}
}

func insertEmailSendRecipient(ctx context.Context, tx *sql.Tx, campaignID string, recipient emailRecipientCandidate) (int64, error) {
	result, err := tx.ExecContext(ctx, `
		INSERT INTO email_sends (campaign_id, user_id, ebook_lead_id, calculator_lead_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING
	`, campaignID, recipient.UserID, recipient.EbookLeadID, recipient.CalculatorLeadID)
	if err != nil {
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return rowsAffected, nil
}

// Queue campaign - populate email_sends with eligible recipients
func (a *api) handleQueueCampaign(w http.ResponseWriter, r *http.Request, campaignID string) {
	ctx := r.Context()

	// Verify campaign exists and is in draft status
	var status string
	var audienceKey string
	err := a.db.QueryRowContext(ctx, `SELECT status, audience_key FROM email_campaigns WHERE id = $1`, campaignID).Scan(&status, &audienceKey)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "campaign not found"})
		return
	}
	if err != nil {
		log.Printf("queue campaign: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get campaign"})
		return
	}

	if status != "draft" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "campaign must be in draft status to queue"})
		return
	}

	recipients, _, _, _, err := a.resolveAudienceRecipients(ctx, audienceKey)
	if err != nil {
		log.Printf("queue campaign: resolve audience error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to resolve audience"})
		return
	}

	// Start transaction
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to start transaction"})
		return
	}
	defer tx.Rollback()

	var recipientCount int64
	for _, recipient := range recipients {
		if err := a.ensureRecipientToken(ctx, tx, recipient); err != nil {
			log.Printf("queue campaign: ensure token error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to generate recipient tokens"})
			return
		}

		rowsAffected, err := insertEmailSendRecipient(ctx, tx, campaignID, recipient)
		if err != nil {
			log.Printf("queue campaign: insert recipient error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to queue recipients"})
			return
		}
		recipientCount += rowsAffected
	}

	// Update campaign status
	_, err = tx.ExecContext(ctx, `
		UPDATE email_campaigns
		SET status = 'queued', queued_at = now(), recipient_count = $2
		WHERE id = $1
	`, campaignID, recipientCount)
	if err != nil {
		log.Printf("queue campaign: update status error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update campaign"})
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("queue campaign: commit error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to commit"})
		return
	}

	writeJSON(w, http.StatusOK, queueCampaignResponse{RecipientCount: int(recipientCount)})
}

// Send campaign batch - process up to 50 emails
func (a *api) handleSendCampaignBatch(w http.ResponseWriter, r *http.Request, campaignID string) {
	ctx := r.Context()

	// Get campaign details
	var subject, bodyHTML, status string
	err := a.db.QueryRowContext(ctx, `
		SELECT subject, body_html, status FROM email_campaigns WHERE id = $1
	`, campaignID).Scan(&subject, &bodyHTML, &status)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "campaign not found"})
		return
	}
	if err != nil {
		log.Printf("send batch: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get campaign"})
		return
	}

	if status != "queued" && status != "sending" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "campaign must be queued or sending"})
		return
	}

	// Update to sending if queued
	if status == "queued" {
		a.db.ExecContext(ctx, `UPDATE email_campaigns SET status = 'sending' WHERE id = $1`, campaignID)
	}

	// Get batch of queued sends (registered users + ebook leads + calculator leads)
	rows, err := a.db.QueryContext(ctx, `
		SELECT es.id, COALESCE(u.email, cl.email, el.email) AS email,
			COALESCE(NULLIF(u.name, ''), NULLIF(cl.name, ''), el.email) AS name,
			COALESCE(u.unsubscribe_token, cl.unsubscribe_token, el.unsubscribe_token) AS unsubscribe_token
		FROM email_sends es
		LEFT JOIN "user" u ON u.id = es.user_id
		LEFT JOIN flip.calculator_leads cl ON cl.id = es.calculator_lead_id
		LEFT JOIN flip.ebook_leads el ON el.id = es.ebook_lead_id
		WHERE es.campaign_id = $1 AND es.status = 'queued'
		LIMIT 50
	`, campaignID)
	if err != nil {
		log.Printf("send batch: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get sends"})
		return
	}
	defer rows.Close()

	type sendTarget struct {
		ID               string
		Email            string
		Name             string
		UnsubscribeToken string
	}

	targets := make([]sendTarget, 0)
	for rows.Next() {
		var t sendTarget
		if err := rows.Scan(&t.ID, &t.Email, &t.Name, &t.UnsubscribeToken); err != nil {
			continue
		}
		targets = append(targets, t)
	}

	if len(targets) == 0 {
		// All done - mark campaign as sent
		a.db.ExecContext(ctx, `UPDATE email_campaigns SET status = 'sent', sent_at = now() WHERE id = $1`, campaignID)
		writeJSON(w, http.StatusOK, sendBatchResponse{Processed: 0, Sent: 0, Failed: 0, Status: "completed"})
		return
	}

	// Process batch
	sent := 0
	failed := 0

	for _, t := range targets {
		resendEmailID, err := sendMarketingEmail(t.Email, t.Name, subject, bodyHTML, t.UnsubscribeToken)
		if err != nil {
			log.Printf("send email to %s: error: %v", t.Email, err)
			a.db.ExecContext(ctx, `
				UPDATE email_sends SET status = 'failed', error = $2
				WHERE id = $1
			`, t.ID, err.Error())
			failed++
		} else {
			a.db.ExecContext(ctx, `
				UPDATE email_sends SET status = 'sent', sent_at = now(), resend_email_id = $2
				WHERE id = $1
			`, t.ID, resendEmailID)
			sent++
		}
	}

	// Check if there are more to send
	var remaining int
	a.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM email_sends WHERE campaign_id = $1 AND status = 'queued'
	`, campaignID).Scan(&remaining)

	responseStatus := "sending"
	if remaining == 0 {
		a.db.ExecContext(ctx, `UPDATE email_campaigns SET status = 'sent', sent_at = now() WHERE id = $1`, campaignID)
		responseStatus = "completed"
	}

	writeJSON(w, http.StatusOK, sendBatchResponse{
		Processed: len(targets),
		Sent:      sent,
		Failed:    failed,
		Status:    responseStatus,
	})
}

// resendEmailResponse represents the response from Resend API
type resendEmailResponse struct {
	ID string `json:"id"`
}

// Send marketing email using Resend and return the Resend email ID
func sendMarketingEmail(toEmail, userName, subject, bodyHTML, unsubscribeToken string) (string, error) {
	// Get base URL for unsubscribe link
	baseURL := os.Getenv("BETTER_AUTH_URL")
	if baseURL == "" {
		baseURL = "https://meuflip.com"
	}
	unsubscribeURL := fmt.Sprintf("%s/unsubscribe/%s", baseURL, unsubscribeToken)

	// Build full email HTML with template
	fullHTML := buildMarketingEmailHTML(userName, bodyHTML, unsubscribeURL)

	// Use Resend API directly via HTTP
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("RESEND_API_KEY not configured")
	}

	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "noreply@meuflip.com"
	}

	payload := map[string]any{
		"from":    fromEmail,
		"to":      []string{toEmail},
		"subject": subject,
		"html":    fullHTML,
	}

	payloadBytes, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", strings.NewReader(string(payloadBytes)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("resend API error: status %d", resp.StatusCode)
	}

	// Parse response to get email ID
	var resendResp resendEmailResponse
	if err := json.NewDecoder(resp.Body).Decode(&resendResp); err != nil {
		// Email was sent but we couldn't parse ID - not a failure
		log.Printf("warning: couldn't parse resend response: %v", err)
		return "", nil
	}

	return resendResp.ID, nil
}

// Build marketing email HTML template
func buildMarketingEmailHTML(userName, bodyHTML, unsubscribeURL string) string {
	greeting := "Olá"
	if userName != "" {
		greeting = fmt.Sprintf("Olá %s", userName)
	}

	logoSVG := `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 32V8L14 20L24 8L28 4" stroke="#1E293B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M23 4H28V9" stroke="#1E293B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M20 32V12H34" stroke="#14B8A6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 22H30" stroke="#14B8A6" stroke-width="4" stroke-linecap="round"/>
</svg>`

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    %s
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 700; color: #18181b;">meuflip</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #52525b;">
                %s,
              </p>
              <div style="font-size: 15px; line-height: 1.6; color: #18181b;">
                %s
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa; text-align: center;">
                Você recebeu este email porque optou por receber novidades do meuflip.<br>
                <a href="%s" style="color: #a1a1aa;">Cancelar inscrição</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer branding -->
        <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          © %d meuflip. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`, logoSVG, greeting, bodyHTML, unsubscribeURL, time.Now().Year())
}

// Handler for user marketing consent update (protected route)
func (a *api) handleUserMarketingConsent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req struct {
		Accepted bool `json:"accepted"`
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body"})
		return
	}

	ctx := r.Context()

	if req.Accepted {
		// User accepts marketing - set opt_in, clear opt_out, generate token if needed
		// First check if user already has a token
		var existingToken sql.NullString
		a.db.QueryRowContext(ctx, `SELECT unsubscribe_token FROM "user" WHERE id = $1`, userID).Scan(&existingToken)

		token := existingToken.String
		if !existingToken.Valid || token == "" {
			token = generateToken()
		}

		_, err := a.db.ExecContext(ctx, `
			UPDATE "user"
			SET marketing_opt_in_at = COALESCE(marketing_opt_in_at, now()),
			    marketing_opt_out_at = NULL,
			    unsubscribe_token = $2
			WHERE id = $1
		`, userID, token)
		if err != nil {
			log.Printf("update consent: error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update consent"})
			return
		}
	} else {
		// User declines marketing - set opt_out
		_, err := a.db.ExecContext(ctx, `
			UPDATE "user"
			SET marketing_opt_out_at = now()
			WHERE id = $1
		`, userID)
		if err != nil {
			log.Printf("update consent: error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update consent"})
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Handler to get user marketing consent status
func (a *api) handleUserMarketingConsentStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	ctx := r.Context()

	var optInAt, optOutAt sql.NullTime
	err := a.db.QueryRowContext(ctx, `
		SELECT marketing_opt_in_at, marketing_opt_out_at
		FROM "user"
		WHERE id = $1
	`, userID).Scan(&optInAt, &optOutAt)
	if err != nil {
		log.Printf("get consent status: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get consent"})
		return
	}

	// Determine status:
	// - "pending": never responded (both null)
	// - "accepted": opt_in set and opt_out is null
	// - "declined": opt_out set
	status := "pending"
	if optOutAt.Valid {
		status = "declined"
	} else if optInAt.Valid {
		status = "accepted"
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

// ================== Webhook Handler ==================

// resendWebhookEvent represents a Resend webhook event
type resendWebhookEvent struct {
	Type      string `json:"type"`
	CreatedAt string `json:"created_at"`
	Data      struct {
		EmailID string   `json:"email_id"`
		From    string   `json:"from"`
		To      []string `json:"to"`
		Subject string   `json:"subject"`
	} `json:"data"`
}

// verifyResendWebhook verifies the Svix signature from Resend webhooks
func verifyResendWebhook(payload []byte, headers http.Header, secret string) bool {
	msgID := headers.Get("svix-id")
	timestamp := headers.Get("svix-timestamp")
	signature := headers.Get("svix-signature")

	if msgID == "" || timestamp == "" || signature == "" {
		log.Printf("webhook: missing headers - id=%s ts=%s sig=%s", msgID, timestamp, signature)
		return false
	}

	// Verify timestamp is within 5 minutes
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		log.Printf("webhook: invalid timestamp: %v", err)
		return false
	}
	now := time.Now().Unix()
	if math.Abs(float64(now-ts)) > 300 {
		log.Printf("webhook: timestamp too old: %d vs %d", ts, now)
		return false
	}

	// Decode secret (base64 with whsec_ prefix)
	secretKey := strings.TrimPrefix(secret, "whsec_")
	keyBytes, err := base64.StdEncoding.DecodeString(secretKey)
	if err != nil {
		log.Printf("webhook: failed to decode secret: %v", err)
		return false
	}

	// Compute HMAC-SHA256 - Svix format: {msg_id}.{timestamp}.{payload}
	signedContent := msgID + "." + timestamp + "." + string(payload)
	mac := hmac.New(sha256.New, keyBytes)
	mac.Write([]byte(signedContent))
	expectedSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// Signature format: v1,{base64sig} (can have multiple separated by space)
	for _, sig := range strings.Split(signature, " ") {
		parts := strings.SplitN(sig, ",", 2)
		if len(parts) == 2 && parts[0] == "v1" {
			if hmac.Equal([]byte(expectedSig), []byte(parts[1])) {
				return true
			}
		}
	}

	log.Printf("webhook: signature mismatch")
	return false
}

// Handler for /api/v1/webhooks/resend (public, no auth)
func (a *api) handleResendWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "failed to read body"})
		return
	}

	// Verify signature if secret is configured
	webhookSecret := os.Getenv("RESEND_WEBHOOK_SECRET")
	if webhookSecret != "" {
		if !verifyResendWebhook(body, r.Header, webhookSecret) {
			log.Printf("resend webhook: invalid signature")
			writeError(w, http.StatusUnauthorized, apiError{Code: "INVALID_SIGNATURE", Message: "invalid webhook signature"})
			return
		}
	}

	// Parse event
	var event resendWebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("resend webhook: parse error: %v", err)
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_JSON", Message: "invalid json body"})
		return
	}

	// Map Resend event types to our event types
	eventType := ""
	switch event.Type {
	case "email.sent":
		eventType = "sent"
	case "email.delivered":
		eventType = "delivered"
	case "email.opened":
		eventType = "opened"
	case "email.clicked":
		eventType = "clicked"
	case "email.bounced":
		eventType = "bounced"
	case "email.complained":
		eventType = "complained"
	case "email.delivery_delayed":
		eventType = "delayed"
	default:
		// Unknown event type, ignore
		log.Printf("resend webhook: unknown event type: %s", event.Type)
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx := r.Context()

	// Find campaign_id from email_sends by resend_email_id
	var campaignID sql.NullString
	a.db.QueryRowContext(ctx, `
		SELECT campaign_id FROM email_sends WHERE resend_email_id = $1
	`, event.Data.EmailID).Scan(&campaignID)

	// Get recipient email (first in list)
	recipientEmail := ""
	if len(event.Data.To) > 0 {
		recipientEmail = event.Data.To[0]
	}

	// Insert event
	_, err = a.db.ExecContext(ctx, `
		INSERT INTO email_events (email_id, campaign_id, event_type, recipient_email, payload)
		VALUES ($1, $2, $3, $4, $5)
	`, event.Data.EmailID, campaignID, eventType, recipientEmail, body)
	if err != nil {
		log.Printf("resend webhook: insert error: %v", err)
		// Still return 200 to avoid retries
	}

	w.WriteHeader(http.StatusOK)
}

// ================== Campaign Stats ==================

type campaignStatsResponse struct {
	Sent       int     `json:"sent"`
	Delivered  int     `json:"delivered"`
	Opened     int     `json:"opened"`
	Clicked    int     `json:"clicked"`
	Bounced    int     `json:"bounced"`
	Complained int     `json:"complained"`
	OpenRate   float64 `json:"openRate"`
	ClickRate  float64 `json:"clickRate"`
}

// Handler for /api/v1/admin/email/campaigns/{id}/stats
func (a *api) handleGetCampaignStats(w http.ResponseWriter, r *http.Request, campaignID string) {
	ctx := r.Context()

	// Verify campaign exists
	var exists bool
	err := a.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM email_campaigns WHERE id = $1)`, campaignID).Scan(&exists)
	if err != nil || !exists {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "campaign not found"})
		return
	}

	// Get event counts
	rows, err := a.db.QueryContext(ctx, `
		SELECT event_type, COUNT(*)
		FROM email_events
		WHERE campaign_id = $1
		GROUP BY event_type
	`, campaignID)
	if err != nil {
		log.Printf("get campaign stats: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get stats"})
		return
	}
	defer rows.Close()

	stats := campaignStatsResponse{}
	for rows.Next() {
		var eventType string
		var count int
		if err := rows.Scan(&eventType, &count); err != nil {
			continue
		}
		switch eventType {
		case "sent":
			stats.Sent = count
		case "delivered":
			stats.Delivered = count
		case "opened":
			stats.Opened = count
		case "clicked":
			stats.Clicked = count
		case "bounced":
			stats.Bounced = count
		case "complained":
			stats.Complained = count
		}
	}

	// Calculate rates (based on delivered, fallback to sent if no delivered events)
	base := stats.Delivered
	if base == 0 {
		base = stats.Sent
	}
	if base > 0 {
		stats.OpenRate = math.Round(float64(stats.Opened)/float64(base)*1000) / 10 // e.g. 53.8
		stats.ClickRate = math.Round(float64(stats.Clicked)/float64(base)*1000) / 10
	}

	writeJSON(w, http.StatusOK, stats)
}
