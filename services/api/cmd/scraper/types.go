package main

import "time"

// CollectParams define os parâmetros de coleta
type CollectParams struct {
	City         string
	Neighborhood string
	State        string
	MinArea      int
	MaxArea      int
	Bedrooms     []int
	MaxListings  int
}

// ListingSummary representa um anúncio na página de listagem
type ListingSummary struct {
	SourceListingID string
	URL             string
	Title           string
	PriceCents      int64
	AreaM2          float64
	Bedrooms        int
	Bathrooms       int
	ParkingSpots    int
	CondoFeeCents   int64
	IPTUCents       int64
	Neighborhood    string
	Address         string
	ImageURL        string
}

// ListingDetails representa detalhes completos de um anúncio
type ListingDetails struct {
	SourceListingID string
	URL             string
	Title           string
	Description     string
	PriceCents      int64
	AreaM2          float64
	Bedrooms        int
	Bathrooms       int
	ParkingSpots    int
	Suites          int
	Floor           int
	CondoFeeCents   int64
	IPTUCents       int64
	Address         string
	Neighborhood    string
	City            string
	State           string
	Images          []string
	Features        []string
	PublishedAt     *time.Time
	RawHTML         string
}

// SourceListing representa um anúncio normalizado
type SourceListing struct {
	Source          string     `json:"source"`
	SourceListingID string     `json:"source_listing_id"`
	CanonicalURL    string     `json:"canonical_url"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	PriceCents      int64      `json:"price_cents"`
	AreaM2          float64    `json:"area_m2"`
	Bedrooms        int        `json:"bedrooms"`
	Bathrooms       int        `json:"bathrooms"`
	ParkingSpots    int        `json:"parking_spots"`
	CondoFeeCents   int64      `json:"condo_fee_cents"`
	IPTUCents       int64      `json:"iptu_cents"`
	Address         string     `json:"address"`
	Neighborhood    string     `json:"neighborhood"`
	City            string     `json:"city"`
	State           string     `json:"state"`
	Images          []string   `json:"images"`
	PublishedAt     *time.Time `json:"published_at,omitempty"`
}

// ScoreBreakdown detalha os pontos de cada categoria
type ScoreBreakdown struct {
	Discount  int `json:"discount"`
	Area      int `json:"area"`
	Bedrooms  int `json:"bedrooms"`
	Parking   int `json:"parking"`
	Keywords  int `json:"keywords"`
	Penalties int `json:"penalties"`
	Decay     int `json:"decay"`
}

// Opportunity representa uma oportunidade com score
type Opportunity struct {
	SourceListing
	Score          int            `json:"score"`
	ScoreBreakdown ScoreBreakdown `json:"score_breakdown"`
	PricePerM2     float64        `json:"price_per_m2"`
	MedianPriceM2  float64        `json:"market_median_m2"`
	DiscountPct    float64        `json:"discount_pct"`
}

// IngestRequest é o payload enviado para a API
type IngestRequest struct {
	Source        string        `json:"source"`
	City          string        `json:"city"`
	Neighborhood  string        `json:"neighborhood"`
	ScrapedAt     time.Time     `json:"scraped_at"`
	MedianPriceM2 float64       `json:"median_price_m2"`
	Listings      []Opportunity `json:"listings"`
}

// IngestResponse é a resposta da API
type IngestResponse struct {
	JobRunID string      `json:"job_run_id"`
	Stats    IngestStats `json:"stats"`
}

// IngestStats contém estatísticas da ingestão
type IngestStats struct {
	TotalReceived int `json:"total_received"`
	NewListings   int `json:"new_listings"`
	Updated       int `json:"updated"`
}
