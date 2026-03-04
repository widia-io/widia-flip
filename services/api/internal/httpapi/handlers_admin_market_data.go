package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/marketingest"
)

const (
	marketIngestionAllowedContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	marketIngestionMaxFileSizeBytes   = int64(100 * 1024 * 1024)
	marketIngestionPrefixSP           = "market-data/sp/raw/"
	marketIngestionDefaultLimit       = 50
	marketIngestionMaxLimit           = 200
)

var marketFilenameSanitizeRE = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

type marketIngestionUploadURLRequest struct {
	City        string `json:"city"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	SizeBytes   int64  `json:"size_bytes"`
}

type marketIngestionUploadURLResponse struct {
	UploadURL  string `json:"upload_url"`
	StorageKey string `json:"storage_key"`
	ExpiresAt  string `json:"expires_at"`
}

type runMarketIngestionRequest struct {
	City       string `json:"city"`
	AsOfMonth  string `json:"as_of_month"`
	StorageKey string `json:"storage_key"`
	Source     string `json:"source"`
	DryRun     bool   `json:"dry_run"`
}

type runMarketIngestionResponse struct {
	RunID   string `json:"run_id"`
	Status  string `json:"status"`
	PollURL string `json:"poll_url"`
}

type marketIngestionRunResponse struct {
	ID               string         `json:"id"`
	Source           string         `json:"source"`
	City             string         `json:"city"`
	AsOfMonth        string         `json:"as_of_month"`
	Status           string         `json:"status"`
	InputRows        int            `json:"input_rows"`
	ValidRows        int            `json:"valid_rows"`
	OutputGroups     int            `json:"output_groups"`
	ErrorMessage     *string        `json:"error_message"`
	StartedAt        *string        `json:"started_at"`
	FinishedAt       *string        `json:"finished_at"`
	CreatedAt        string         `json:"created_at"`
	TriggerType      string         `json:"trigger_type"`
	TriggeredBy      *string        `json:"triggered_by"`
	DryRun           bool           `json:"dry_run"`
	StorageKey       *string        `json:"storage_key"`
	OriginalFilename *string        `json:"original_filename"`
	ContentType      *string        `json:"content_type"`
	FileSizeBytes    *int64         `json:"file_size_bytes"`
	Stats            map[string]any `json:"stats"`
	Params           map[string]any `json:"params"`
}

type listMarketIngestionRunsResponse struct {
	Items []marketIngestionRunResponse `json:"items"`
	Total int                          `json:"total"`
}

type asyncMarketIngestionJob struct {
	RunID      string
	City       string
	Source     string
	AsOfMonth  time.Time
	StorageKey string
	DryRun     bool
	LockConn   *sql.Conn
}

// handleAdminMarketIngestionsSubroutes routes /api/v1/admin/market/ingestions/*
func (a *api) handleAdminMarketIngestionsSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/market/ingestions")

	switch {
	case path == "" || path == "/":
		if r.Method == http.MethodGet {
			a.handleAdminListMarketIngestionRuns(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	case path == "/upload-url":
		if r.Method == http.MethodPost {
			a.handleAdminMarketIngestionUploadURL(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	case path == "/run":
		if r.Method == http.MethodPost {
			a.handleAdminRunMarketIngestion(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	default:
		id := strings.Trim(path, "/")
		if id == "" || strings.Contains(id, "/") {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
			return
		}
		if r.Method == http.MethodGet {
			a.handleAdminGetMarketIngestionRun(w, r, id)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleAdminMarketIngestionUploadURL(w http.ResponseWriter, r *http.Request) {
	if a.s3Client == nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "STORAGE_ERROR", Message: "storage client not configured"})
		return
	}

	if _, ok := auth.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth context"})
		return
	}

	var req marketIngestionUploadURLRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	city := strings.ToLower(strings.TrimSpace(req.City))
	if city == "" {
		city = marketingest.DefaultCity
	}
	if city != marketingest.DefaultCity {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	filename := strings.TrimSpace(req.Filename)
	if filename == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "filename is required"})
		return
	}
	if req.ContentType != marketIngestionAllowedContentType {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "content_type must be xlsx"})
		return
	}
	if req.SizeBytes <= 0 || req.SizeBytes > marketIngestionMaxFileSizeBytes {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "size_bytes must be between 1 and 100MB"})
		return
	}

	now := time.Now().UTC()
	safeName := sanitizeMarketFilename(filename)
	storageKey := fmt.Sprintf("market-data/sp/raw/%s/%s/%s_%s", now.Format("2006"), now.Format("01"), now.Format("20060102T150405Z"), safeName)
	uploadURL, err := a.s3Client.GeneratePresignedUploadURL(r.Context(), storageKey, req.ContentType, 15*time.Minute)
	if err != nil {
		log.Printf("admin market upload-url: presign error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "STORAGE_ERROR", Message: "failed to generate upload URL"})
		return
	}

	writeJSON(w, http.StatusOK, marketIngestionUploadURLResponse{
		UploadURL:  uploadURL,
		StorageKey: storageKey,
		ExpiresAt:  now.Add(15 * time.Minute).Format(time.RFC3339),
	})
}

func (a *api) handleAdminRunMarketIngestion(w http.ResponseWriter, r *http.Request) {
	if a.s3Client == nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "STORAGE_ERROR", Message: "storage client not configured"})
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth context"})
		return
	}

	var req runMarketIngestionRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	city := strings.ToLower(strings.TrimSpace(req.City))
	if city == "" {
		city = marketingest.DefaultCity
	}
	if city != marketingest.DefaultCity {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	asOfMonth, err := parseMarketMonth(req.AsOfMonth)
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "as_of_month must be YYYY-MM"})
		return
	}

	source := strings.TrimSpace(req.Source)
	if source == "" {
		source = marketingest.DefaultSource
	}

	storageKey := strings.TrimSpace(req.StorageKey)
	if !isValidMarketStorageKey(storageKey) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "storage_key inválido"})
		return
	}

	lockConn, err := a.db.Conn(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to allocate db connection"})
		return
	}

	locked, err := tryAcquireMarketIngestionLock(r.Context(), lockConn, city)
	if err != nil {
		_ = lockConn.Close()
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to acquire ingestion lock"})
		return
	}
	if !locked {
		_ = lockConn.Close()
		writeError(w, http.StatusConflict, apiError{Code: "RUN_ALREADY_IN_PROGRESS", Message: "já existe ingestão em execução para esta cidade"})
		return
	}

	paramsJSON, err := json.Marshal(map[string]any{
		"city":        city,
		"as_of_month": asOfMonth.Format("2006-01"),
		"storage_key": storageKey,
		"source":      source,
		"dry_run":     req.DryRun,
	})
	if err != nil {
		a.releaseMarketIngestionLockAndClose(lockConn, city)
		writeError(w, http.StatusInternalServerError, apiError{Code: "INTERNAL_ERROR", Message: "failed to encode params"})
		return
	}

	var runID string
	err = lockConn.QueryRowContext(r.Context(), `
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
			params,
			started_at,
			created_at
		) VALUES (
			$1,$2,$3,'running','admin',$4,$5,$6,$7,$8,$9,NOW(),NOW()
		)
		RETURNING id
	`, source, city, asOfMonth, userID, req.DryRun, storageKey, filepath.Base(storageKey), marketIngestionAllowedContentType, paramsJSON).Scan(&runID)
	if err != nil {
		a.releaseMarketIngestionLockAndClose(lockConn, city)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create ingestion run"})
		return
	}

	job := asyncMarketIngestionJob{
		RunID:      runID,
		City:       city,
		Source:     source,
		AsOfMonth:  asOfMonth,
		StorageKey: storageKey,
		DryRun:     req.DryRun,
		LockConn:   lockConn,
	}
	go a.runMarketIngestionAsync(job)

	writeJSON(w, http.StatusAccepted, runMarketIngestionResponse{
		RunID:   runID,
		Status:  "running",
		PollURL: "/api/v1/admin/market/ingestions/" + runID,
	})
}

func (a *api) handleAdminListMarketIngestionRuns(w http.ResponseWriter, r *http.Request) {
	city := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("city")))
	if city == "" {
		city = marketingest.DefaultCity
	}
	if city != marketingest.DefaultCity {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	limit := marketIngestionDefaultLimit
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		value, err := parsePositiveInt(raw, marketIngestionDefaultLimit)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "limit must be positive"})
			return
		}
		if value > marketIngestionMaxLimit {
			value = marketIngestionMaxLimit
		}
		limit = value
	}

	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "offset must be non-negative"})
			return
		}
		offset = value
	}

	var total int
	if err := a.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM market_ingestion_runs WHERE city = $1`, city).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count ingestion runs"})
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT
			id,
			source,
			city,
			as_of_month,
			status,
			input_rows,
			valid_rows,
			output_groups,
			error_message,
			started_at,
			finished_at,
			created_at,
			trigger_type,
			triggered_by,
			dry_run,
			storage_key,
			original_filename,
			content_type,
			file_size_bytes,
			stats,
			params
		FROM market_ingestion_runs
		WHERE city = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, city, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list ingestion runs"})
		return
	}
	defer rows.Close()

	items := make([]marketIngestionRunResponse, 0, limit)
	for rows.Next() {
		item, scanErr := scanMarketIngestionRun(rows)
		if scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan ingestion run"})
			return
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to iterate ingestion runs"})
		return
	}

	writeJSON(w, http.StatusOK, listMarketIngestionRunsResponse{Items: items, Total: total})
}

