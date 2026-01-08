package httpapi

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/logger"
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
		ctx = logger.ContextWithUserID(ctx, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = newRequestID()
		}

		ctx := logger.ContextWithRequestID(r.Context(), reqID)
		w.Header().Set("X-Request-ID", reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				logger.WithContext(r.Context()).Error("panic",
					slog.Any("error", v),
					slog.String("method", r.Method),
					slog.String("path", r.URL.Path),
				)
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

func adminAuthMiddleware(verifier *auth.JWKSVerifier, db *sql.DB, next http.Handler) http.Handler {
	return authMiddleware(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, apiError{
				Code:    "UNAUTHORIZED",
				Message: "missing user context",
			})
			return
		}

		var isAdmin, isActive bool
		err := db.QueryRowContext(r.Context(),
			`SELECT is_admin, is_active FROM "user" WHERE id = $1`,
			userID,
		).Scan(&isAdmin, &isActive)

		if err == sql.ErrNoRows {
			writeError(w, http.StatusUnauthorized, apiError{
				Code:    "UNAUTHORIZED",
				Message: "user not found",
			})
			return
		}
		if err != nil {
			logger.WithContext(r.Context()).Error("admin_check_failed", slog.Any("error", err))
			writeError(w, http.StatusInternalServerError, apiError{
				Code:    "INTERNAL_ERROR",
				Message: "failed to check admin status",
			})
			return
		}

		if !isActive {
			writeError(w, http.StatusForbidden, apiError{
				Code:    "ACCOUNT_DISABLED",
				Message: "account is disabled",
			})
			return
		}

		if !isAdmin {
			writeError(w, http.StatusForbidden, apiError{
				Code:    "FORBIDDEN",
				Message: "admin access required",
			})
			return
		}

		next.ServeHTTP(w, r)
	}))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		logger.WithContext(r.Context()).Info("http_request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rec.status),
			slog.Duration("duration", time.Since(start)),
		)
	})
}
