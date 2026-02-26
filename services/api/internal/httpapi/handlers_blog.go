package httpapi

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

var blogSlugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type blogPostStatus string

const (
	blogStatusDraft     blogPostStatus = "draft"
	blogStatusPublished blogPostStatus = "published"
	blogStatusArchived  blogPostStatus = "archived"
)

type blogPost struct {
	ID             string   `json:"id"`
	Slug           string   `json:"slug"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	ContentMD      string   `json:"contentMd"`
	Excerpt        *string  `json:"excerpt"`
	AuthorName     string   `json:"authorName"`
	Tags           []string `json:"tags"`
	CoverImageURL  *string  `json:"coverImageUrl"`
	CanonicalPath  *string  `json:"canonicalPath"`
	SeoTitle       *string  `json:"seoTitle"`
	SeoDescription *string  `json:"seoDescription"`
	Status         string   `json:"status"`
	PublishedAt    *string  `json:"publishedAt"`
	CreatedByUser  string   `json:"createdByUserId"`
	UpdatedByUser  string   `json:"updatedByUserId"`
	CreatedAt      string   `json:"createdAt"`
	UpdatedAt      string   `json:"updatedAt"`
}

type publicBlogPostSummary struct {
	Slug          string   `json:"slug"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	Excerpt       *string  `json:"excerpt"`
	AuthorName    string   `json:"authorName"`
	Tags          []string `json:"tags"`
	CoverImageURL *string  `json:"coverImageUrl"`
	CanonicalPath *string  `json:"canonicalPath"`
	PublishedAt   string   `json:"publishedAt"`
	UpdatedAt     *string  `json:"updatedAt"`
}

type publicBlogPostDetail struct {
	publicBlogPostSummary
	ContentMD      string  `json:"contentMd"`
	SeoTitle       *string `json:"seoTitle"`
	SeoDescription *string `json:"seoDescription"`
}

type listAdminBlogPostsResponse struct {
	Items      []blogPost `json:"items"`
	NextCursor *string    `json:"next_cursor,omitempty"`
}

type listPublicBlogPostsResponse struct {
	Items      []publicBlogPostSummary `json:"items"`
	NextCursor *string                 `json:"next_cursor,omitempty"`
}

