package marketingest

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

func IngestParsed(ctx context.Context, db *sql.DB, runID string, cfg ParseConfig, asOfMonth time.Time, parsed ParseResult) (int, error) {
	if db == nil {
		return 0, fmt.Errorf("db is required")
	}
	if runID == "" {
		return 0, fmt.Errorf("runID is required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `SET LOCAL search_path TO flip, public`); err != nil {
		return 0, err
	}

	for _, month := range parsed.TouchedMonths {
		if _, err := tx.ExecContext(ctx, `
			DELETE FROM market_transactions
			WHERE city = $1 AND source = $2 AND month = $3
		`, cfg.City, cfg.Source, month); err != nil {
			return 0, err
		}
	}

	regionIDs := make(map[string]string, 256)
	for _, rec := range parsed.Records {
		regionID, ok := regionIDs[rec.RegionNormalized]
		if !ok {
			regionID, err = upsertRegion(ctx, tx, cfg, rec.RegionRaw, rec.RegionNormalized)
			if err != nil {
				return 0, err
			}
			regionIDs[rec.RegionNormalized] = regionID
		}

		_, err := tx.ExecContext(ctx, `
			INSERT INTO market_transactions (
				run_id,
				city,
				source,
				month,
				region_id,
				region_name_raw,
				region_name_normalized,
				property_class,
				sql_registration,
				transaction_date,
				transaction_value,
				area_m2,
				price_m2,
				iptu_use,
				iptu_use_description,
				row_hash
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
			)
			ON CONFLICT (city, source, row_hash) DO NOTHING
		`,
			runID,
			rec.City,
			rec.Source,
			rec.Month,
			regionID,
			rec.RegionRaw,
			rec.RegionNormalized,
			rec.PropertyClass,
			rec.SQLRegistration,
			rec.TransactionDate,
			rec.TransactionValue,
			rec.AreaM2,
			rec.PriceM2,
			rec.IPTUUse,
			rec.IPTUUseDescription,
			rec.RowHash,
		)
		if err != nil {
			return 0, err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM market_price_m2_aggregates
		WHERE city = $1 AND source = $2 AND as_of_month = $3
	`, cfg.City, cfg.Source, asOfMonth); err != nil {
		return 0, err
	}

	totalGroups := 0
	for _, period := range []int{1, 3, 6, 12} {
		startMonth := asOfMonth.AddDate(0, -(period - 1), 0)
		result, err := tx.ExecContext(ctx, `
			WITH base AS (
				SELECT city, region_id, price_m2, property_class
				FROM market_transactions
				WHERE city = $1
				  AND source = $2
				  AND month >= $3
				  AND month <= $4
			), expanded AS (
				SELECT city, region_id, price_m2, property_class FROM base
				UNION ALL
				SELECT city, region_id, price_m2, 'geral'::text AS property_class FROM base
			)
			INSERT INTO market_price_m2_aggregates (
				city,
				source,
				region_id,
				region_type,
				as_of_month,
				period_months,
				property_class,
				median_m2,
				p25_m2,
				p75_m2,
				tx_count,
				updated_at
			)
			SELECT
				e.city,
				$2,
				e.region_id,
				$5,
				$4,
				$6,
				e.property_class,
				ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY e.price_m2))::numeric, 2) AS median_m2,
				ROUND((percentile_cont(0.25) WITHIN GROUP (ORDER BY e.price_m2))::numeric, 2) AS p25_m2,
				ROUND((percentile_cont(0.75) WITHIN GROUP (ORDER BY e.price_m2))::numeric, 2) AS p75_m2,
				COUNT(*)::int,
				NOW()
			FROM expanded e
			GROUP BY e.city, e.region_id, e.property_class
			HAVING COUNT(*) > 0
		`, cfg.City, cfg.Source, startMonth, asOfMonth, RegionType, period)
		if err != nil {
			return 0, err
		}
		affected, _ := result.RowsAffected()
		totalGroups += int(affected)
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return totalGroups, nil
}

func upsertRegion(ctx context.Context, tx *sql.Tx, cfg ParseConfig, regionRaw, regionNormalized string) (string, error) {
	var regionID string
	err := tx.QueryRowContext(ctx, `
		INSERT INTO market_regions (
			city,
			region_type,
			name_raw,
			name_normalized,
			source,
			updated_at
		) VALUES (
			$1,$2,$3,$4,$5,NOW()
		)
		ON CONFLICT (city, region_type, name_normalized, source)
		DO UPDATE SET
			name_raw = EXCLUDED.name_raw,
			updated_at = NOW()
		RETURNING id
	`, cfg.City, RegionType, regionRaw, regionNormalized, cfg.Source).Scan(&regionID)
	return regionID, err
}
