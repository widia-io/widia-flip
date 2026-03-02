package marketingest

import (
	"context"
	"sort"
	"strings"
	"time"
)

type NeighborhoodNormalizer interface {
	NormalizeNeighborhood(ctx context.Context, raw string, candidates []string) (canonical string, confidence float64, err error)
}

type AliasCandidate struct {
	AliasRaw            string
	AliasNormalized     string
	SuggestedCanonical  string
	SuggestedConfidence float64
	Occurrences         int
}

type neighborhoodResolver struct {
	dictionary    map[string]string
	candidates    []string
	normalizer    NeighborhoodNormalizer
	maxLLMCalls   int
	llmCalls      int
	llmResolved   int
	llmErrors     int
	llmDisabled   bool
	cache         map[string]string
	missCache     map[string]struct{}
	pending       map[string]*AliasCandidate
	minConfidence float64
}

func newNeighborhoodResolver(normalizer NeighborhoodNormalizer, maxLLMCalls int, approvedAliases map[string]string) *neighborhoodResolver {
	dictionary := buildGoldenNeighborhoodDictionary()
	for alias, canonical := range approvedAliases {
		aliasKey := dictionaryKey(alias)
		canonicalKey := dictionaryKey(canonical)
		if aliasKey == "" || canonicalKey == "" {
			continue
		}
		resolvedCanonical, ok := dictionary[canonicalKey]
		if !ok {
			resolvedCanonical = canonicalKey
			dictionary[canonicalKey] = canonicalKey
		}
		dictionary[aliasKey] = resolvedCanonical
	}

	candidates := make([]string, 0, len(dictionary))
	for _, canonical := range dictionary {
		candidates = append(candidates, canonical)
	}
	sort.Strings(candidates)

	if maxLLMCalls < 0 {
		maxLLMCalls = 0
	}

	return &neighborhoodResolver{
		dictionary:    dictionary,
		candidates:    uniqueStrings(candidates),
		normalizer:    normalizer,
		maxLLMCalls:   maxLLMCalls,
		cache:         make(map[string]string, 4096),
		missCache:     make(map[string]struct{}, 4096),
		pending:       make(map[string]*AliasCandidate, 4096),
		minConfidence: 0.72,
	}
}

func (r *neighborhoodResolver) Resolve(ctx context.Context, raw string, heuristic string) string {
	rawKey := dictionaryKey(raw)
	if rawKey == "" {
		return ""
	}

	if cached, ok := r.cache[rawKey]; ok {
		return cached
	}
	if _, miss := r.missCache[rawKey]; miss {
		return ""
	}

	if canonical := r.match(heuristic); canonical != "" {
		r.cache[rawKey] = canonical
		return canonical
	}

	normalizedHeuristic := dictionaryKey(heuristic)
	if normalizedHeuristic != "" && !looksSuspiciousNeighborhood(normalizedHeuristic) {
		r.cache[rawKey] = normalizedHeuristic
		return normalizedHeuristic
	}

	if r.normalizer == nil || r.maxLLMCalls == 0 || r.llmCalls >= r.maxLLMCalls || r.llmDisabled {
		r.recordPending(raw, rawKey, "", 0)
		r.missCache[rawKey] = struct{}{}
		return ""
	}

	r.llmCalls++
	llmCtx := ctx
	cancel := func() {}
	if llmCtx == nil {
		llmCtx = context.Background()
	}
	if _, hasDeadline := llmCtx.Deadline(); !hasDeadline {
		llmCtx, cancel = context.WithTimeout(llmCtx, 4*time.Second)
	}
	defer cancel()

	canonical, confidence, err := r.normalizer.NormalizeNeighborhood(llmCtx, raw, r.candidates)
	if err != nil {
		r.llmErrors++
		if r.llmErrors >= 3 {
			r.llmDisabled = true
		}
		r.recordPending(raw, rawKey, "", 0)
		r.missCache[rawKey] = struct{}{}
		return ""
	}
	r.llmErrors = 0

	if confidence < r.minConfidence {
		r.recordPending(raw, rawKey, canonical, confidence)
		r.missCache[rawKey] = struct{}{}
		return ""
	}

	if matched := r.match(canonical); matched != "" {
		r.llmResolved++
		r.cache[rawKey] = matched
		return matched
	}

	r.recordPending(raw, rawKey, canonical, confidence)
	r.missCache[rawKey] = struct{}{}
	return ""
}

