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
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
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
