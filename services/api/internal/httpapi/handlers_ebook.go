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

// Admin: list all ebook leads
type adminEbookLead struct {
	ID               string  `json:"id"`
	Email            string  `json:"email"`
	EbookSlug        string  `json:"ebookSlug"`
	MarketingConsent bool    `json:"marketingConsent"`
	IPAddress        *string `json:"ipAddress"`
	ConvertedAt      *string `json:"convertedAt"`
	ConvertedUserID  *string `json:"convertedUserId"`
	CreatedAt        string  `json:"createdAt"`
}

func (a *api) handleAdminListEbookLeads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	rows, err := a.db.QueryContext(ctx, `
		SELECT id, email, ebook_slug, marketing_consent, ip_address, converted_at, converted_user_id, created_at
		FROM flip.ebook_leads
		ORDER BY created_at DESC
		LIMIT 200
	`)
	if err != nil {
		log.Printf("admin list ebook leads: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list leads"})
		return
	}
	defer rows.Close()

	items := make([]adminEbookLead, 0)
	for rows.Next() {
		var l adminEbookLead
		var createdAt time.Time
		var convertedAt *time.Time
		var ip *string
		if err := rows.Scan(&l.ID, &l.Email, &l.EbookSlug, &l.MarketingConsent, &ip, &convertedAt, &l.ConvertedUserID, &createdAt); err != nil {
			log.Printf("admin list ebook leads: scan error: %v", err)
			continue
		}
		l.IPAddress = ip
		if convertedAt != nil {
			s := convertedAt.Format(time.RFC3339)
			l.ConvertedAt = &s
		}
		l.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, l)
	}

	var total int
	a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM flip.ebook_leads`).Scan(&total)

	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// handleAdminEbookLeadsSubroutes dispatches /api/v1/admin/ebook-leads and subroutes
func (a *api) handleAdminEbookLeadsSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/ebook-leads")
	path = strings.TrimSuffix(path, "/")

	switch {
	case path == "" && r.Method == http.MethodGet:
		a.handleAdminListEbookLeads(w, r)
	case path == "/reconcile" && r.Method == http.MethodPost:
		a.handleAdminReconcileEbookLeads(w, r)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

// handleAdminReconcileEbookLeads matches ebook leads to registered users by email
func (a *api) handleAdminReconcileEbookLeads(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	result, err := a.db.ExecContext(ctx, `
		UPDATE flip.ebook_leads el
		SET converted_at = now(), converted_user_id = u.id
		FROM "user" u
		WHERE u.email = el.email
		  AND u."emailVerified" = true
		  AND el.converted_at IS NULL
	`)
	if err != nil {
		log.Printf("admin reconcile ebook leads: error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to reconcile leads"})
		return
	}

	n, _ := result.RowsAffected()
	writeJSON(w, http.StatusOK, map[string]int64{"reconciled": n})
}

func buildEbookEmailHTML(downloadURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu ebook: Acabamento que Vende</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f8f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <tr>
            <td style="padding: 0 0 32px; text-align: center;">
              <span style="font-size: 20px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">meuflip</span>
            </td>
          </tr>
        </table>

        <!-- Hero card — dark navy -->
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #1e293b; border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 48px 40px 40px; text-align: center;">
              <!-- Teal accent line -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="width: 48px; height: 3px; background-color: #14b8a6; border-radius: 2px;"></td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #14b8a6; text-transform: uppercase; letter-spacing: 2px;">
                Ebook Gratuito
              </p>
              <h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 800; color: #ffffff; line-height: 1.15;">
                Acabamento<br>que Vende
              </h1>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                O guia do flipper pra escolher piso, bancada, revestimento e metais — sem estourar orçamento.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #14b8a6; border-radius: 12px;">
                    <a href="%s" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #0f172a; text-decoration: none; letter-spacing: -0.2px;">
                      &#8595;&nbsp;&nbsp;Baixar Ebook (PDF)
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <p style="margin: 20px 0 0; font-size: 12px; color: #475569;">
                &#128274; Link expira em 7 dias
              </p>
            </td>
          </tr>
        </table>

        <!-- Stats bar -->
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #162032; border-top: 1px solid rgba(255,255,255,0.05);">
          <tr>
            <td width="33.33%%" style="padding: 20px 0; text-align: center; border-right: 1px solid rgba(255,255,255,0.05);">
              <p style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">9</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">capítulos</p>
            </td>
            <td width="33.33%%" style="padding: 20px 0; text-align: center; border-right: 1px solid rgba(255,255,255,0.05);">
              <p style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">85<span style="color: #14b8a6;">+</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">páginas</p>
            </td>
            <td width="33.33%%" style="padding: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">100<span style="color: #14b8a6;">+</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">downloads</p>
            </td>
          </tr>
        </table>

        <!-- White content card -->
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 36px 40px;">
              <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 700; color: #1e293b;">
                O que você vai encontrar:
              </h2>

              <!-- Benefit 1 -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="36" valign="top">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #f0fdfa; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">
                          &#128176;
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1e293b;">Proteja sua margem</p>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Saiba onde gastar e onde cortar — com dados reais</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 2 -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="36" valign="top">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #f0fdfa; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">
                          &#127968;
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1e293b;">Guia por ambiente</p>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Decisões prontas pra cozinha, banheiro, sala e quartos</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 3 -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="36" valign="top">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #f0fdfa; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">
                          &#128161;
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1e293b;">3 intervenções que transformam</p>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Maior impacto visual com menor custo</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 4 -->
              <table width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="36" valign="top">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 28px; height: 28px; background-color: #f0fdfa; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">
                          &#9888;&#65039;
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1e293b;">Erros reais evitados</p>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Histórias de quem perdeu dinheiro — e como evitar</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height: 1px; background-color: #f1f5f9;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary CTA -->
          <tr>
            <td style="padding: 28px 40px 36px; text-align: center;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                Não conseguiu clicar no botão? Copie o link:
              </p>
              <p style="margin: 0; font-size: 12px; color: #14b8a6; word-break: break-all;">
                <a href="%s" style="color: #14b8a6; text-decoration: underline;">%s</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Conhecer meuflip -->
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin-top: 24px;">
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 24px 32px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.04);">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #1e293b;">
                Quer gerenciar seus flips com dados reais?
              </p>
              <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">
                Conheça o meuflip — a plataforma do flipper profissional.
              </p>
              <a href="https://meuflip.com/login?tab=signup" style="display: inline-block; padding: 10px 28px; font-size: 13px; font-weight: 700; color: #1e293b; text-decoration: none; border: 2px solid #1e293b; border-radius: 8px;">
                Conhecer o meuflip&nbsp;&nbsp;&#8594;
              </a>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8;">
                Este é um email transacional do Meu Flip.<br>
                Você recebeu porque solicitou o download do ebook.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; %d Meu Flip. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, downloadURL, downloadURL, downloadURL, time.Now().Year())
}