type createBlogPostRequest struct {
	Slug           string   `json:"slug"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	ContentMD      string   `json:"contentMd"`
	Excerpt        *string  `json:"excerpt"`
	AuthorName     string   `json:"authorName"`
	Tags           []string `json:"tags"`
	CoverImageURL  *string  `json:"coverImageUrl"`
	CanonicalPath  *string  `json:"canonicalPath"`
	SeoTitle       *string  `json:"seoTitle"`
	SeoDescription *string  `json:"seoDescription"`
}

type updateBlogPostRequest struct {
	Slug           *string  `json:"slug"`
	Title          *string  `json:"title"`
	Description    *string  `json:"description"`
	ContentMD      *string  `json:"contentMd"`
	Excerpt        *string  `json:"excerpt"`
	AuthorName     *string  `json:"authorName"`
	Tags           []string `json:"tags"`
	CoverImageURL  *string  `json:"coverImageUrl"`
	CanonicalPath  *string  `json:"canonicalPath"`
	SeoTitle       *string  `json:"seoTitle"`
	SeoDescription *string  `json:"seoDescription"`
}

func (a *api) handleAdminBlogPostsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleAdminListBlogPosts(w, r)
	case http.MethodPost:
		a.handleAdminCreateBlogPost(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleAdminBlogPostsSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/blog/posts/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	postID := strings.TrimSpace(parts[0])
	if postID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			a.handleAdminGetBlogPost(w, r, postID)
		case http.MethodPut:
			a.handleAdminUpdateBlogPost(w, r, postID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	if len(parts) == 2 && r.Method == http.MethodPost {
		switch parts[1] {
		case "publish":
			a.handleAdminPublishBlogPost(w, r, postID)
			return
		case "unpublish":
			a.handleAdminUnpublishBlogPost(w, r, postID)
			return
		case "archive":
			a.handleAdminArchiveBlogPost(w, r, postID)
			return
		default:
			w.WriteHeader(http.StatusNotFound)
			return
		}
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (a *api) handlePublicBlogPostsCollection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	limit := parseBlogLimit(r.URL.Query().Get("limit"), 20, 100)
	cursor := strings.TrimSpace(r.URL.Query().Get("cursor"))

	query := `
		SELECT id, slug, title, description, excerpt, author_name, tags, cover_image_url,
		       canonical_path, published_at, updated_at
		FROM flip.blog_posts
		WHERE status = 'published'
	`
	args := make([]any, 0, 4)
	argIdx := 1

	if cursor != "" {
		cursorAt, cursorID, err := parseBlogCursor(cursor)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{
				Code:    "VALIDATION_ERROR",
				Message: "invalid cursor",
				Details: []string{err.Error()},
			})
			return
		}

		query += ` AND (published_at, id) < ($` + strconv.Itoa(argIdx) + `, $` + strconv.Itoa(argIdx+1) + `)`
		args = append(args, cursorAt, cursorID)
		argIdx += 2
	}

	query += ` ORDER BY published_at DESC, id DESC LIMIT $` + strconv.Itoa(argIdx)
	args = append(args, limit+1)

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("public blog list: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to fetch blog posts",
		})
		return
	}
	defer rows.Close()

	items := make([]publicBlogPostSummary, 0, limit+1)
	ids := make([]string, 0, limit+1)
	publishedTimes := make([]time.Time, 0, limit+1)
	for rows.Next() {
		var rowID string
		var item publicBlogPostSummary
		var publishedAt time.Time
		var updatedAt time.Time
		err := rows.Scan(
			&rowID,
			&item.Slug,
			&item.Title,
			&item.Description,
			&item.Excerpt,
			&item.AuthorName,
			pq.Array(&item.Tags),
			&item.CoverImageURL,
			&item.CanonicalPath,
			&publishedAt,
			&updatedAt,
		)
		if err != nil {
			log.Printf("public blog list: scan error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{
				Code:    "DB_ERROR",
				Message: "failed to parse blog posts",
			})
			return
		}

		publishedAtStr := publishedAt.UTC().Format(time.RFC3339)
		updatedAtStr := updatedAt.UTC().Format(time.RFC3339)
		item.PublishedAt = publishedAtStr
		item.UpdatedAt = &updatedAtStr

		items = append(items, item)
		ids = append(ids, rowID)
		publishedTimes = append(publishedTimes, publishedAt)
	}

	var nextCursor *string
	if len(items) > limit {
		items = items[:limit]
		lastPublishedAt := publishedTimes[limit-1]
		lastSlug := ids[limit-1]
		c := buildBlogCursor(lastPublishedAt, lastSlug)
		nextCursor = &c
	}

	writeJSON(w, http.StatusOK, listPublicBlogPostsResponse{
		Items:      items,
		NextCursor: nextCursor,
	})
}

func (a *api) handlePublicBlogPostsSubroutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	slug := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/public/blog/posts/"))
	slug = strings.Trim(slug, "/")
	if slug == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	var item publicBlogPostDetail
	var publishedAt, updatedAt time.Time
	err := a.db.QueryRowContext(r.Context(), `
		SELECT slug, title, description, excerpt, author_name, tags, cover_image_url,
		       canonical_path, published_at, updated_at, content_md, seo_title, seo_description
		FROM flip.blog_posts
		WHERE slug = $1 AND status = 'published'
	`, slug).Scan(
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.Excerpt,
		&item.AuthorName,
		pq.Array(&item.Tags),
		&item.CoverImageURL,
		&item.CanonicalPath,
		&publishedAt,
		&updatedAt,
		&item.ContentMD,
		&item.SeoTitle,
		&item.SeoDescription,
	)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "blog post not found"})
		return
	}
	if err != nil {
		log.Printf("public blog detail: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to fetch blog post",
		})
		return
	}

	item.PublishedAt = publishedAt.UTC().Format(time.RFC3339)
	updatedAtStr := updatedAt.UTC().Format(time.RFC3339)
	item.UpdatedAt = &updatedAtStr

	writeJSON(w, http.StatusOK, item)
}

func (a *api) handleAdminListBlogPosts(w http.ResponseWriter, r *http.Request) {
	limit := parseBlogLimit(r.URL.Query().Get("limit"), 30, 100)
	cursor := strings.TrimSpace(r.URL.Query().Get("cursor"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	if status != "" && !isValidBlogStatus(status) {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "invalid status filter",
		})
		return
	}

	query := `
		SELECT id, slug, title, description, content_md, excerpt, author_name, tags,
		       cover_image_url, canonical_path, seo_title, seo_description, status,
		       published_at, created_by_user_id, updated_by_user_id, created_at, updated_at
		FROM flip.blog_posts
		WHERE 1 = 1
	`
	args := make([]any, 0, 8)
	argIdx := 1

	if status != "" {
		query += ` AND status = $` + strconv.Itoa(argIdx)
		args = append(args, status)
		argIdx++
	}

	if q != "" {
		query += ` AND (slug ILIKE $` + strconv.Itoa(argIdx) + ` OR title ILIKE $` + strconv.Itoa(argIdx+1) + `)`
		search := "%" + q + "%"
		args = append(args, search, search)
		argIdx += 2
	}

	if cursor != "" {
		cursorAt, cursorID, err := parseBlogCursor(cursor)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{
				Code:    "VALIDATION_ERROR",
				Message: "invalid cursor",
				Details: []string{err.Error()},
			})
			return
		}

		query += ` AND (updated_at, id) < ($` + strconv.Itoa(argIdx) + `, $` + strconv.Itoa(argIdx+1) + `)`
		args = append(args, cursorAt, cursorID)
		argIdx += 2
	}

	query += ` ORDER BY updated_at DESC, id DESC LIMIT $` + strconv.Itoa(argIdx)
	args = append(args, limit+1)

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("admin blog list: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to fetch blog posts",
		})
		return
	}
	defer rows.Close()

	items := make([]blogPost, 0, limit+1)
	updatedTimes := make([]time.Time, 0, limit+1)
	ids := make([]string, 0, limit+1)

	for rows.Next() {
		item, publishedAt, createdAt, updatedAt, err := scanBlogPost(rows)
		if err != nil {
			log.Printf("admin blog list: scan error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{
				Code:    "DB_ERROR",
				Message: "failed to parse blog posts",
			})
			return
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		if publishedAt.Valid {
			p := publishedAt.Time.UTC().Format(time.RFC3339)
			item.PublishedAt = &p
		}

		items = append(items, item)
		updatedTimes = append(updatedTimes, updatedAt)
		ids = append(ids, item.ID)
	}

	var nextCursor *string
	if len(items) > limit {
		items = items[:limit]
		lastUpdated := updatedTimes[limit-1]
		lastID := ids[limit-1]
		c := buildBlogCursor(lastUpdated, lastID)
		nextCursor = &c
	}

	writeJSON(w, http.StatusOK, listAdminBlogPostsResponse{
		Items:      items,
		NextCursor: nextCursor,
	})
}

func (a *api) handleAdminCreateBlogPost(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createBlogPostRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "invalid json body",
			Details: []string{err.Error()},
		})
		return
	}

	normalized, valErr := normalizeCreateBlogPostRequest(req)
	if valErr != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: valErr.Error()})
		return
	}

	var item blogPost
	var publishedAt sql.NullTime
	var createdAt, updatedAt time.Time
	err := a.db.QueryRowContext(r.Context(), `
		INSERT INTO flip.blog_posts (
			slug, title, description, content_md, excerpt, author_name, tags,
			cover_image_url, canonical_path, seo_title, seo_description, status,
			created_by_user_id, updated_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13)
		RETURNING id, slug, title, description, content_md, excerpt, author_name, tags,
		          cover_image_url, canonical_path, seo_title, seo_description, status,
		          published_at, created_by_user_id, updated_by_user_id, created_at, updated_at
	`,
		normalized.Slug,
		normalized.Title,
		normalized.Description,
		normalized.ContentMD,
		normalized.Excerpt,
		normalized.AuthorName,
		pq.Array(normalized.Tags),
		normalized.CoverImageURL,
		normalized.CanonicalPath,
		normalized.SeoTitle,
		normalized.SeoDescription,
		userID,
		userID,
	).Scan(
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.ContentMD,
		&item.Excerpt,
		&item.AuthorName,
		pq.Array(&item.Tags),
		&item.CoverImageURL,
		&item.CanonicalPath,
		&item.SeoTitle,
		&item.SeoDescription,
		&item.Status,
		&publishedAt,
		&item.CreatedByUser,
		&item.UpdatedByUser,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		if isBlogSlugDuplicateError(err) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "slug already exists"})
			return
		}
		log.Printf("blog_post_created_error user_id=%s err=%v", userID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create blog post"})
		return
	}

	item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	log.Printf("blog_post_created post_id=%s slug=%s user_id=%s", item.ID, item.Slug, userID)
	writeJSON(w, http.StatusCreated, item)
}

func (a *api) handleAdminGetBlogPost(w http.ResponseWriter, r *http.Request, postID string) {
	var item blogPost
	var publishedAt sql.NullTime
	var createdAt, updatedAt time.Time
	err := a.db.QueryRowContext(r.Context(), `
		SELECT id, slug, title, description, content_md, excerpt, author_name, tags,
		       cover_image_url, canonical_path, seo_title, seo_description, status,
		       published_at, created_by_user_id, updated_by_user_id, created_at, updated_at
		FROM flip.blog_posts
		WHERE id = $1
	`, postID).Scan(
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.ContentMD,
		&item.Excerpt,
		&item.AuthorName,
		pq.Array(&item.Tags),
		&item.CoverImageURL,
		&item.CanonicalPath,
		&item.SeoTitle,
		&item.SeoDescription,
		&item.Status,
		&publishedAt,
		&item.CreatedByUser,
		&item.UpdatedByUser,
		&createdAt,
		&updatedAt,
	)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "blog post not found"})
		return
	}
	if err != nil {
		log.Printf("admin blog get: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to fetch blog post",
		})
		return
	}

	item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	if publishedAt.Valid {
		p := publishedAt.Time.UTC().Format(time.RFC3339)
		item.PublishedAt = &p
	}

	writeJSON(w, http.StatusOK, item)
}

func (a *api) handleAdminUpdateBlogPost(w http.ResponseWriter, r *http.Request, postID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var currentStatus string
	var currentSlug string
	err := a.db.QueryRowContext(r.Context(),
		`SELECT status, slug FROM flip.blog_posts WHERE id = $1`,
		postID,
	).Scan(&currentStatus, &currentSlug)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "blog post not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch blog post"})
		return
	}

	var req updateBlogPostRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "invalid json body",
			Details: []string{err.Error()},
		})
		return
	}

	updates := make([]string, 0, 12)
	args := make([]any, 0, 14)
	argNum := 1

	if req.Slug != nil {
		slug := strings.TrimSpace(*req.Slug)
		if !blogSlugRegex.MatchString(slug) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "slug must be kebab-case"})
			return
		}
		if currentStatus == string(blogStatusPublished) && slug != currentSlug {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "slug cannot change after publish"})
			return
		}
		updates = append(updates, `slug = $`+strconv.Itoa(argNum))
		args = append(args, slug)
		argNum++
	}

	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "title is required"})
			return
		}
		updates = append(updates, `title = $`+strconv.Itoa(argNum))
		args = append(args, title)
		argNum++
	}

	if req.Description != nil {
		description := strings.TrimSpace(*req.Description)
		if description == "" {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "description is required"})
			return
		}
		updates = append(updates, `description = $`+strconv.Itoa(argNum))
		args = append(args, description)
		argNum++
	}

	if req.ContentMD != nil {
		content := strings.TrimSpace(*req.ContentMD)
		if content == "" {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "contentMd is required"})
			return
		}
		updates = append(updates, `content_md = $`+strconv.Itoa(argNum))
		args = append(args, content)
		argNum++
	}

	if req.Excerpt != nil {
		excerpt := nullableTrimmedString(req.Excerpt)
		updates = append(updates, `excerpt = $`+strconv.Itoa(argNum))
		args = append(args, excerpt)
		argNum++
	}

	if req.AuthorName != nil {
		authorName := strings.TrimSpace(*req.AuthorName)
		if authorName == "" {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "authorName is required"})
			return
		}
		updates = append(updates, `author_name = $`+strconv.Itoa(argNum))
		args = append(args, authorName)
		argNum++
	}

	if req.Tags != nil {
		tags := sanitizeTags(req.Tags)
		updates = append(updates, `tags = $`+strconv.Itoa(argNum))
		args = append(args, pq.Array(tags))
		argNum++
	}

	if req.CoverImageURL != nil {
		cover := nullableTrimmedString(req.CoverImageURL)
		updates = append(updates, `cover_image_url = $`+strconv.Itoa(argNum))
		args = append(args, cover)
		argNum++
	}

	if req.CanonicalPath != nil {
		canonicalPath := nullableTrimmedString(req.CanonicalPath)
		if canonicalPath != nil && !strings.HasPrefix(*canonicalPath, "/") {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "canonicalPath must start with /"})
			return
		}
		updates = append(updates, `canonical_path = $`+strconv.Itoa(argNum))
		args = append(args, canonicalPath)
		argNum++
	}

	if req.SeoTitle != nil {
		seoTitle := nullableTrimmedString(req.SeoTitle)
		updates = append(updates, `seo_title = $`+strconv.Itoa(argNum))
		args = append(args, seoTitle)
		argNum++
	}

	if req.SeoDescription != nil {
		seoDescription := nullableTrimmedString(req.SeoDescription)
		updates = append(updates, `seo_description = $`+strconv.Itoa(argNum))
		args = append(args, seoDescription)
		argNum++
	}

	if len(updates) == 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "no fields to update"})
		return
	}

	updates = append(updates, `updated_by_user_id = $`+strconv.Itoa(argNum))
	args = append(args, userID)
	argNum++

	args = append(args, postID)
	query := `UPDATE flip.blog_posts SET ` + strings.Join(updates, ", ") + ` WHERE id = $` + strconv.Itoa(argNum)
	_, err = a.db.ExecContext(r.Context(), query, args...)
	if err != nil {
		if isBlogSlugDuplicateError(err) {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "slug already exists"})
			return
		}
		log.Printf("blog_post_updated_error post_id=%s user_id=%s err=%v", postID, userID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update blog post"})
		return
	}

	log.Printf("blog_post_updated post_id=%s user_id=%s", postID, userID)
	a.handleAdminGetBlogPost(w, r, postID)
}

func (a *api) handleAdminPublishBlogPost(w http.ResponseWriter, r *http.Request, postID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var title, description, contentMD, authorName, slug string
	var tags []string
	err := a.db.QueryRowContext(r.Context(), `
		SELECT slug, title, description, content_md, author_name, tags
		FROM flip.blog_posts
		WHERE id = $1
	`, postID).Scan(&slug, &title, &description, &contentMD, &authorName, pq.Array(&tags))
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "blog post not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to validate blog post"})
		return
	}

	if strings.TrimSpace(title) == "" ||
		strings.TrimSpace(description) == "" ||
		strings.TrimSpace(contentMD) == "" ||
		strings.TrimSpace(authorName) == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "cannot publish with missing required fields"})
		return
	}
	if len(sanitizeTags(tags)) == 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "tags must have at least one item to publish"})
		return
	}
	if !blogSlugRegex.MatchString(slug) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "slug must be kebab-case"})
		return
	}

	_, err = a.db.ExecContext(r.Context(), `
		UPDATE flip.blog_posts
		SET status = 'published',
		    published_at = COALESCE(published_at, NOW()),
		    updated_by_user_id = $2
		WHERE id = $1
	`, postID, userID)
	if err != nil {
		log.Printf("blog_post_published_error post_id=%s user_id=%s err=%v", postID, userID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to publish blog post"})
		return
	}

	log.Printf("blog_post_published post_id=%s user_id=%s", postID, userID)
	a.handleAdminGetBlogPost(w, r, postID)
}

func (a *api) handleAdminUnpublishBlogPost(w http.ResponseWriter, r *http.Request, postID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	result, err := a.db.ExecContext(r.Context(), `
		UPDATE flip.blog_posts
		SET status = 'draft', updated_by_user_id = $2
		WHERE id = $1
	`, postID, userID)
	if err != nil {
		log.Printf("blog_post_unpublished_error post_id=%s user_id=%s err=%v", postID, userID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to unpublish blog post"})
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "blog post not found"})
		return
	}

	log.Printf("blog_post_unpublished post_id=%s user_id=%s", postID, userID)
	a.handleAdminGetBlogPost(w, r, postID)
}

func (a *api) handleAdminArchiveBlogPost(w http.ResponseWriter, r *http.Request, postID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	result, err := a.db.ExecContext(r.Context(), `
		UPDATE flip.blog_posts
		SET status = 'archived', updated_by_user_id = $2
		WHERE id = $1
	`, postID, userID)
	if err != nil {
		log.Printf("blog_post_archived_error post_id=%s user_id=%s err=%v", postID, userID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to archive blog post"})
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "blog post not found"})
		return
	}

	log.Printf("blog_post_archived post_id=%s user_id=%s", postID, userID)
	a.handleAdminGetBlogPost(w, r, postID)
}

func parseBlogLimit(raw string, defaultValue int, max int) int {
	limit := defaultValue
	if raw == "" {
		return limit
	}

	if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= max {
		limit = parsed
	}
	return limit
}

func parseBlogCursor(raw string) (time.Time, string, error) {
	parts := strings.Split(raw, "|")
	if len(parts) != 2 {
		return time.Time{}, "", errInvalidCursor("cursor must contain two parts")
	}

	t, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", errInvalidCursor("cursor timestamp is invalid")
	}

	id := strings.TrimSpace(parts[1])
	if id == "" {
		return time.Time{}, "", errInvalidCursor("cursor id is required")
	}

	return t, id, nil
}

type invalidCursorError string

func (e invalidCursorError) Error() string { return string(e) }

func errInvalidCursor(message string) error { return invalidCursorError(message) }

func buildBlogCursor(t time.Time, id string) string {
	return t.UTC().Format(time.RFC3339Nano) + "|" + id
}

func isValidBlogStatus(status string) bool {
	switch status {
	case string(blogStatusDraft), string(blogStatusPublished), string(blogStatusArchived):
		return true
	default:
		return false
	}
}

func sanitizeTags(input []string) []string {
	if input == nil {
		return nil
	}

	out := make([]string, 0, len(input))
	seen := make(map[string]struct{}, len(input))
	for _, tag := range input {
		value := strings.TrimSpace(tag)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func nullableTrimmedString(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func normalizeCreateBlogPostRequest(req createBlogPostRequest) (createBlogPostRequest, error) {
	req.Slug = strings.TrimSpace(req.Slug)
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.ContentMD = strings.TrimSpace(req.ContentMD)
	req.AuthorName = strings.TrimSpace(req.AuthorName)
	req.Excerpt = nullableTrimmedString(req.Excerpt)
	req.CoverImageURL = nullableTrimmedString(req.CoverImageURL)
	req.CanonicalPath = nullableTrimmedString(req.CanonicalPath)
	req.SeoTitle = nullableTrimmedString(req.SeoTitle)
	req.SeoDescription = nullableTrimmedString(req.SeoDescription)
	req.Tags = sanitizeTags(req.Tags)
	if req.Tags == nil {
		req.Tags = []string{}
	}

	if !blogSlugRegex.MatchString(req.Slug) {
		return req, errInvalidCursor("slug must be kebab-case")
	}
	if req.Title == "" {
		return req, errInvalidCursor("title is required")
	}
	if req.Description == "" {
		return req, errInvalidCursor("description is required")
	}
	if req.ContentMD == "" {
		return req, errInvalidCursor("contentMd is required")
	}
	if req.AuthorName == "" {
		return req, errInvalidCursor("authorName is required")
	}
	if req.CanonicalPath != nil && !strings.HasPrefix(*req.CanonicalPath, "/") {
		return req, errInvalidCursor("canonicalPath must start with /")
	}
	return req, nil
}

func isBlogSlugDuplicateError(err error) bool {
	if err == nil {
		return false
	}
	raw := strings.ToLower(err.Error())
	return strings.Contains(raw, "duplicate key value") && strings.Contains(raw, "slug")
}

func scanBlogPost(scanner interface {
	Scan(dest ...any) error
}) (blogPost, sql.NullTime, time.Time, time.Time, error) {
	var item blogPost
	var publishedAt sql.NullTime
	var createdAt time.Time
	var updatedAt time.Time

	err := scanner.Scan(
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.ContentMD,
		&item.Excerpt,
		&item.AuthorName,
		pq.Array(&item.Tags),
		&item.CoverImageURL,
		&item.CanonicalPath,
		&item.SeoTitle,
		&item.SeoDescription,
		&item.Status,
		&publishedAt,
		&item.CreatedByUser,
		&item.UpdatedByUser,
		&createdAt,
		&updatedAt,
	)
	return item, publishedAt, createdAt, updatedAt, err
}