func (a *api) handleAdminGetMarketIngestionRun(w http.ResponseWriter, r *http.Request, id string) {
	row := a.db.QueryRowContext(r.Context(), `
		SELECT
			id,
			source,
			city,
			as_of_month,
			status,
			input_rows,
			valid_rows,
			output_groups,
			error_message,
			started_at,
			finished_at,
			created_at,
			trigger_type,
			triggered_by,
			dry_run,
			storage_key,
			original_filename,
			content_type,
			file_size_bytes,
			stats,
			params
		FROM market_ingestion_runs
		WHERE id = $1
	`, id)

	item, err := scanMarketIngestionRun(row)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "ingestion run not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to load ingestion run"})
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func (a *api) runMarketIngestionAsync(job asyncMarketIngestionJob) {
	defer a.releaseMarketIngestionLockAndClose(job.LockConn, job.City)

	startedAt := time.Now().UTC()
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Minute)
	defer cancel()

	result := marketingest.RunResult{RunID: job.RunID}
	tempPath, cleanup, err := a.s3Client.DownloadToTempFile(ctx, job.StorageKey)
	if err != nil {
		a.finishMarketIngestionRun(ctx, job.RunID, startedAt, result, fmt.Errorf("download storage object: %w", err), job.DryRun)
		return
	}
	defer cleanup()

	result, err = marketingest.RunFromFile(ctx, a.db, marketingest.RunConfig{
		FilePath:               tempPath,
		City:                   job.City,
		Source:                 job.Source,
		AsOfMonth:              job.AsOfMonth,
		DryRun:                 job.DryRun,
		RunID:                  job.RunID,
		NeighborhoodNormalizer: a.llmClient,
		MaxLLMCalls:            120,
	})
	if err != nil {
		a.finishMarketIngestionRun(ctx, job.RunID, startedAt, result, err, job.DryRun)
		return
	}

	a.finishMarketIngestionRun(ctx, job.RunID, startedAt, result, nil, job.DryRun)
}

