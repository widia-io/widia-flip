package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/flipscore"
)

const (
	openRouterAPIURL = "https://openrouter.ai/api/v1/chat/completions"
	defaultModel     = "anthropic/claude-haiku-4.5"
	defaultTimeout   = 30 * time.Second
)

type Config struct {
	APIKey  string
	Model   string
	Timeout time.Duration
}

type Client struct {
	httpClient *http.Client
	apiKey     string
	model      string
}

func NewClient(cfg Config) *Client {
	if cfg.Model == "" {
		cfg.Model = defaultModel
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = defaultTimeout
	}

	return &Client{
		httpClient: &http.Client{Timeout: cfg.Timeout},
		apiKey:     cfg.APIKey,
		model:      cfg.Model,
	}
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

const riskPrompt = `Você é um avaliador de risco imobiliário para operações de flip.
Analise o anúncio abaixo e retorne APENAS JSON válido no formato especificado.

ANÚNCIO:
%s

FORMATO DE RESPOSTA (JSON estrito):
{
  "rehab_level": "light" | "medium" | "heavy" | null,
  "llm_confidence": 0.0-1.0,
  "red_flags": [
    {
      "category": "legal|structural|moisture|condo_rules|security|noise|access|listing_inconsistency",
      "severity": 1-5,
      "confidence": 0.0-1.0,
      "evidence": "trecho curto do anúncio"
    }
  ],
  "missing_critical": ["campo1", "campo2"]
}

REGRAS:
- Se texto insuficiente: llm_confidence baixo, red_flags vazio
- Apenas categorias listadas
- Apenas JSON, sem markdown
- rehab_level: null se não há indicações de reforma`

const neighborhoodNormalizationPrompt = `Você é um normalizador de bairros da cidade de São Paulo.
Sua tarefa é mapear um rótulo sujo para UM bairro canônico da lista oficial.

RÓTULO BRUTO:
%s

LISTA OFICIAL (escolha apenas um item da lista):
%s

REGRAS:
- Se o rótulo for de torre, bloco, condomínio, endereço, setor interno, subsolo ou não identificar bairro claramente: retorne canonical=null.
- Não invente bairros fora da lista.
- Responda apenas JSON no formato:
{
  "canonical": "NOME_DO_BAIRRO" | null,
  "confidence": 0.0-1.0
}`

type neighborhoodNormalization struct {
	Canonical  *string `json:"canonical"`
	Confidence float64 `json:"confidence"`
}

type BrokerOfferMessageInput struct {
	BrokerName       string
	Agency           string
	Address          string
	Neighborhood     string
	AskingPrice      float64
	SuggestedOffer   float64
	Decision         string
	MarginPct        float64
	NetProfit        float64
	ConfidenceBucket string
	ReasonLabels     []string
}

const brokerOfferMessagePrompt = `Você é um assistente comercial de negociações imobiliárias para flip.
Escreva UMA mensagem em português brasileiro, pronta para copiar e colar no WhatsApp para um corretor.

Regras obrigatórias:
- Tom conversacional, humano e cordial (como conversa real no WhatsApp).
- Texto curto (máximo 700 caracteres).
- Não use markdown, não use blocos de código, não use aspas no início/fim.
- Comece obrigatoriamente com esta saudação: %s
- Use 1ª pessoa ("tenho interesse", "consigo enviar", "aguardo retorno").
- Inclua: interesse no imóvel, referência do imóvel, valor da proposta e pedido de retorno.
- Pergunte se o corretor consegue levar a proposta ao proprietário.
- Não invente dados além dos fornecidos.
- Evite tom robótico de relatório; escreva como mensagem pronta para enviar.

Dados da análise:
- Corretor: %s
- Imobiliária: %s
- Endereço: %s
- Bairro: %s
- Preço pedido: R$ %.0f
- Oferta sugerida: R$ %.0f
- Decisão: %s
- Margem estimada: %.1f%%
- Lucro estimado: R$ %.0f
- Confiança: %s
- Motivos principais: %s`

func (c *Client) ExtractRiskAssessment(ctx context.Context, listingText string) (*flipscore.FlipRiskAssessment, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("llm api key not configured")
	}

	prompt := fmt.Sprintf(riskPrompt, listingText)

	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "user", Content: prompt},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("HTTP-Referer", "https://widia.app")
	req.Header.Set("X-Title", "Widia Flip")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if chatResp.Error != nil {
		return nil, fmt.Errorf("api error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	content := chatResp.Choices[0].Message.Content

	// Parse JSON from response (try raw, then extract from code block)
	assessment, err := parseRiskAssessment(content)
	if err != nil {
		return nil, fmt.Errorf("parse assessment: %w", err)
	}

	// Validate
	if err := validateRiskAssessment(assessment); err != nil {
		return nil, fmt.Errorf("validate assessment: %w", err)
	}

	return assessment, nil
}

func (c *Client) NormalizeNeighborhood(ctx context.Context, raw string, candidates []string) (string, float64, error) {
	if c.apiKey == "" {
		return "", 0, fmt.Errorf("llm api key not configured")
	}
	if len(candidates) == 0 {
		return "", 0, fmt.Errorf("empty candidate list")
	}

	prompt := fmt.Sprintf(neighborhoodNormalizationPrompt, raw, strings.Join(candidates, ", "))
	content, err := c.chatCompletion(ctx, prompt)
	if err != nil {
		return "", 0, err
	}

	parsed, err := parseNeighborhoodNormalization(content)
	if err != nil {
		return "", 0, err
	}

	if parsed.Confidence < 0 || parsed.Confidence > 1 {
		return "", 0, fmt.Errorf("confidence out of range: %f", parsed.Confidence)
	}
	if parsed.Canonical == nil {
		return "", parsed.Confidence, nil
	}

	canonical := strings.TrimSpace(*parsed.Canonical)
	if canonical == "" {
		return "", parsed.Confidence, nil
	}

	return canonical, parsed.Confidence, nil
}

func (c *Client) GenerateBrokerOfferMessage(ctx context.Context, input BrokerOfferMessageInput) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("llm api key not configured")
	}

	greeting := buildWhatsAppGreeting(input.BrokerName, time.Now())

	reasons := "não informado"
	if len(input.ReasonLabels) > 0 {
		reasons = strings.Join(input.ReasonLabels, "; ")
	}

	prompt := fmt.Sprintf(
		brokerOfferMessagePrompt,
		greeting,
		normalizeText(input.BrokerName),
		normalizeText(input.Agency),
		normalizeText(input.Address),
		normalizeText(input.Neighborhood),
		input.AskingPrice,
		input.SuggestedOffer,
		normalizeText(input.Decision),
		input.MarginPct,
		input.NetProfit,
		normalizeText(input.ConfidenceBucket),
		normalizeText(reasons),
	)

	content, err := c.chatCompletion(ctx, prompt)
	if err != nil {
		return "", err
	}

	cleaned := sanitizeWhatsAppMessage(content)
	if cleaned == "" {
		return "", fmt.Errorf("empty broker offer message")
	}
	if !hasConversationalGreeting(cleaned) {
		cleaned = strings.TrimSpace(greeting + " " + cleaned)
	}

	if len(cleaned) > 700 {
		cleaned = cleaned[:700]
	}

	return cleaned, nil
}