func (r *neighborhoodResolver) Stats() (calls int, resolved int) {
	return r.llmCalls, r.llmResolved
}

func (r *neighborhoodResolver) PendingCandidates() []AliasCandidate {
	if len(r.pending) == 0 {
		return nil
	}
	out := make([]AliasCandidate, 0, len(r.pending))
	for _, candidate := range r.pending {
		if candidate == nil {
			continue
		}
		out = append(out, *candidate)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Occurrences == out[j].Occurrences {
			return out[i].AliasNormalized < out[j].AliasNormalized
		}
		return out[i].Occurrences > out[j].Occurrences
	})
	return out
}

func (r *neighborhoodResolver) match(value string) string {
	key := dictionaryKey(value)
	if key == "" {
		return ""
	}
	if canonical, ok := r.dictionary[key]; ok {
		return canonical
	}
	return ""
}

func (r *neighborhoodResolver) recordPending(raw string, aliasNormalized string, suggestedCanonical string, confidence float64) {
	if aliasNormalized == "" {
		return
	}
	if _, exists := r.dictionary[aliasNormalized]; exists {
		return
	}

	suggested := r.match(suggestedCanonical)
	if suggested == "" {
		suggested = dictionaryKey(suggestedCanonical)
	}

	candidate, ok := r.pending[aliasNormalized]
	if !ok {
		r.pending[aliasNormalized] = &AliasCandidate{
			AliasRaw:            strings.TrimSpace(raw),
			AliasNormalized:     aliasNormalized,
			SuggestedCanonical:  suggested,
			SuggestedConfidence: confidence,
			Occurrences:         1,
		}
		return
	}

	candidate.Occurrences++
	if candidate.AliasRaw == "" && strings.TrimSpace(raw) != "" {
		candidate.AliasRaw = strings.TrimSpace(raw)
	}
	if suggested != "" && confidence >= candidate.SuggestedConfidence {
		candidate.SuggestedCanonical = suggested
		candidate.SuggestedConfidence = confidence
	}
}

func looksSuspiciousNeighborhood(value string) bool {
	if value == "" {
		return true
	}
	parts := strings.Fields(value)
	if len(parts) == 0 {
		return true
	}
	if len(parts) == 1 {
		token := parts[0]
		if _, ok := neighborhoodAnchorTokens[token]; !ok {
			return true
		}
	}
	for _, token := range parts {
		if len(token) <= 1 {
			return true
		}
		if isNeighborhoodNoiseToken(token) || reHasDigit.MatchString(token) {
			return true
		}
		if _, bad := neighborhoodGarbageTokens[token]; bad {
			return true
		}
	}
	return false
}

func dictionaryKey(value string) string {
	base := normalizeText(value)
	if base == "" {
		return ""
	}
	parts := normalizeNeighborhoodTokens(strings.Fields(base))
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, " ")
}

func NormalizeNeighborhoodKey(value string) string {
	return dictionaryKey(value)
}

func CanonicalNeighborhoodFromGolden(value string) string {
	key := dictionaryKey(value)
	if key == "" {
		return ""
	}
	dict := buildGoldenNeighborhoodDictionary()
	if canonical, ok := dict[key]; ok {
		return canonical
	}
	return ""
}

func GoldenNeighborhoodCanonicalList() []string {
	dict := buildGoldenNeighborhoodDictionary()
	out := make([]string, 0, len(dict))
	seen := make(map[string]struct{}, len(dict))
	for _, canonical := range dict {
		if _, ok := seen[canonical]; ok {
			continue
		}
		seen[canonical] = struct{}{}
		out = append(out, canonical)
	}
	sort.Strings(out)
	return out
}

