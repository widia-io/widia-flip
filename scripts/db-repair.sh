#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=./lib-supabase-dir.sh
source "$PROJECT_ROOT/scripts/lib-supabase-dir.sh"
resolve_supabase_dir
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
TARGET_VERSION="${1:-}"

if [ -f "$SUPABASE_ENV_FILE" ]; then
  for key in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB; do
    value="$(grep -E "^${key}=" "$SUPABASE_ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
    if [ -n "$value" ]; then
      export "${key}=${value}"
    fi
  done
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  CANDIDATE="$(docker ps --filter label=com.docker.compose.service=db --format '{{.Names}}' | head -n1 || true)"
  if [ -n "$CANDIDATE" ]; then
    DB_CONTAINER="$CANDIDATE"
  else
    echo "No running Supabase DB container found. Start it with: npm run db:up"
    exit 1
  fi
fi

NETWORK_NAME="$(
  docker inspect "$DB_CONTAINER" \
    --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' \
    | grep 'supabase' \
    | head -n1
)"

if [ -z "$NETWORK_NAME" ]; then
  NETWORK_NAME="$(
    docker inspect "$DB_CONTAINER" \
      --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' \
      | head -n1
  )"
fi

if [ -z "$NETWORK_NAME" ]; then
  echo "Could not resolve Docker network for container: $DB_CONTAINER"
  exit 1
fi

CONTAINER_DB_USER="$(docker exec "$DB_CONTAINER" printenv POSTGRES_USER 2>/dev/null || true)"
CONTAINER_DB_PASSWORD="$(docker exec "$DB_CONTAINER" printenv POSTGRES_PASSWORD 2>/dev/null || true)"
CONTAINER_DB_NAME="$(docker exec "$DB_CONTAINER" printenv POSTGRES_DB 2>/dev/null || true)"

DB_USER="${CONTAINER_DB_USER:-${POSTGRES_USER:-supabase_admin}}"
DB_PASSWORD="${CONTAINER_DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
DB_NAME="${CONTAINER_DB_NAME:-${POSTGRES_DB:-postgres}}"

if [ -z "$DB_PASSWORD" ]; then
  echo "POSTGRES_PASSWORD is missing. Check $SUPABASE_ENV_FILE"
  exit 1
fi

DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}?sslmode=disable"

MIGRATION_TABLE_EXISTS="$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -At \
  -c "select to_regclass('public.schema_migrations') is not null;" 2>/dev/null || true)"

if [ "$MIGRATION_TABLE_EXISTS" != "t" ]; then
  echo "schema_migrations not found. Nothing to repair."
  echo "Run: npm run db:migrate"
  exit 0
fi

STATE="$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -At \
  -c "select version || '|' || dirty from schema_migrations limit 1;")"

CURRENT_VERSION="${STATE%%|*}"
CURRENT_DIRTY="${STATE##*|}"

if [ -z "$CURRENT_VERSION" ] || [ -z "$CURRENT_DIRTY" ]; then
  echo "Could not read schema_migrations state."
  exit 1
fi

if [ "$CURRENT_DIRTY" != "t" ]; then
  echo "schema_migrations is clean (version=$CURRENT_VERSION). No repair needed."
  exit 0
fi

if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION=$((CURRENT_VERSION - 1))
fi

if [ "$TARGET_VERSION" -le 0 ]; then
  echo "Dirty migration at version $CURRENT_VERSION with target <= 0."
  echo "Dropping schema_migrations so bootstrap can restart from 0001..."
  docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c 'drop table if exists schema_migrations;'
  echo "Repair completed. Run: npm run db:migrate"
  exit 0
fi

echo "Repairing dirty migration state: version=${CURRENT_VERSION}, target=${TARGET_VERSION}"

docker run --rm \
  -v "$PROJECT_ROOT/migrations:/migrations" \
  --network "$NETWORK_NAME" \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="$DB_URL" \
  force "$TARGET_VERSION"

echo "Repair completed. Run: npm run db:migrate"
