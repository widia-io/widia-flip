package marketingest

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

func LoadApprovedAliases(ctx context.Context, db *sql.DB, city string) (map[string]string, error) {
	if db == nil {
		return map[string]string{}, nil
	}

	city = strings.ToLower(strings.TrimSpace(city))
	if city == "" {
		city = DefaultCity
	}

	rows, err := db.QueryContext(ctx, `
		SELECT alias_normalized, canonical_name
		FROM market_region_aliases
		WHERE city = $1
		  AND status = 'approved'
		  AND canonical_name IS NOT NULL
	`, city)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var aliasNormalized string
		var canonicalName string
		if scanErr := rows.Scan(&aliasNormalized, &canonicalName); scanErr != nil {
			return nil, scanErr
		}

		aliasKey := NormalizeNeighborhoodKey(aliasNormalized)
		canonical := CanonicalNeighborhoodFromGolden(canonicalName)
		if canonical == "" {
			canonical = NormalizeNeighborhoodKey(canonicalName)
		}
		if aliasKey == "" || canonical == "" {
			continue
		}
		out[aliasKey] = canonical
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return out, nil
}

func PersistAliasCandidates(ctx context.Context, db *sql.DB, city string, candidates []AliasCandidate) error {
	if db == nil || len(candidates) == 0 {
		return nil
	}

	city = strings.ToLower(strings.TrimSpace(city))
	if city == "" {
		city = DefaultCity
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `SET LOCAL search_path TO flip, public`); err != nil {
		return err
	}

	for _, candidate := range candidates {
		aliasKey := NormalizeNeighborhoodKey(candidate.AliasNormalized)
		if aliasKey == "" {
			aliasKey = NormalizeNeighborhoodKey(candidate.AliasRaw)
		}
		if aliasKey == "" {
			continue
		}

		canonical := CanonicalNeighborhoodFromGolden(candidate.SuggestedCanonical)
		if canonical == "" {
			canonical = NormalizeNeighborhoodKey(candidate.SuggestedCanonical)
		}

		occurrences := candidate.Occurrences
		if occurrences <= 0 {
			occurrences = 1
		}

		var aliasRaw any
		if raw := strings.TrimSpace(candidate.AliasRaw); raw != "" {
			aliasRaw = raw
		}

		var suggestedCanonical any
		if canonical != "" {
			suggestedCanonical = canonical
		}

		var suggestedConfidence any
		if candidate.SuggestedConfidence >= 0 && candidate.SuggestedConfidence <= 1 && candidate.SuggestedConfidence > 0 {
			suggestedConfidence = candidate.SuggestedConfidence
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO market_region_aliases (
				city,
				alias_raw,
				alias_normalized,
				status,
				suggested_canonical,
				suggested_confidence,
				occurrences,
				first_seen_at,
				last_seen_at,
				created_at,
				updated_at
			) VALUES (
				$1,$2,$3,'pending',$4,$5,$6,NOW(),NOW(),NOW(),NOW()
			)
			ON CONFLICT (city, alias_normalized)
			DO UPDATE SET
				alias_raw = CASE
					WHEN COALESCE(market_region_aliases.alias_raw, '') = '' AND COALESCE(EXCLUDED.alias_raw, '') <> '' THEN EXCLUDED.alias_raw
					ELSE market_region_aliases.alias_raw
				END,
				suggested_canonical = CASE
					WHEN market_region_aliases.status = 'approved' THEN market_region_aliases.suggested_canonical
					WHEN EXCLUDED.suggested_canonical IS NULL OR EXCLUDED.suggested_canonical = '' THEN market_region_aliases.suggested_canonical
					WHEN market_region_aliases.suggested_confidence IS NULL OR EXCLUDED.suggested_confidence >= market_region_aliases.suggested_confidence THEN EXCLUDED.suggested_canonical
					ELSE market_region_aliases.suggested_canonical
				END,
				suggested_confidence = CASE
					WHEN market_region_aliases.status = 'approved' THEN market_region_aliases.suggested_confidence
					WHEN EXCLUDED.suggested_confidence IS NULL THEN market_region_aliases.suggested_confidence
					WHEN market_region_aliases.suggested_confidence IS NULL OR EXCLUDED.suggested_confidence >= market_region_aliases.suggested_confidence THEN EXCLUDED.suggested_confidence
					ELSE market_region_aliases.suggested_confidence
				END,
				occurrences = market_region_aliases.occurrences + EXCLUDED.occurrences,
				last_seen_at = NOW(),
				updated_at = NOW()
		`, city, aliasRaw, aliasKey, suggestedCanonical, suggestedConfidence, occurrences); err != nil {
			return fmt.Errorf("upsert alias candidate %q: %w", aliasKey, err)
		}
	}

	return tx.Commit()
}
