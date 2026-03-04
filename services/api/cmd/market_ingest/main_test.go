package main

import (
	"flag"
	"os"
	"testing"
)

func withArgsAndFlagSet(t *testing.T, args []string, fn func()) {
	t.Helper()

	oldArgs := os.Args
	oldCommandLine := flag.CommandLine
	t.Cleanup(func() {
		os.Args = oldArgs
		flag.CommandLine = oldCommandLine
	})

	os.Args = args
	flag.CommandLine = flag.NewFlagSet(args[0], flag.ExitOnError)
	fn()
}

func TestParseFlagsNormalizesValues(t *testing.T) {
	withArgsAndFlagSet(t, []string{
		"market_ingest.test",
		"--file= /tmp/input.xlsx ",
		"--city=SP",
		"--source= itbi_sp ",
		"--as-of-month=2025-12",
		"--dry-run=true",
		"--llm-max-calls=7",
		"--llm-model= openrouter/model ",
	}, func() {
		cfg := parseFlags()
		if cfg.FilePath != "/tmp/input.xlsx" {
			t.Fatalf("file=%q want=/tmp/input.xlsx", cfg.FilePath)
		}
		if cfg.City != "sp" {
			t.Fatalf("city=%q want=sp", cfg.City)
		}
		if cfg.Source != "itbi_sp" {
			t.Fatalf("source=%q want=itbi_sp", cfg.Source)
		}
		if cfg.AsOfMonth != "2025-12" {
			t.Fatalf("as_of_month=%q want=2025-12", cfg.AsOfMonth)
		}
		if !cfg.DryRun {
			t.Fatalf("dry_run=%v want=true", cfg.DryRun)
		}
		if cfg.LLMMax != 7 {
			t.Fatalf("llm_max_calls=%d want=7", cfg.LLMMax)
		}
		if cfg.LLMModel != "openrouter/model" {
			t.Fatalf("llm_model=%q want=openrouter/model", cfg.LLMModel)
		}
	})
}

func TestParseFlagsDryRunAllowsMissingDBURL(t *testing.T) {
	withArgsAndFlagSet(t, []string{
		"market_ingest.test",
		"--file=/tmp/input.xlsx",
		"--city=sp",
		"--source=itbi_sp",
		"--as-of-month=2025-12",
		"--dry-run=true",
	}, func() {
		cfg := parseFlags()
		if cfg.DBURL != "" {
			t.Fatalf("db_url=%q want empty for dry-run", cfg.DBURL)
		}
	})
}
