package httpapi

import (
	"database/sql"
	"net/http"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

type Deps struct {
	DB                *sql.DB
	BetterAuthJWKSURL string
}

func NewHandler(deps Deps) http.Handler {
	api := &api{
		db:            deps.DB,
		tokenVerifier: auth.NewJWKSVerifier(deps.BetterAuthJWKSURL),
	}

	mux := http.NewServeMux()

	// M0
	mux.HandleFunc("/api/v1/health", api.handleHealth)
	mux.HandleFunc("/api/v1/workspaces", api.handleWorkspacesCollection)
	mux.HandleFunc("/api/v1/workspaces/", api.handleWorkspacesSubroutes)

	var h http.Handler = mux
	h = authMiddleware(api.tokenVerifier, h)
	h = recoverMiddleware(h)
	h = requestIDMiddleware(h)
	return h
}

type api struct {
	db            *sql.DB
	tokenVerifier *auth.JWKSVerifier
}
