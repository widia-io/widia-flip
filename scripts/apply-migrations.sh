#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_ENV_FILE="$PROJECT_ROOT/supabase/.env"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"

# Load Supabase vars when available.
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

echo "Running migrations on container '$DB_CONTAINER' via network '$NETWORK_NAME'..."

docker run --rm \
  -v "$PROJECT_ROOT/migrations:/migrations" \
  --network "$NETWORK_NAME" \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}?sslmode=disable" \
  up

echo "Migrations applied successfully"
