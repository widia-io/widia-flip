package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	secret     string
	httpClient *http.Client
}

func NewClient(baseURL, secret string) *Client {
	return &Client{
		baseURL: baseURL,
		secret:  secret,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Ingest envia os dados para a API de ingestão
func (c *Client) Ingest(ctx context.Context, req IngestRequest) (*IngestResponse, error) {
	url := fmt.Sprintf("%s/api/v1/internal/opportunities/ingest", c.baseURL)

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Internal-Secret", c.secret)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("erro ao enviar request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("API retornou status %d: %s", resp.StatusCode, string(respBody))
	}

	var ingestResp IngestResponse
	if err := json.Unmarshal(respBody, &ingestResp); err != nil {
		return nil, fmt.Errorf("erro ao deserializar response: %w", err)
	}

	return &ingestResp, nil
}
