package marketingest

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type RunConfig struct {
	FilePath               string
	City                   string
	Source                 string
	AsOfMonth              time.Time
	DryRun                 bool
	RunID                  string
	NeighborhoodNormalizer NeighborhoodNormalizer
	MaxLLMCalls            int
	ApprovedAliases        map[string]string
}

type RunResult struct {
	RunID           string
	InputRows       int
	ValidRows       int
	OutputGroups    int
	TouchedMonths   []string
	PreviewRows     []PreviewRow
	LLMCalls        int
	LLMResolved     int
	AliasCandidates int
}

type PreviewRow struct {
	Month            string  `json:"month"`
	RegionName       string  `json:"region_name"`
	PropertyClass    string  `json:"property_class"`
	TransactionDate  *string `json:"transaction_date,omitempty"`
	TransactionValue float64 `json:"transaction_value"`
	AreaM2           float64 `json:"area_m2"`
	PriceM2          float64 `json:"price_m2"`
	SQLRegistration  string  `json:"sql_registration,omitempty"`
}

type RunMetadata struct {
	TriggerType      string
	TriggeredBy      *string
	DryRun           bool
	StorageKey       *string
	OriginalFilename *string
	ContentType      *string
	FileSizeBytes    *int64
	Params           map[string]any
}

func RunFromFile(ctx context.Context, db *sql.DB, cfg RunConfig) (RunResult, error) {
	approvedAliases := make(map[string]string, len(cfg.ApprovedAliases))
	for alias, canonical := range cfg.ApprovedAliases {
		aliasKey := NormalizeNeighborhoodKey(alias)
		canonicalName := CanonicalNeighborhoodFromGolden(canonical)
		if canonicalName == "" {
			canonicalName = NormalizeNeighborhoodKey(canonical)
		}
		if aliasKey == "" || canonicalName == "" {
			continue
		}
		approvedAliases[aliasKey] = canonicalName
	}

	if db != nil {
		storedAliases, loadErr := LoadApprovedAliases(ctx, db, cfg.City)
		if loadErr != nil {
			return RunResult{}, fmt.Errorf("load approved aliases: %w", loadErr)
		}
		for alias, canonical := range storedAliases {
			approvedAliases[alias] = canonical
		}
	}

	parsed, err := ParseWorkbook(ctx, ParseConfig{
		FilePath:               cfg.FilePath,
		City:                   cfg.City,
		Source:                 cfg.Source,
		NeighborhoodNormalizer: cfg.NeighborhoodNormalizer,
		MaxLLMCalls:            cfg.MaxLLMCalls,
		ApprovedAliases:        approvedAliases,
	}, cfg.AsOfMonth)
	if err != nil {
		return RunResult{}, err
	}

	result := RunResult{
		RunID:           cfg.RunID,
		InputRows:       parsed.InputRows,
		ValidRows:       parsed.ValidRows,
		TouchedMonths:   make([]string, 0, len(parsed.TouchedMonths)),
		LLMCalls:        parsed.LLMCalls,
		LLMResolved:     parsed.LLMResolved,
		AliasCandidates: len(parsed.AliasCandidates),
	}
	for _, month := range parsed.TouchedMonths {
		result.TouchedMonths = append(result.TouchedMonths, month.Format("2006-01"))
	}
	result.PreviewRows = buildPreviewRows(parsed.Records, 10)

	if db != nil && len(parsed.AliasCandidates) > 0 {
		if persistErr := PersistAliasCandidates(ctx, db, cfg.City, parsed.AliasCandidates); persistErr != nil {
			return result, fmt.Errorf("persist alias candidates: %w", persistErr)
		}
	}

	if cfg.DryRun {
		return result, nil
	}

	if db == nil {
		return result, fmt.Errorf("db is required when dry_run is false")
	}

	ownedRun := false
	runID := stringsTrim(result.RunID)
	if runID == "" {
		newRunID, runErr := StartRun(ctx, db, cfg.Source, cfg.City, cfg.AsOfMonth, &RunMetadata{TriggerType: "cli", DryRun: false})
		if runErr != nil {
			return result, runErr
		}
		runID = newRunID
		result.RunID = runID
		ownedRun = true
	}

	outputGroups, ingestErr := IngestParsed(ctx, db, runID, ParseConfig{City: cfg.City, Source: cfg.Source, FilePath: cfg.FilePath}, cfg.AsOfMonth, parsed)
	if ingestErr != nil {
		if ownedRun {
			_ = FinishRun(ctx, db, runID, "failed", result.InputRows, result.ValidRows, 0, ingestErr, map[string]any{
				"input_rows":       result.InputRows,
				"valid_rows":       result.ValidRows,
				"output_groups":    0,
				"touched_months":   result.TouchedMonths,
				"llm_calls":        result.LLMCalls,
				"llm_resolved":     result.LLMResolved,
				"alias_candidates": result.AliasCandidates,
			}, time.Now().UTC())
		}
		return result, ingestErr
	}

	result.OutputGroups = outputGroups
	if ownedRun {
		_ = FinishRun(ctx, db, runID, "success", result.InputRows, result.ValidRows, result.OutputGroups, nil, map[string]any{
			"input_rows":       result.InputRows,
			"valid_rows":       result.ValidRows,
			"output_groups":    result.OutputGroups,
			"touched_months":   result.TouchedMonths,
			"llm_calls":        result.LLMCalls,
			"llm_resolved":     result.LLMResolved,
			"alias_candidates": result.AliasCandidates,
		}, time.Now().UTC())
	}

	return result, nil
}

