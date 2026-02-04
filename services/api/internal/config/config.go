package config

import (
	"errors"
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	BetterAuthJWKSURL string
	InternalAPISecret string
	S3                S3Config
	LLM               LLMConfig
}

type LLMConfig struct {
	OpenRouterAPIKey string
	OpenRouterModel  string
}

type S3Config struct {
	Endpoint       string
	PublicEndpoint string
	AccessKey      string
	SecretKey      string
	Bucket         string
	Region         string
	ForcePathStyle bool
	Provider       string // "minio" or "supabase"
}

func Load() (Config, error) {
	cfg := Config{
		Port:              getenv("API_PORT", "8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		BetterAuthJWKSURL: getenv("BETTER_AUTH_JWKS_URL", "http://localhost:3000/api/auth/jwks"),
		InternalAPISecret: os.Getenv("INTERNAL_API_SECRET"),
		S3: S3Config{
			Endpoint:       getenv("S3_ENDPOINT", "http://localhost:8000/storage/v1/s3"),
			PublicEndpoint: getenv("S3_PUBLIC_ENDPOINT", getenv("S3_ENDPOINT", "http://localhost:8000/storage/v1/s3")),
			AccessKey:      os.Getenv("S3_ACCESS_KEY"),
			SecretKey:      os.Getenv("S3_SECRET_KEY"),
			Bucket:         getenv("S3_BUCKET", "documents"),
			Region:         getenv("S3_REGION", "local"),
			ForcePathStyle: getenv("S3_FORCE_PATH_STYLE", "true") == "true",
			Provider:       getenv("STORAGE_PROVIDER", "supabase"),
		},
		LLM: LLMConfig{
			OpenRouterAPIKey: os.Getenv("OPENROUTER_API_KEY"),
			OpenRouterModel:  getenv("OPENROUTER_MODEL", "anthropic/claude-haiku-4.5"),
		},
	}

	if cfg.DatabaseURL == "" {
		return cfg, errors.New("DATABASE_URL is required")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}