func parseRiskAssessment(content string) (*flipscore.FlipRiskAssessment, error) {
	content = strings.TrimSpace(content)

	// Try parsing directly
	var assessment flipscore.FlipRiskAssessment
	if err := json.Unmarshal([]byte(content), &assessment); err == nil {
		return &assessment, nil
	}

	// Try extracting from markdown code block
	extracted := extractJSONFromCodeBlock(content)
	if extracted != "" {
		if err := json.Unmarshal([]byte(extracted), &assessment); err == nil {
			return &assessment, nil
		}
	}

	// Try finding JSON object in content
	jsonStart := strings.Index(content, "{")
	jsonEnd := strings.LastIndex(content, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := content[jsonStart : jsonEnd+1]
		if err := json.Unmarshal([]byte(jsonStr), &assessment); err == nil {
			return &assessment, nil
		}
	}

	return nil, fmt.Errorf("could not parse JSON from content")
}

func parseNeighborhoodNormalization(content string) (*neighborhoodNormalization, error) {
	content = strings.TrimSpace(content)

	var payload neighborhoodNormalization
	if err := json.Unmarshal([]byte(content), &payload); err == nil {
		return &payload, nil
	}

	extracted := extractJSONFromCodeBlock(content)
	if extracted != "" {
		if err := json.Unmarshal([]byte(extracted), &payload); err == nil {
			return &payload, nil
		}
	}

	jsonStart := strings.Index(content, "{")
	jsonEnd := strings.LastIndex(content, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := content[jsonStart : jsonEnd+1]
		if err := json.Unmarshal([]byte(jsonStr), &payload); err == nil {
			return &payload, nil
		}
	}

	return nil, fmt.Errorf("could not parse neighborhood normalization JSON")
}

