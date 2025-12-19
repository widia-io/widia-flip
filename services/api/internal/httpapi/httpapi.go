package httpapi

import (
	"database/sql"
	"net/http"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/storage"
)

type Deps struct {
	DB                *sql.DB
	BetterAuthJWKSURL string
	S3Client          *storage.S3Client
}

func NewHandler(deps Deps) http.Handler {
	api := &api{
		db:            deps.DB,
		tokenVerifier: auth.NewJWKSVerifier(deps.BetterAuthJWKSURL),
		s3Client:      deps.S3Client,
	}

	mux := http.NewServeMux()

	// M0
	mux.HandleFunc("/api/v1/health", api.handleHealth)
	mux.HandleFunc("/api/v1/workspaces", api.handleWorkspacesCollection)
	mux.HandleFunc("/api/v1/workspaces/", api.handleWorkspacesSubroutes)

	// M1 - Prospects
	mux.HandleFunc("/api/v1/prospects", api.handleProspectsCollection)
	mux.HandleFunc("/api/v1/prospects/", api.handleProspectsSubroutes)

	// M2 - Properties
	mux.HandleFunc("/api/v1/properties", api.handlePropertiesCollection)
	mux.HandleFunc("/api/v1/properties/", api.handlePropertiesSubroutes)

	// M3 - Financing
	mux.HandleFunc("/api/v1/financing/", api.handleFinancingSubroutes)

	// M4 - Costs
	mux.HandleFunc("/api/v1/costs/", api.handleCostsSubroutes)

	// M4 - Documents
	mux.HandleFunc("/api/v1/documents", api.handleDocumentsCollection)
	mux.HandleFunc("/api/v1/documents/", api.handleDocumentsSubroutes)

	var h http.Handler = mux
	h = authMiddleware(api.tokenVerifier, h)
	h = recoverMiddleware(h)
	h = requestIDMiddleware(h)
	return h
}

type api struct {
	db            *sql.DB
	tokenVerifier *auth.JWKSVerifier
	s3Client      *storage.S3Client
}
