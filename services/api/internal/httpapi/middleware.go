package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

func authMiddleware(verifier *auth.JWKSVerifier, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Health is intentionally allowed unauthenticated, but still passes through middleware.
		if r.URL.Path == "/api/v1/health" {
			next.ServeHTTP(w, r)
			return
		}

		userID, err := verifier.ValidateAuthorizationHeader(r.Header.Get("Authorization"))
		if err != nil {
			writeError(w, http.StatusUnauthorized, apiError{
				Code:    "UNAUTHORIZED",
				Message: "invalid or missing token",
				Details: []string{err.Error()},
			})
			return
		}

		ctx := auth.ContextWithUserID(r.Context(), userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = newRequestID()
		}

		w.Header().Set("X-Request-ID", reqID)
		next.ServeHTTP(w, r)
	})
}

func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Printf("panic: %v", v)
				writeError(w, http.StatusInternalServerError, apiError{
					Code:    "INTERNAL_ERROR",
					Message: "internal server error",
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}

func newRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err == nil {
		return hex.EncodeToString(b)
	}

	// Fallback (should be extremely rare).
	return hex.EncodeToString([]byte(time.Now().Format(time.RFC3339Nano)))
}
