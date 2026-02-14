#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib-supabase-dir.sh
source "$SCRIPT_DIR/lib-supabase-dir.sh"

resolve_supabase_dir

COMPOSE_FILES=("-f" "$SUPABASE_DIR/docker-compose.yml")
if [ -f "$SUPABASE_DIR/docker-compose.override.yml" ]; then
  COMPOSE_FILES+=("-f" "$SUPABASE_DIR/docker-compose.override.yml")
fi

docker compose "${COMPOSE_FILES[@]}" --env-file "$SUPABASE_ENV_FILE" down
