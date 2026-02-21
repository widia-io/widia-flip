package httpapi

import (
	"database/sql"
	"net/http"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/llm"
	"github.com/widia-projects/widia-flip/services/api/internal/storage"
)

type Deps struct {
	DB                *sql.DB
	BetterAuthJWKSURL string
	S3Client          *storage.S3Client
	LLMClient         *llm.Client
	StorageProvider   string // "minio" or "supabase"
}

func NewHandler(deps Deps) http.Handler {
	api := &api{
		db:              deps.DB,
		tokenVerifier:   auth.NewJWKSVerifier(deps.BetterAuthJWKSURL),
		s3Client:        deps.S3Client,
		llmClient:       deps.LLMClient,
		storageProvider: deps.StorageProvider,
	}

	// Public routes (no auth required)
	publicMux := http.NewServeMux()
	publicMux.HandleFunc("/api/v1/health", api.handleHealth)
	publicMux.HandleFunc("/api/v1/public/cash-calc", api.handlePublicCashCalc)
	publicMux.HandleFunc("/api/v1/public/calculator-leads", api.handlePublicCalculatorLead)
	publicMux.HandleFunc("/api/v1/public/funnel-events", api.handlePublicFunnelEvent)
	publicMux.HandleFunc("/api/v1/public/promotions/active-banner", api.handlePublicActiveBanner)
	publicMux.HandleFunc("/api/v1/public/unsubscribe/", api.handlePublicUnsubscribe)
	publicMux.HandleFunc("/api/v1/public/ebook-leads", api.handlePublicEbookLead)
	publicMux.HandleFunc("/api/v1/webhooks/resend", api.handleResendWebhook)

	// Protected routes (auth required)
	protectedMux := http.NewServeMux()

	// M0
	protectedMux.HandleFunc("/api/v1/workspaces", api.handleWorkspacesCollection)
	protectedMux.HandleFunc("/api/v1/workspaces/", api.handleWorkspacesSubroutes)

	// M1 - Prospects
	protectedMux.HandleFunc("/api/v1/prospects", api.handleProspectsCollection)
	protectedMux.HandleFunc("/api/v1/prospects/", api.handleProspectsSubroutes)

	// M2 - Properties
	protectedMux.HandleFunc("/api/v1/properties", api.handlePropertiesCollection)
	protectedMux.HandleFunc("/api/v1/properties/", api.handlePropertiesSubroutes)

	// M3 - Financing
	protectedMux.HandleFunc("/api/v1/financing/", api.handleFinancingSubroutes)

	// M4 - Costs
	protectedMux.HandleFunc("/api/v1/costs/", api.handleCostsSubroutes)

	// Schedule (Cronograma da Obra)
	protectedMux.HandleFunc("/api/v1/schedule/", api.handleScheduleSubroutes)

	// M4 - Documents
	protectedMux.HandleFunc("/api/v1/documents", api.handleDocumentsCollection)
	protectedMux.HandleFunc("/api/v1/documents/", api.handleDocumentsSubroutes)

	// Suppliers (Fornecedores)
	protectedMux.HandleFunc("/api/v1/suppliers", api.handleSuppliersCollection)
	protectedMux.HandleFunc("/api/v1/suppliers/", api.handleSuppliersSubroutes)

	// Opportunities
	protectedMux.HandleFunc("/api/v1/opportunities", api.handleOpportunitiesSubroutes)
	protectedMux.HandleFunc("/api/v1/opportunities/", api.handleOpportunitiesSubroutes)

	// M10 - Billing (protected - requires user auth)
	protectedMux.HandleFunc("/api/v1/billing/", api.handleBillingSubroutes)

	// User preferences (onboarding, feature tour)
	protectedMux.HandleFunc("/api/v1/user/preferences", api.handleUserPreferences)
	protectedMux.HandleFunc("/api/v1/funnel-events", api.handleFunnelEvent)

	// User admin status check (protected, not admin-only)
	protectedMux.HandleFunc("/api/v1/user/admin-status", api.handleUserAdminStatus)

	// User marketing consent (LGPD)
	protectedMux.HandleFunc("/api/v1/user/marketing-consent", api.handleUserMarketingConsent)
	protectedMux.HandleFunc("/api/v1/user/marketing-consent/status", api.handleUserMarketingConsentStatus)

	// Unified Snapshots (workspace-wide)
	protectedMux.HandleFunc("/api/v1/snapshots", api.handleSnapshotsCollection)
	protectedMux.HandleFunc("/api/v1/snapshots/", api.handleSnapshotsSubroutes)

	// Apply auth middleware only to protected routes
	var protectedHandler http.Handler = protectedMux
	protectedHandler = authMiddleware(api.tokenVerifier, protectedHandler)

	// Admin routes (JWT auth + is_admin check)
	adminMux := http.NewServeMux()
	adminMux.HandleFunc("/api/v1/admin/stats", api.handleAdminStats)
	adminMux.HandleFunc("/api/v1/admin/metrics/discord-report", api.handleAdminMetricsDiscordReport)
	adminMux.HandleFunc("/api/v1/admin/metrics/users", api.handleAdminMetricsUsers)
	adminMux.HandleFunc("/api/v1/admin/metrics", api.handleAdminMetrics)
	adminMux.HandleFunc("/api/v1/admin/funnel/daily", api.handleAdminFunnelDaily)
	adminMux.HandleFunc("/api/v1/admin/users", api.handleAdminUsersCollection)
	adminMux.HandleFunc("/api/v1/admin/users/", api.handleAdminUsersSubroutes)
	adminMux.HandleFunc("/api/v1/admin/promotions", api.handleAdminPromotionsCollection)
	adminMux.HandleFunc("/api/v1/admin/promotions/", api.handleAdminPromotionsSubroutes)
	adminMux.HandleFunc("/api/v1/admin/calculator-leads", api.handleAdminCalculatorLeads)
	adminMux.HandleFunc("/api/v1/admin/ebook-leads", api.handleAdminEbookLeadsSubroutes)
	adminMux.HandleFunc("/api/v1/admin/ebook-leads/", api.handleAdminEbookLeadsSubroutes)
	adminMux.HandleFunc("/api/v1/admin/ebooks/upload", api.handleAdminUploadEbook)
	adminMux.HandleFunc("/api/v1/admin/email/", api.handleAdminEmailSubroutes)
	adminMux.HandleFunc("/api/v1/admin/opportunities/scraper", api.handleAdminOpportunityScraperSubroutes)
	adminMux.HandleFunc("/api/v1/admin/opportunities/scraper/", api.handleAdminOpportunityScraperSubroutes)
	var adminHandler http.Handler = adminMux
	adminHandler = adminAuthMiddleware(api.tokenVerifier, api.db, adminHandler)

	// Internal routes (protected by X-Internal-Secret, no JWT auth)
	internalMux := http.NewServeMux()
	internalMux.HandleFunc("/api/v1/internal/billing/", api.handleInternalBillingSubroutes)
	internalMux.HandleFunc("/api/v1/internal/opportunities/", api.handleInternalOpportunitiesSubroutes)
	internalMux.HandleFunc("/api/v1/internal/opportunities", api.handleInternalOpportunitiesSubroutes)
	internalMux.HandleFunc("/api/v1/internal/job-runs/", api.handleInternalJobRunsSubroutes)
	internalMux.HandleFunc("/api/v1/internal/job-runs", api.handleInternalJobRunsSubroutes)
	var internalHandler http.Handler = internalMux
	internalHandler = internalSecretMiddleware(internalHandler)

	// Combine public, protected, internal, and admin routes
	mainMux := http.NewServeMux()
	mainMux.Handle("/api/v1/health", publicMux)
	mainMux.Handle("/api/v1/public/", publicMux)
	mainMux.Handle("/api/v1/webhooks/", publicMux)
	mainMux.Handle("/api/v1/internal/", internalHandler)
	mainMux.Handle("/api/v1/admin/", adminHandler)
	mainMux.Handle("/", protectedHandler)

	var h http.Handler = mainMux
	h = recoverMiddleware(h)
	h = requestIDMiddleware(h)
	return h
}

type api struct {
	db              *sql.DB
	tokenVerifier   *auth.JWKSVerifier
	s3Client        *storage.S3Client
	llmClient       *llm.Client
	storageProvider string
}
