package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/widia-projects/widia-flip/services/api/internal/config"
	"github.com/widia-projects/widia-flip/services/api/internal/httpapi"
	"github.com/widia-projects/widia-flip/services/api/internal/llm"
	"github.com/widia-projects/widia-flip/services/api/internal/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("db ping: %v", err)
	}

	// Initialize S3 client for document storage
	s3Client, err := storage.NewS3Client(cfg.S3)
	if err != nil {
		log.Printf("warning: S3 client init failed (document upload will be disabled): %v", err)
		s3Client = nil
	} else {
		log.Printf("S3 client initialized for bucket: %s", cfg.S3.Bucket)
	}

	// Initialize LLM client for Flip Score risk assessment
	var llmClient *llm.Client
	if cfg.LLM.OpenRouterAPIKey != "" {
		llmClient = llm.NewClient(llm.Config{
			APIKey: cfg.LLM.OpenRouterAPIKey,
			Model:  cfg.LLM.OpenRouterModel,
		})
		log.Printf("LLM client initialized with model: %s", cfg.LLM.OpenRouterModel)
	} else {
		log.Printf("warning: OPENROUTER_API_KEY not set (Flip Score LLM analysis will be disabled)")
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
		log.Printf("Go API listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_ = srv.Shutdown(ctx)
}