func StartRun(ctx context.Context, db *sql.DB, source, city string, asOfMonth time.Time, meta *RunMetadata) (string, error) {
	if db == nil {
		return "", fmt.Errorf("db is required")
	}

	triggerType := "admin"
	var triggeredBy any
	dryRun := false
	var storageKey any
	var originalFilename any
	var contentType any
	var fileSizeBytes any
	var paramsJSON any

	if meta != nil {
		if stringsTrim(meta.TriggerType) != "" {
			triggerType = stringsTrim(meta.TriggerType)
		}
		dryRun = meta.DryRun
		if meta.TriggeredBy != nil && stringsTrim(*meta.TriggeredBy) != "" {
			triggeredBy = stringsTrim(*meta.TriggeredBy)
		}
		if meta.StorageKey != nil && stringsTrim(*meta.StorageKey) != "" {
			storageKey = stringsTrim(*meta.StorageKey)
		}
		if meta.OriginalFilename != nil && stringsTrim(*meta.OriginalFilename) != "" {
			originalFilename = stringsTrim(*meta.OriginalFilename)
		}
		if meta.ContentType != nil && stringsTrim(*meta.ContentType) != "" {
			contentType = stringsTrim(*meta.ContentType)
		}
		if meta.FileSizeBytes != nil {
			fileSizeBytes = *meta.FileSizeBytes
		}
		if meta.Params != nil {
			encoded, err := json.Marshal(meta.Params)
			if err != nil {
				return "", fmt.Errorf("marshal run params: %w", err)
			}
			paramsJSON = encoded
		}
	}

	var runID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO market_ingestion_runs (
			source,
			city,
			as_of_month,
			status,
			trigger_type,
			triggered_by,
			dry_run,
			storage_key,
			original_filename,
			content_type,
			file_size_bytes,
			params,
			started_at,
			created_at
		) VALUES (
			$1,$2,$3,'running',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()
		)
		RETURNING id
	`, source, city, asOfMonth, triggerType, triggeredBy, dryRun, storageKey, originalFilename, contentType, fileSizeBytes, paramsJSON).Scan(&runID)
	if err != nil {
		return "", err
	}
	return runID, nil
}

func FinishRun(
	ctx context.Context,
	db *sql.DB,
	runID string,
	status string,
	inputRows int,
	validRows int,
	outputGroups int,
	runErr error,
	stats map[string]any,
	finishedAt time.Time,
) error {
	if db == nil {
		return fmt.Errorf("db is required")
	}

	if finishedAt.IsZero() {
		finishedAt = time.Now().UTC()
	}

	var errMessage any
	if runErr != nil {
		errMessage = runErr.Error()
	}

	var statsJSON any
	if stats != nil {
		encoded, err := json.Marshal(stats)
		if err != nil {
			return fmt.Errorf("marshal run stats: %w", err)
		}
		statsJSON = encoded
	}

	_, err := db.ExecContext(ctx, `
		UPDATE market_ingestion_runs
		SET status = $2,
			input_rows = $3,
			valid_rows = $4,
			output_groups = $5,
			error_message = $6,
			stats = $7,
			finished_at = $8
		WHERE id = $1
	`, runID, status, inputRows, validRows, outputGroups, errMessage, statsJSON, finishedAt)
	return err
}

func stringsTrim(value string) string {
	return strings.TrimSpace(value)
}

func buildPreviewRows(records []TxRecord, limit int) []PreviewRow {
	if limit <= 0 || len(records) == 0 {
		return nil
	}

	out := make([]PreviewRow, 0, limit)
	for _, rec := range records {
		if len(out) >= limit {
			break
		}

		var transactionDate *string
		if rec.TransactionDate.Valid {
			formatted := rec.TransactionDate.Time.UTC().Format("2006-01-02")
			transactionDate = &formatted
		}

		out = append(out, PreviewRow{
			Month:            rec.Month.Format("2006-01"),
			RegionName:       rec.RegionNormalized,
			PropertyClass:    rec.PropertyClass,
			TransactionDate:  transactionDate,
			TransactionValue: round2(rec.TransactionValue),
			AreaM2:           round2(rec.AreaM2),
			PriceM2:          round2(rec.PriceM2),
			SQLRegistration:  rec.SQLRegistration,
		})
	}

	return out
}
