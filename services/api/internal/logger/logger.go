package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

type ctxKey string

const (
	requestIDKey   ctxKey = "log_request_id"
	userIDKey      ctxKey = "log_user_id"
	workspaceIDKey ctxKey = "log_workspace_id"
)

var defaultLogger *slog.Logger

func Init(level string) {
	lvl := slog.LevelInfo
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	}

	defaultLogger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: lvl,
	}))
	slog.SetDefault(defaultLogger)
}

func Default() *slog.Logger {
	if defaultLogger == nil {
		Init("info")
	}
	return defaultLogger
}

func WithContext(ctx context.Context) *slog.Logger {
	logger := Default()

	if reqID, ok := ctx.Value(requestIDKey).(string); ok && reqID != "" {
		logger = logger.With(slog.String("request_id", reqID))
	}
	if userID, ok := ctx.Value(userIDKey).(string); ok && userID != "" {
		logger = logger.With(slog.String("user_id", userID))
	}
	if wsID, ok := ctx.Value(workspaceIDKey).(string); ok && wsID != "" {
		logger = logger.With(slog.String("workspace_id", wsID))
	}

	return logger
}

func ContextWithRequestID(ctx context.Context, reqID string) context.Context {
	return context.WithValue(ctx, requestIDKey, reqID)
}

func ContextWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func ContextWithWorkspaceID(ctx context.Context, wsID string) context.Context {
	return context.WithValue(ctx, workspaceIDKey, wsID)
}

func RequestIDFromContext(ctx context.Context) string {
	if reqID, ok := ctx.Value(requestIDKey).(string); ok {
		return reqID
	}
	return ""
}

func UserIDFromContext(ctx context.Context) string {
	if userID, ok := ctx.Value(userIDKey).(string); ok {
		return userID
	}
	return ""
}

func WorkspaceIDFromContext(ctx context.Context) string {
	if wsID, ok := ctx.Value(workspaceIDKey).(string); ok {
		return wsID
	}
	return ""
}
