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
	AccessKey      string
	SecretKey      string
	Bucket         string
	Region         string
	ForcePathStyle bool
}

func Load() (Config, error) {
	cfg := Config{
		Port:              getenv("API_PORT", "8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		BetterAuthJWKSURL: getenv("BETTER_AUTH_JWKS_URL", "http://localhost:3000/api/auth/jwks"),
		InternalAPISecret: os.Getenv("INTERNAL_API_SECRET"),
		S3: S3Config{
			Endpoint:       getenv("S3_ENDPOINT", "http://localhost:9000"),
			AccessKey:      getenv("S3_ACCESS_KEY", "minioadmin"),
			SecretKey:      getenv("S3_SECRET_KEY", "minioadmin"),
			Bucket:         getenv("S3_BUCKET", "widia-flip-dev"),
			Region:         getenv("S3_REGION", "us-east-1"),
			ForcePathStyle: getenv("S3_FORCE_PATH_STYLE", "true") == "true",
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