func (c *Client) chatCompletion(ctx context.Context, prompt string) (string, error) {
	reqBody := chatRequest{
		Model:       c.model,
		MaxTokens:   260,
		Temperature: 0.3,
		Messages: []chatMessage{
			{Role: "user", Content: prompt},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterAPIURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("HTTP-Referer", "https://widia.app")
	req.Header.Set("X-Title", "Widia Flip")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("api error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return chatResp.Choices[0].Message.Content, nil
}

var codeBlockRe = regexp.MustCompile("```(?:json)?\\s*([\\s\\S]*?)```")

func extractJSONFromCodeBlock(content string) string {
	matches := codeBlockRe.FindStringSubmatch(content)
	if len(matches) >= 2 {
		return strings.TrimSpace(matches[1])
	}
	return ""
}

func validateRiskAssessment(a *flipscore.FlipRiskAssessment) error {
	if a.LLMConfidence < 0 || a.LLMConfidence > 1 {
		return fmt.Errorf("llm_confidence out of range: %f", a.LLMConfidence)
	}

	validRehabLevels := map[string]bool{"light": true, "medium": true, "heavy": true}
	if a.RehabLevel != nil && !validRehabLevels[*a.RehabLevel] {
		return fmt.Errorf("invalid rehab_level: %s", *a.RehabLevel)
	}

	validCategories := map[string]bool{
		"legal": true, "structural": true, "moisture": true,
		"condo_rules": true, "security": true, "noise": true,
		"access": true, "listing_inconsistency": true,
	}

	for i, flag := range a.RedFlags {
		if !validCategories[flag.Category] {
			return fmt.Errorf("invalid category in red_flag[%d]: %s", i, flag.Category)
		}
		if flag.Severity < 1 || flag.Severity > 5 {
			return fmt.Errorf("severity out of range in red_flag[%d]: %d", i, flag.Severity)
		}
		if flag.Confidence < 0 || flag.Confidence > 1 {
			return fmt.Errorf("confidence out of range in red_flag[%d]: %f", i, flag.Confidence)
		}
	}

	return nil
}

func normalizeText(v string) string {
	trimmed := strings.TrimSpace(v)
	if trimmed == "" {
		return "não informado"
	}
	return trimmed
}

func sanitizeWhatsAppMessage(content string) string {
	out := strings.TrimSpace(content)
	out = strings.TrimPrefix(out, "```")
	out = strings.TrimSuffix(out, "```")
	out = strings.TrimSpace(out)

	if strings.HasPrefix(out, "\"") && strings.HasSuffix(out, "\"") && len(out) >= 2 {
		out = strings.TrimSpace(out[1 : len(out)-1])
	}

	return out
}

func buildWhatsAppGreeting(brokerName string, now time.Time) string {
	period := "Bom dia"
	hour := now.Hour()
	if hour >= 12 && hour < 18 {
		period = "Boa tarde"
	} else if hour >= 18 || hour < 5 {
		period = "Boa noite"
	}

	name := firstName(brokerName)
	if name != "" {
		return fmt.Sprintf("Olá, %s! %s, tudo bem?", name, period)
	}
	return fmt.Sprintf("Olá! %s, tudo bem?", period)
}

func firstName(fullName string) string {
	fields := strings.Fields(strings.TrimSpace(fullName))
	if len(fields) == 0 {
		return ""
	}
	return fields[0]
}

func hasConversationalGreeting(message string) bool {
	m := strings.ToLower(strings.TrimSpace(message))
	return strings.HasPrefix(m, "olá") || strings.HasPrefix(m, "ola")
}