func buildGoldenNeighborhoodDictionary() map[string]string {
	canonical := []string{
		"ACLIMACAO", "AGUA BRANCA", "AGUA FRIA", "AGUA RASA", "ALTO DA BOA VISTA", "ALTO DA LAPA", "ALTO DA MOOCA", "ALTO DE PINHEIROS",
		"ANHANGUERA", "ARICANDUVA", "ARTUR ALVIM", "BARRA FUNDA", "BELA VISTA", "BELEM", "BELENZINHO", "BOM RETIRO", "BRAS", "BRASILANDIA",
		"BROOKLIN", "BROOKLIN PAULISTA", "BUTANTA", "CACHOEIRINHA", "CAMBUCI", "CAMPO BELO", "CAMPO GRANDE", "CAMPO LIMPO", "CANGAIBA",
		"CAPAO REDONDO", "CARRAO", "CASA VERDE", "CERQUEIRA CESAR", "CHACARA KLABIN", "CHACARA SANTO ANTONIO", "CIDADE ADEMAR", "CIDADE DUTRA",
		"CIDADE LIDER", "CIDADE MONCOES", "CIDADE TIRADENTES", "CONSOLACAO", "CURSINO", "ERMELINO MATARAZZO", "FREGUESIA DO O", "GRAJAU",
		"GUAIANASES", "HIGIENOPOLIS", "IGUATEMI", "INDIANOPOLIS", "INTERLAGOS", "IPIRANGA", "ITAIM", "ITAIM BIBI", "ITAIM PAULISTA", "ITAQUERA",
		"JABAQUARA", "JACANA", "JAGUARA", "JAGUARE", "JARAGUA", "JARDIM AMERICA", "JARDIM ANGELA", "JARDIM AURELIA", "JARDIM BONFIGLIOLI",
		"JARDIM DAS BANDEIRAS", "JARDIM EUROPA", "JARDIM HELENA", "JARDIM LEONOR", "JARDIM LUSITANIA", "JARDIM PAULISTA", "JARDIM PRUDENCIA",
		"JARDIM SAO LUIS", "JOSE BONIFACIO", "JURUBATUBA", "LAJEADO", "LAPA", "LIBERDADE", "LIMAO", "MANDAQUI", "MARSILAC", "MIRANDOPOLIS",
		"MOEMA", "MOOCA", "MORUMBI", "PACAEMBU", "PARAISO", "PARELHEIROS", "PARI", "PARQUE DO CARMO", "PEDREIRA", "PENHA", "PERDIZES", "PERUS",
		"PINHEIROS", "PIRITUBA", "PONTE RASA", "RAPOSO TAVARES", "REPUBLICA", "RIO PEQUENO", "SACOMA", "SANTA CECILIA", "SANTA EFIGENIA",
		"SANTANA", "SANTO AMARO", "SAO DOMINGOS", "SAO LUCAS", "SAO MATEUS", "SAO MIGUEL", "SAO RAFAEL", "SAPOPEMBA", "SAUDE", "SE", "SOCORRO",
		"TATUAPE", "TREMEMBE", "TUCURUVI", "VILA ALPINA", "VILA ANDRADE", "VILA BUARQUE", "VILA CLEMENTINO", "VILA CURUCA", "VILA FORMOSA",
		"VILA GUILHERME", "VILA GUMERCINDO", "VILA JACUI", "VILA LEOPOLDINA", "VILA MADALENA", "VILA MARIA", "VILA MARIANA", "VILA MASCOTE",
		"VILA MATILDE", "VILA MEDEIROS", "VILA OLIMPIA", "VILA PRUDENTE", "VILA ROMANA", "VILA SONIA", "VILA VERMELHA",
	}

	dict := make(map[string]string, len(canonical)*2)
	for _, item := range canonical {
		key := dictionaryKey(item)
		if key == "" {
			continue
		}
		dict[key] = item
	}
	return dict
}

func uniqueStrings(values []string) []string {
	if len(values) == 0 {
		return values
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}