func (a *api) finishMarketIngestionRun(ctx context.Context, runID string, startedAt time.Time, result marketingest.RunResult, runErr error, dryRun bool) {
	durationMs := time.Since(startedAt).Milliseconds()
	stats := map[string]any{
		"input_rows":       result.InputRows,
		"valid_rows":       result.ValidRows,
		"output_groups":    result.OutputGroups,
		"touched_months":   result.TouchedMonths,
		"duration_ms":      durationMs,
		"llm_calls":        result.LLMCalls,
		"llm_resolved":     result.LLMResolved,
		"alias_candidates": result.AliasCandidates,
	}
	if dryRun {
		stats["preview_rows"] = result.PreviewRows
		stats["preview_count"] = len(result.PreviewRows)
	}

	status := "success"
	if runErr != nil {
		status = "failed"
	}

	if err := marketingest.FinishRun(
		ctx,
		a.db,
		runID,
		status,
		result.InputRows,
		result.ValidRows,
		result.OutputGroups,
		runErr,
		stats,
		time.Now().UTC(),
	); err != nil {
		log.Printf("market ingestion: failed to finalize run %s: %v", runID, err)
	}
}

func tryAcquireMarketIngestionLock(ctx context.Context, conn *sql.Conn, city string) (bool, error) {
	var locked bool
	err := conn.QueryRowContext(ctx, `SELECT pg_try_advisory_lock(hashtext('market_ingest'), hashtext($1))`, city).Scan(&locked)
	return locked, err
}

