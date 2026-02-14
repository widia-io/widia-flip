#!/bin/bash

resolve_supabase_dir() {
  local default_dir="$HOME/Developer/infra/supabase"
  local candidate="${SUPABASE_DIR:-$default_dir}"

  if [ ! -d "$candidate" ]; then
    echo "Supabase directory not found: $candidate"
    echo "Set SUPABASE_DIR to your infra Supabase path (example: $default_dir)."
    return 1
  fi

  if [ ! -f "$candidate/docker-compose.yml" ]; then
    echo "Invalid Supabase directory: missing docker-compose.yml in $candidate"
    return 1
  fi

  if [ ! -f "$candidate/.env" ]; then
    echo "Invalid Supabase directory: missing .env in $candidate"
    return 1
  fi

  SUPABASE_DIR="$candidate"
  SUPABASE_ENV_FILE="$SUPABASE_DIR/.env"
  export SUPABASE_DIR
  export SUPABASE_ENV_FILE
}
