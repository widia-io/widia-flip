package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/widia-projects/widia-flip/services/api/internal/config"
	"github.com/widia-projects/widia-flip/services/api/internal/httpapi"
	"github.com/widia-projects/widia-flip/services/api/internal/llm"
	"github.com/widia-projects/widia-flip/services/api/internal/logger"
	"github.com/widia-projects/widia-flip/services/api/internal/storage"
)

func main() {
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}
	logger.Init(logLevel)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", slog.Any("error", err))
		os.Exit(1)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("db open failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer db.Close()

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		slog.Error("db ping failed", slog.Any("error", err))
		os.Exit(1)
	}

	s3Client, err := storage.NewS3Client(cfg.S3)
	if err != nil {
		slog.Warn("s3_client_init_failed", slog.Any("error", err))
		s3Client = nil
	} else {
		slog.Info("s3_client_initialized", slog.String("bucket", cfg.S3.Bucket))
	}

	var llmClient *llm.Client
	if cfg.LLM.OpenRouterAPIKey != "" {
		llmClient = llm.NewClient(llm.Config{
			APIKey: cfg.LLM.OpenRouterAPIKey,
			Model:  cfg.LLM.OpenRouterModel,
		})
		slog.Info("llm_client_initialized", slog.String("model", cfg.LLM.OpenRouterModel))
	} else {
		slog.Warn("llm_disabled", slog.String("reason", "OPENROUTER_API_KEY not set"))
	}

	handler := httpapi.NewHandler(httpapi.Deps{
		DB:                db,
		BetterAuthJWKSURL: cfg.BetterAuthJWKSURL,
		S3Client:          s3Client,
		LLMClient:         llmClient,
		StorageProvider:   cfg.S3.Provider,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.Info("api_started", slog.String("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("listen_failed", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_ = srv.Shutdown(ctx)
}