func (a *api) releaseMarketIngestionLockAndClose(conn *sql.Conn, city string) {
	if conn == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := conn.ExecContext(ctx, `SELECT pg_advisory_unlock(hashtext('market_ingest'), hashtext($1))`, city); err != nil {
		log.Printf("market ingestion: failed to unlock advisory lock for city=%s: %v", city, err)
	}
	if err := conn.Close(); err != nil {
		log.Printf("market ingestion: failed to close lock connection: %v", err)
	}
}

func scanMarketIngestionRun(scanner interface {
	Scan(dest ...interface{}) error
}) (marketIngestionRunResponse, error) {
	var out marketIngestionRunResponse
	var asOfMonth time.Time
	var startedAt sql.NullTime
	var finishedAt sql.NullTime
	var errorMessage sql.NullString
	var triggeredBy sql.NullString
	var storageKey sql.NullString
	var originalFilename sql.NullString
	var contentType sql.NullString
	var fileSizeBytes sql.NullInt64
	var statsRaw []byte
	var paramsRaw []byte
	var createdAt time.Time

	err := scanner.Scan(
		&out.ID,
		&out.Source,
		&out.City,
		&asOfMonth,
		&out.Status,
		&out.InputRows,
		&out.ValidRows,
		&out.OutputGroups,
		&errorMessage,
		&startedAt,
		&finishedAt,
		&createdAt,
		&out.TriggerType,
		&triggeredBy,
		&out.DryRun,
		&storageKey,
		&originalFilename,
		&contentType,
		&fileSizeBytes,
		&statsRaw,
		&paramsRaw,
	)
	if err != nil {
		return marketIngestionRunResponse{}, err
	}

	out.AsOfMonth = asOfMonth.Format("2006-01")
	out.CreatedAt = createdAt.UTC().Format(time.RFC3339)

	if errorMessage.Valid {
		value := errorMessage.String
		out.ErrorMessage = &value
	}
	if startedAt.Valid {
		value := startedAt.Time.UTC().Format(time.RFC3339)
		out.StartedAt = &value
	}
	if finishedAt.Valid {
		value := finishedAt.Time.UTC().Format(time.RFC3339)
		out.FinishedAt = &value
	}
	if triggeredBy.Valid {
		value := triggeredBy.String
		out.TriggeredBy = &value
	}
	if storageKey.Valid {
		value := storageKey.String
		out.StorageKey = &value
	}
	if originalFilename.Valid {
		value := originalFilename.String
		out.OriginalFilename = &value
	}
	if contentType.Valid {
		value := contentType.String
		out.ContentType = &value
	}
	if fileSizeBytes.Valid {
		value := fileSizeBytes.Int64
		out.FileSizeBytes = &value
	}
	if len(statsRaw) > 0 {
		_ = json.Unmarshal(statsRaw, &out.Stats)
	}
	if len(paramsRaw) > 0 {
		_ = json.Unmarshal(paramsRaw, &out.Params)
	}

	return out, nil
}

func sanitizeMarketFilename(filename string) string {
	base := filepath.Base(strings.TrimSpace(filename))
	base = transliterateToASCII(base)
	base = strings.ToLower(base)
	base = marketFilenameSanitizeRE.ReplaceAllString(base, "_")
	base = strings.Trim(base, "._-")
	if base == "" {
		base = "itbi_sp"
	}
	if !strings.HasSuffix(base, ".xlsx") {
		base = base + ".xlsx"
	}
	if len(base) > 160 {
		base = base[len(base)-160:]
	}
	return base
}

func isValidMarketStorageKey(value string) bool {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return false
	}
	if !strings.HasPrefix(trimmed, marketIngestionPrefixSP) {
		return false
	}
	if !strings.HasSuffix(strings.ToLower(trimmed), ".xlsx") {
		return false
	}
	if strings.Contains(trimmed, "..") {
		return false
	}
	return true
}
