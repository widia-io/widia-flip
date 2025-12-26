#!/bin/bash
set -e

# Load environment variables from supabase/.env
if [ -f supabase/.env ]; then
    export $(grep -v '^#' supabase/.env | grep POSTGRES_PASSWORD | xargs)
fi

# Run migrations using migrate/migrate Docker image connected to supabase network
docker run --rm \
    -v "$(pwd)/migrations:/migrations" \
    --network supabase_default \
    migrate/migrate:v4.17.1 \
    -path=/migrations \
    -database="postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres?sslmode=disable" \
    up

echo "Migrations applied successfully"
