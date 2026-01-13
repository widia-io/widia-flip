package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/storage"
)

// Timeline event type for documents
const (
	EventTypeDocUploaded = "doc_uploaded"
)

// Allowed content types for upload
var allowedContentTypes = map[string]bool{
	"application/pdf":    true,
	"image/jpeg":         true,
	"image/png":          true,
	"image/gif":          true,
	"image/webp":         true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         true,
	"application/vnd.ms-powerpoint":                                             true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
	"text/plain": true,
}

const maxFileSizeBytes = 50 * 1024 * 1024 // 50MB

// transliterateToASCII converts accented characters to ASCII equivalents
func transliterateToASCII(s string) string {
	replacements := map[rune]string{
		'á': "a", 'à': "a", 'ã': "a", 'â': "a", 'ä': "a",
		'Á': "A", 'À': "A", 'Ã': "A", 'Â': "A", 'Ä': "A",
		'é': "e", 'è': "e", 'ê': "e", 'ë': "e",
		'É': "E", 'È': "E", 'Ê': "E", 'Ë': "E",
		'í': "i", 'ì': "i", 'î': "i", 'ï': "i",
		'Í': "I", 'Ì': "I", 'Î': "I", 'Ï': "I",
		'ó': "o", 'ò': "o", 'õ': "o", 'ô': "o", 'ö': "o",
		'Ó': "O", 'Ò': "O", 'Õ': "O", 'Ô': "O", 'Ö': "O",
		'ú': "u", 'ù': "u", 'û': "u", 'ü': "u",
		'Ú': "U", 'Ù': "U", 'Û': "U", 'Ü': "U",
		'ç': "c", 'Ç': "C",
		'ñ': "n", 'Ñ': "N",
		'ý': "y", 'ÿ': "y", 'Ý': "Y",
	}
	var result strings.Builder
	for _, r := range s {
		if rep, ok := replacements[r]; ok {
			result.WriteString(rep)
		} else {
			result.WriteRune(r)
		}
	}
	return result.String()
}

type document struct {
	ID              string    `json:"id"`
	WorkspaceID     string    `json:"workspace_id"`
	PropertyID      *string   `json:"property_id"`
	CostItemID      *string   `json:"cost_item_id"`
	SupplierID      *string   `json:"supplier_id"`
	StorageKey      string    `json:"storage_key"`
	StorageProvider string    `json:"storage_provider"`
	Filename        string    `json:"filename"`
	ContentType     *string   `json:"content_type"`
	SizeBytes       *int64    `json:"size_bytes"`
	Tags            []string  `json:"tags"`
	CreatedAt       time.Time `json:"created_at"`
}

type getUploadURLRequest struct {
	WorkspaceID string  `json:"workspace_id"`
	PropertyID  *string `json:"property_id"`
	Filename    string  `json:"filename"`
	ContentType string  `json:"content_type"`
	SizeBytes   int64   `json:"size_bytes"`
}

type getUploadURLResponse struct {
	UploadURL  string `json:"upload_url"`
	StorageKey string `json:"storage_key"`
}

type registerDocumentRequest struct {
	WorkspaceID string   `json:"workspace_id"`
	PropertyID  *string  `json:"property_id"`
	CostItemID  *string  `json:"cost_item_id"`
	SupplierID  *string  `json:"supplier_id"`
	StorageKey  string   `json:"storage_key"`
	Filename    string   `json:"filename"`
	ContentType *string  `json:"content_type"`
	SizeBytes   *int64   `json:"size_bytes"`
	Tags        []string `json:"tags"`
}

type listDocumentsResponse struct {
	Items []document `json:"items"`
}

