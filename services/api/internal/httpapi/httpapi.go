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

	// M4 - Documents
	protectedMux.HandleFunc("/api/v1/documents", api.handleDocumentsCollection)
	protectedMux.HandleFunc("/api/v1/documents/", api.handleDocumentsSubroutes)

	// M10 - Billing (protected - requires user auth)
	protectedMux.HandleFunc("/api/v1/billing/", api.handleBillingSubroutes)

	// User preferences (onboarding, feature tour)
	protectedMux.HandleFunc("/api/v1/user/preferences", api.handleUserPreferences)

	// Unified Snapshots (workspace-wide)
	protectedMux.HandleFunc("/api/v1/snapshots", api.handleSnapshotsCollection)
	protectedMux.HandleFunc("/api/v1/snapshots/", api.handleSnapshotsSubroutes)

	// Apply auth middleware only to protected routes
	var protectedHandler http.Handler = protectedMux
	protectedHandler = authMiddleware(api.tokenVerifier, protectedHandler)

	// Internal routes (protected by X-Internal-Secret, no JWT auth)
	internalMux := http.NewServeMux()
	internalMux.HandleFunc("/api/v1/internal/billing/", api.handleInternalBillingSubroutes)
	var internalHandler http.Handler = internalMux
	internalHandler = internalSecretMiddleware(internalHandler)

	// Combine public, protected, and internal routes
	mainMux := http.NewServeMux()
	mainMux.Handle("/api/v1/health", publicMux)
	mainMux.Handle("/api/v1/public/", publicMux)
	mainMux.Handle("/api/v1/internal/", internalHandler)
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
