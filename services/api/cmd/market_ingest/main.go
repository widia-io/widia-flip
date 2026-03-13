package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/widia-projects/widia-flip/services/api/internal/llm"
	"github.com/widia-projects/widia-flip/services/api/internal/marketingest"
)

type config struct {
	FilePath  string
	City      string
	Source    string
	AsOfMonth string
	DBURL     string
	DryRun    bool
	UseLLM    bool
	LLMMax    int
	LLMModel  string
}

func main() {
	cfg := parseFlags()
	asOfMonth, err := marketingest.ParseAsOfMonth(cfg.AsOfMonth)
	if err != nil {
		log.Fatalf("invalid --as-of-month: %v", err)
	}

	runCfg := marketingest.RunConfig{
		FilePath:    cfg.FilePath,
		City:        cfg.City,
		Source:      cfg.Source,
		AsOfMonth:   asOfMonth,
		DryRun:      cfg.DryRun,
		MaxLLMCalls: cfg.LLMMax,
	}

	if cfg.UseLLM {
		apiKey := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))
		if apiKey != "" {
			runCfg.NeighborhoodNormalizer = llm.NewClient(llm.Config{
				APIKey: apiKey,
				Model:  cfg.LLMModel,
			})
		} else {
			log.Printf("warning: OPENROUTER_API_KEY ausente; normalização LLM desativada")
		}
	}

	ctx := context.Background()
	if cfg.DryRun {
		result, runErr := marketingest.RunFromFile(ctx, nil, runCfg)
		if runErr != nil {
			log.Fatalf("dry-run failed: %v", runErr)
		}
		log.Printf("parsed workbook: input_rows=%d valid_rows=%d months=%d records=%d", result.InputRows, result.ValidRows, len(result.TouchedMonths), result.ValidRows)
		log.Printf("dry-run completed; no database writes performed")
		return
	}

	db, err := sql.Open("pgx", cfg.DBURL)
	if err != nil {
		log.Fatalf("db open failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("db ping failed: %v", err)
	}

	result, runErr := marketingest.RunFromFile(ctx, db, runCfg)
	if runErr != nil {
		log.Fatalf("ingestion failed: %v", runErr)
	}

	log.Printf("parsed workbook: input_rows=%d valid_rows=%d months=%d records=%d", result.InputRows, result.ValidRows, len(result.TouchedMonths), result.ValidRows)
	log.Printf("ingestion completed: run_id=%s output_groups=%d", result.RunID, result.OutputGroups)
}

func parseFlags() config {
	cfg := config{}

	flag.StringVar(&cfg.FilePath, "file", "docs/reference/GUIAS DE ITBI PAGAS (28012026) XLS.xlsx", "Path to XLSX file")
	flag.StringVar(&cfg.City, "city", marketingest.DefaultCity, "City slug (M16 supports: sp)")
	flag.StringVar(&cfg.Source, "source", marketingest.DefaultSource, "Source id")
	flag.StringVar(&cfg.AsOfMonth, "as-of-month", "", "Reference month in YYYY-MM")
	flag.StringVar(&cfg.DBURL, "db-url", os.Getenv("DATABASE_URL"), "Postgres DATABASE_URL")
	flag.BoolVar(&cfg.DryRun, "dry-run", false, "Parse workbook without DB writes")
	flag.BoolVar(&cfg.UseLLM, "llm-normalize", true, "Enable OpenRouter-based neighborhood normalization fallback")
	flag.IntVar(&cfg.LLMMax, "llm-max-calls", 120, "Max LLM normalization calls per run")
	flag.StringVar(&cfg.LLMModel, "llm-model", strings.TrimSpace(os.Getenv("OPENROUTER_MODEL")), "OpenRouter model for neighborhood normalization")
	flag.Parse()

	cfg.City = strings.ToLower(strings.TrimSpace(cfg.City))
	cfg.Source = strings.TrimSpace(cfg.Source)
	cfg.FilePath = strings.TrimSpace(cfg.FilePath)
	cfg.AsOfMonth = strings.TrimSpace(cfg.AsOfMonth)
	cfg.LLMModel = strings.TrimSpace(cfg.LLMModel)

	if cfg.City != marketingest.DefaultCity {
		log.Fatalf("unsupported city %q (M16 supports only %q)", cfg.City, marketingest.DefaultCity)
	}
	if cfg.Source == "" {
		log.Fatalf("--source is required")
	}
	if cfg.FilePath == "" {
		log.Fatalf("--file is required")
	}
	if cfg.AsOfMonth == "" {
		log.Fatalf("--as-of-month is required (YYYY-MM)")
	}
	if cfg.LLMMax < 0 {
		log.Fatalf("--llm-max-calls must be >= 0")
	}
	if !cfg.DryRun && strings.TrimSpace(cfg.DBURL) == "" {
		log.Fatalf("--db-url (or DATABASE_URL) is required unless --dry-run")
	}

	return cfg
}