// handleDocumentsCollection routes /api/v1/documents
func (a *api) handleDocumentsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		a.handleRegisterDocument(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// handleDocumentsSubroutes routes /api/v1/documents/...
func (a *api) handleDocumentsSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/documents/")
	parts := strings.Split(rest, "/")

	// /api/v1/documents/upload-url
	if len(parts) == 1 && parts[0] == "upload-url" {
		if r.Method == http.MethodPost {
			a.handleGetUploadURL(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// /api/v1/documents/:docId
	if len(parts) == 1 {
		docID := strings.TrimSpace(parts[0])
		if docID == "" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.Method == http.MethodDelete {
			a.handleDeleteDocument(w, r, docID)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

// handlePropertyDocuments routes /api/v1/properties/:id/documents
func (a *api) handlePropertyDocuments(w http.ResponseWriter, r *http.Request, propertyID string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	a.handleListDocuments(w, r, propertyID)
}

func (a *api) handleGetUploadURL(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req getUploadURLRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if req.WorkspaceID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "workspace_id is required"})
		return
	}
	if req.Filename == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "filename is required"})
		return
	}
	if req.ContentType == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "content_type is required"})
		return
	}
	if !allowedContentTypes[req.ContentType] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "content_type not allowed"})
		return
	}
	if req.SizeBytes <= 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "size_bytes must be > 0"})
		return
	}
	if req.SizeBytes > maxFileSizeBytes {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "file size exceeds 50MB limit"})
		return
	}

	// Check workspace access
	var dummy string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT workspace_id FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`,
		req.WorkspaceID, userID,
	).Scan(&dummy)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "access denied to workspace"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check workspace access"})
		return
	}

	// M12 - Enforce storage limit before generating upload URL
	requestID := r.Header.Get("X-Request-ID")
	if !a.enforceStorageLimit(w, r, userID, req.WorkspaceID, req.SizeBytes, requestID) {
		return
	}

	// If property_id provided, verify it belongs to workspace
	if req.PropertyID != nil && *req.PropertyID != "" {
		var propWorkspaceID string
		err := a.db.QueryRowContext(
			r.Context(),
			`SELECT workspace_id FROM properties WHERE id = $1`,
			*req.PropertyID,
		).Scan(&propWorkspaceID)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "property not found"})
				return
			}
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
			return
		}
		if propWorkspaceID != req.WorkspaceID {
			writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "property does not belong to workspace"})
			return
		}
	}

	// Generate storage key
	propertyPart := "_general"
	if req.PropertyID != nil && *req.PropertyID != "" {
		propertyPart = *req.PropertyID
	}
	fileUUID := uuid.New().String()
	// Sanitize filename - remove/replace problematic characters
	safeFilename := req.Filename
	// Transliterate Portuguese/accented characters to ASCII
	safeFilename = transliterateToASCII(safeFilename)
	// Replace path separators
	safeFilename = strings.ReplaceAll(safeFilename, "/", "_")
	safeFilename = strings.ReplaceAll(safeFilename, "\\", "_")
	// Replace URL-problematic characters
	safeFilename = strings.ReplaceAll(safeFilename, "#", "_")
	safeFilename = strings.ReplaceAll(safeFilename, "?", "_")
	safeFilename = strings.ReplaceAll(safeFilename, "&", "_")
	// Replace multiple spaces/underscores with single
	spaceRegex := regexp.MustCompile(`[\s_]+`)
	safeFilename = spaceRegex.ReplaceAllString(safeFilename, "_")
	// Remove any remaining non-ASCII characters
	asciiRegex := regexp.MustCompile(`[^\x00-\x7F]+`)
	safeFilename = asciiRegex.ReplaceAllString(safeFilename, "")
	// Trim leading/trailing underscores
	safeFilename = strings.Trim(safeFilename, "_")
	if safeFilename == "" {
		safeFilename = "document"
	}
	storageKey := fmt.Sprintf("workspaces/%s/properties/%s/docs/%s-%s", req.WorkspaceID, propertyPart, fileUUID, safeFilename)

	// Generate presigned URL
	if a.s3Client == nil {
		writeError(w, http.StatusServiceUnavailable, apiError{Code: "STORAGE_ERROR", Message: "storage not configured"})
		return
	}

	uploadURL, err := a.s3Client.GeneratePresignedUploadURL(r.Context(), storageKey, req.ContentType, 15*time.Minute)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "STORAGE_ERROR", Message: "failed to generate upload URL", Details: []string{err.Error()}})
		return
	}

	writeJSON(w, http.StatusOK, getUploadURLResponse{
		UploadURL:  uploadURL,
		StorageKey: storageKey,
	})
}

func (a *api) handleRegisterDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req registerDocumentRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if req.WorkspaceID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "workspace_id is required"})
		return
	}
	if req.StorageKey == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "storage_key is required"})
		return
	}
	if req.Filename == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "filename is required"})
		return
	}

	// Check workspace access
	var dummy string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT workspace_id FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`,
		req.WorkspaceID, userID,
	).Scan(&dummy)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "access denied to workspace"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check workspace access"})
		return
	}

	// M12 - Enforce document creation limit
	requestID := r.Header.Get("X-Request-ID")
	if !a.enforceDocumentCreation(w, r, userID, req.WorkspaceID, requestID) {
		return
	}

	// Verify storage_key is scoped to workspace
	expectedPrefix := fmt.Sprintf("workspaces/%s/", req.WorkspaceID)
	if !strings.HasPrefix(req.StorageKey, expectedPrefix) {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "storage_key must be scoped to workspace"})
		return
	}

	// If property_id provided, verify it belongs to workspace
	if req.PropertyID != nil && *req.PropertyID != "" {
		var propWorkspaceID string
		err := a.db.QueryRowContext(
			r.Context(),
			`SELECT workspace_id FROM properties WHERE id = $1`,
			*req.PropertyID,
		).Scan(&propWorkspaceID)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "property not found"})
				return
			}
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
			return
		}
		if propWorkspaceID != req.WorkspaceID {
			writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "property does not belong to workspace"})
			return
		}
	}

	// If cost_item_id provided, verify it belongs to workspace
	if req.CostItemID != nil && *req.CostItemID != "" {
		var costWorkspaceID string
		err := a.db.QueryRowContext(
			r.Context(),
			`SELECT workspace_id FROM cost_items WHERE id = $1`,
			*req.CostItemID,
		).Scan(&costWorkspaceID)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "cost_item not found"})
				return
			}
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check cost_item"})
			return
		}
		if costWorkspaceID != req.WorkspaceID {
			writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "cost_item does not belong to workspace"})
			return
		}
	}

	// If supplier_id provided, verify it belongs to workspace
	if req.SupplierID != nil && *req.SupplierID != "" {
		var supplierWorkspaceID string
		err := a.db.QueryRowContext(
			r.Context(),
			`SELECT workspace_id FROM suppliers WHERE id = $1`,
			*req.SupplierID,
		).Scan(&supplierWorkspaceID)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "supplier not found"})
				return
			}
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check supplier"})
			return
		}
		if supplierWorkspaceID != req.WorkspaceID {
			writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "supplier does not belong to workspace"})
			return
		}
	}

	// Insert document
	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}

	var doc document
	var tagsArr pq.StringArray
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO documents (workspace_id, property_id, cost_item_id, supplier_id, storage_key, storage_provider, filename, content_type, size_bytes, tags)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, workspace_id, property_id, cost_item_id, supplier_id, storage_key, storage_provider, filename, content_type, size_bytes, tags, created_at`,
		req.WorkspaceID, req.PropertyID, req.CostItemID, req.SupplierID, req.StorageKey, a.storageProvider, req.Filename, req.ContentType, req.SizeBytes, pq.Array(tags),
	).Scan(&doc.ID, &doc.WorkspaceID, &doc.PropertyID, &doc.CostItemID, &doc.SupplierID, &doc.StorageKey, &doc.StorageProvider, &doc.Filename, &doc.ContentType, &doc.SizeBytes, &tagsArr, &doc.CreatedAt)
	doc.Tags = tagsArr
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			writeError(w, http.StatusConflict, apiError{Code: "DUPLICATE_DOCUMENT", Message: "document with this storage_key already exists"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create document", Details: []string{err.Error()}})
		return
	}

	// M12 - Increment workspace storage usage
	if req.SizeBytes != nil && *req.SizeBytes > 0 {
		_, err = a.db.ExecContext(
			r.Context(),
			`UPDATE workspaces SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + $1 WHERE id = $2`,
			*req.SizeBytes, req.WorkspaceID,
		)
		if err != nil {
			// Log but don't fail - document is already created
			// Storage tracking is observability, not critical path
		}
	}

	// Create timeline event if linked to a property
	if req.PropertyID != nil && *req.PropertyID != "" {
		a.createTimelineEvent(r.Context(), *req.PropertyID, req.WorkspaceID, EventTypeDocUploaded, map[string]any{
			"doc_id":   doc.ID,
			"filename": doc.Filename,
		}, userID)
	}

	writeJSON(w, http.StatusCreated, doc)
}

func (a *api) handleListDocuments(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT id, workspace_id, property_id, cost_item_id, storage_key, storage_provider, filename, content_type, size_bytes, tags, created_at
		 FROM documents
		 WHERE property_id = $1
		 ORDER BY created_at DESC`,
		propertyID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query documents"})
		return
	}
	defer rows.Close()

	items := make([]document, 0)
	for rows.Next() {
		var doc document
		var tagsArr pq.StringArray
		err := rows.Scan(&doc.ID, &doc.WorkspaceID, &doc.PropertyID, &doc.CostItemID, &doc.StorageKey, &doc.StorageProvider, &doc.Filename, &doc.ContentType, &doc.SizeBytes, &tagsArr, &doc.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan document"})
			return
		}
		doc.Tags = tagsArr
		items = append(items, doc)
	}

	writeJSON(w, http.StatusOK, listDocumentsResponse{Items: items})
}

func (a *api) handleDeleteDocument(w http.ResponseWriter, r *http.Request, docID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access via document and get size for storage tracking
	var workspaceID string
	var sizeBytes sql.NullInt64
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT d.workspace_id, d.size_bytes
		 FROM documents d
		 JOIN workspace_memberships m ON m.workspace_id = d.workspace_id
		 WHERE d.id = $1 AND m.user_id = $2`,
		docID, userID,
	).Scan(&workspaceID, &sizeBytes)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "document not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check document"})
		return
	}

	// Delete document record (keep file in storage for now - MVP decision)
	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM documents WHERE id = $1`,
		docID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete document"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "document not found"})
		return
	}

	// M12 - Decrement workspace storage usage
	if sizeBytes.Valid && sizeBytes.Int64 > 0 {
		_, _ = a.db.ExecContext(
			r.Context(),
			`UPDATE workspaces SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) - $1) WHERE id = $2`,
			sizeBytes.Int64, workspaceID,
		)
		// Ignore error - storage tracking is observability, not critical path
	}

	w.WriteHeader(http.StatusNoContent)
}

// SetS3Client is called by the API struct to set the S3 client
func (a *api) SetS3Client(client *storage.S3Client) {
	a.s3Client = client
}
