package marketingest

import "testing"

func TestParseSheetMonth(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "jan", input: "JAN-2025", want: "2025-01-01"},
		{name: "dez", input: "DEZ-2024", want: "2024-12-01"},
		{name: "invalid", input: "XX-2025", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseSheetMonth(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Format("2006-01-02") != tt.want {
				t.Fatalf("got %s, want %s", got.Format("2006-01-02"), tt.want)
			}
		})
	}
}

func TestParseDecimal(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  float64
		ok    bool
	}{
		{name: "br format", input: "1.234,56", want: 1234.56, ok: true},
		{name: "us format", input: "1234.56", want: 1234.56, ok: true},
		{name: "currency", input: "R$ 950.000,00", want: 950000, ok: true},
		{name: "invalid", input: "abc", want: 0, ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := parseDecimal(tt.input)
			if ok != tt.ok {
				t.Fatalf("ok=%v, want %v", ok, tt.ok)
			}
			if tt.ok && (got < tt.want-0.001 || got > tt.want+0.001) {
				t.Fatalf("got %f, want %f", got, tt.want)
			}
		})
	}
}

func TestClassifyPropertyClass(t *testing.T) {
	tests := []struct {
		name        string
		iptuUse     string
		description string
		want        string
	}{
		{name: "apartment", iptuUse: "21", description: "Apartamento em condomínio", want: "apartamento"},
		{name: "house", iptuUse: "11", description: "Casa residencial", want: "casa"},
		{name: "other", iptuUse: "99", description: "Galpão comercial", want: "outros"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := classifyPropertyClass(tt.iptuUse, tt.description)
			if got != tt.want {
				t.Fatalf("got %s, want %s", got, tt.want)
			}
		})
	}
}

func TestNormalizeText(t *testing.T) {
	got := normalizeText("  São  Mateus  ")
	if got != "SAO MATEUS" {
		t.Fatalf("got %q, want %q", got, "SAO MATEUS")
	}
}
