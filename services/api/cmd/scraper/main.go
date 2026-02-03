package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"
)

type Config struct {
	City         string
	Neighborhood string
	State        string
	APIURL       string
	Secret       string
	MaxListings  int
	DryRun       bool
	Verbose      bool
}

func main() {
	cfg := parseFlags()

	if cfg.Verbose {
		log.SetFlags(log.Ltime | log.Lmicroseconds)
	}

	log.Printf("🏠 MeuFlip Scraper - ZAP Imóveis")
	log.Printf("   Cidade: %s", cfg.City)
	log.Printf("   Bairro: %s", cfg.Neighborhood)
	log.Printf("   Limite: %d anúncios", cfg.MaxListings)
	if cfg.DryRun {
		log.Printf("   ⚠️  Modo dry-run (não envia para API)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// 1. Coletar listagem
	log.Println("\n📋 Coletando listagem...")
	collector := NewCollector(cfg.Verbose)
	params := CollectParams{
		City:         cfg.City,
		Neighborhood: cfg.Neighborhood,
		State:        cfg.State,
		MaxListings:  cfg.MaxListings,
	}

	summaries, err := collector.CollectListings(ctx, params)
	if err != nil {
		log.Fatalf("❌ Erro ao coletar listagem: %v", err)
	}
	log.Printf("✅ Coletados %d anúncios da listagem", len(summaries))

	if len(summaries) == 0 {
		log.Println("⚠️  Nenhum anúncio encontrado")
		return
	}

	// 2. Enriquecer com detalhes
	log.Println("\n🔍 Coletando detalhes...")
	details, err := collector.EnrichListings(ctx, summaries)
	if err != nil {
		log.Printf("⚠️  Erro parcial ao enriquecer: %v", err)
	}
	log.Printf("✅ Detalhes coletados: %d/%d", len(details), len(summaries))

	// 3. Normalizar
	log.Println("\n📦 Normalizando dados...")
	listings := normalize(details)
	log.Printf("✅ Normalizados: %d anúncios", len(listings))

	// 4. Calcular mediana e scores
	log.Println("\n📊 Calculando scores...")
	medianM2 := calculateMedianPricePerM2(listings)
	log.Printf("   Mediana preço/m²: R$ %.2f", medianM2)

	opportunities := scoreAll(listings, medianM2)

	// Mostrar top 5
	log.Println("\n🏆 Top 5 oportunidades:")
	for i, opp := range opportunities {
		if i >= 5 {
			break
		}
		log.Printf("   %d. Score %d | R$ %s | %.0fm² | %s",
			i+1, opp.Score, formatPrice(opp.PriceCents), opp.AreaM2, opp.Title)
	}

	// 5. Enviar para API (se não for dry-run)
	if cfg.DryRun {
		log.Println("\n⚠️  Dry-run: dados não enviados para API")
		log.Printf("   Total: %d oportunidades prontas para ingestão", len(opportunities))
		return
	}

	if cfg.Secret == "" {
		log.Println("\n⚠️  Secret não configurado, pulando envio para API")
		log.Println("   Use --secret=xxx ou INTERNAL_SECRET=xxx")
		return
	}

	log.Println("\n📤 Enviando para API...")
	client := NewClient(cfg.APIURL, cfg.Secret)
	req := IngestRequest{
		Source:        "ZAP",
		City:          cfg.City,
		Neighborhood:  cfg.Neighborhood,
		ScrapedAt:     time.Now(),
		MedianPriceM2: medianM2,
		Listings:      opportunities,
	}

	resp, err := client.Ingest(ctx, req)
	if err != nil {
		log.Fatalf("❌ Erro ao enviar para API: %v", err)
	}

	log.Printf("✅ Ingestão completa!")
	log.Printf("   Job Run ID: %s", resp.JobRunID)
	log.Printf("   Novos: %d | Atualizados: %d", resp.Stats.NewListings, resp.Stats.Updated)
}

func parseFlags() Config {
	cfg := Config{}

	flag.StringVar(&cfg.City, "city", "Curitiba", "Cidade")
	flag.StringVar(&cfg.Neighborhood, "neighborhood", "vl-izabel", "Bairro (formato ZAP, ex: vl-izabel)")
	flag.StringVar(&cfg.State, "state", "pr", "Estado (sigla)")
	flag.StringVar(&cfg.APIURL, "api", getEnv("API_URL", "http://localhost:8080"), "URL da API")
	flag.StringVar(&cfg.Secret, "secret", os.Getenv("INTERNAL_API_SECRET"), "Secret para autenticação")
	flag.IntVar(&cfg.MaxListings, "limit", 50, "Limite de anúncios")
	flag.BoolVar(&cfg.DryRun, "dry-run", false, "Apenas coleta, não envia para API")
	flag.BoolVar(&cfg.Verbose, "verbose", false, "Logs detalhados")

	flag.Parse()

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func formatPrice(cents int64) string {
	reais := float64(cents) / 100
	if reais >= 1000000 {
		return fmt.Sprintf("%.1fM", reais/1000000)
	}
	if reais >= 1000 {
		return fmt.Sprintf("%.0fK", reais/1000)
	}
	return fmt.Sprintf("%.0f", reais)
}
