package httpapi

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type ebookLeadRequest struct {
	Email            string `json:"email"`
	EbookSlug        string `json:"ebookSlug"`
	MarketingConsent bool   `json:"marketingConsent"`
}

// handlePublicEbookLead handles POST /api/v1/public/ebook-leads
func (a *api) handlePublicEbookLead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req ebookLeadRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || !emailRegex.MatchString(req.Email) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "email inválido"})
		return
	}

	if req.EbookSlug == "" {
		req.EbookSlug = "acabamento-que-vende"
	}

	// Extract IP and User-Agent
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.Header.Get("User-Agent")

	ctx := r.Context()

	// Upsert lead
	_, err := a.db.ExecContext(ctx, `
		INSERT INTO flip.ebook_leads (email, ebook_slug, marketing_consent, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (email, ebook_slug)
		DO UPDATE SET marketing_consent = EXCLUDED.marketing_consent, ip_address = EXCLUDED.ip_address, user_agent = EXCLUDED.user_agent
	`, req.Email, req.EbookSlug, req.MarketingConsent, ip, ua)
	if err != nil {
		log.Printf("ebook lead: db error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to save lead"})
		return
	}

	// Generate presigned download URL (7 days)
	storageKey := fmt.Sprintf("ebooks/%s.pdf", req.EbookSlug)
	downloadURL, err := a.s3Client.GeneratePresignedDownloadURL(ctx, storageKey, 7*24*time.Hour)
	if err != nil {
		log.Printf("ebook lead: presign error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "STORAGE_ERROR", Message: "failed to generate download link"})
		return
	}

	// Send email via Resend
	if err := sendEbookEmail(req.Email, downloadURL); err != nil {
		log.Printf("ebook lead: email error: %v", err)
		// Still return success — lead was saved, email can be retried
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func sendEbookEmail(toEmail, downloadURL string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY not configured")
	}

	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "noreply@meuflip.com"
	}

	html := buildEbookEmailHTML(downloadURL)

	payload := map[string]any{
		"from":    fromEmail,
		"to":      []string{toEmail},
		"subject": "Seu ebook: Acabamento que Vende",
		"html":    html,
	}

	payloadBytes, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", strings.NewReader(string(payloadBytes)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend API error: status %d", resp.StatusCode)
	}

	return nil
}

func buildEbookEmailHTML(downloadURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <span style="font-size: 24px; font-weight: 700; color: #1e293b;">meuflip</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1e293b;">
                Seu ebook está pronto!
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Obrigado pelo interesse! Clique no botão abaixo para baixar o ebook
                <strong>"Acabamento que Vende"</strong> — o guia do flipper pra não estourar
                orçamento e não perder margem.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="background-color: #14b8a6; border-radius: 8px;">
                    <a href="%s" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none;">
                      Baixar Ebook (PDF)
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #a1a1aa; text-align: center;">
                Este link expira em 7 dias. Se precisar de um novo, basta acessar a página do ebook novamente.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa; text-align: center;">
                Este é um email transacional do Meu Flip.<br>
                Você recebeu porque solicitou o download do ebook.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          &copy; %d Meu Flip. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`, downloadURL, time.Now().Year())
}
