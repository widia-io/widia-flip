package config

import (
	"errors"
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	BetterAuthJWKSURL string
}

func Load() (Config, error) {
	cfg := Config{
		Port:              getenv("API_PORT", "8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		BetterAuthJWKSURL: getenv("BETTER_AUTH_JWKS_URL", "http://localhost:3000/api/auth/jwks"),
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
