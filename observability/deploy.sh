#!/bin/bash
# Deploy observability stack to production
# Usage: ./deploy.sh user@server

set -e

SERVER=${1:-""}
REMOTE_PATH="/opt/stacks/observability"

if [ -z "$SERVER" ]; then
    echo "Usage: ./deploy.sh user@server"
    exit 1
fi

echo "Deploying observability stack to $SERVER..."

# Create remote directory
ssh "$SERVER" "mkdir -p $REMOTE_PATH/grafana/provisioning/datasources $REMOTE_PATH/grafana/provisioning/dashboards"

# Copy files
scp docker-compose.yml "$SERVER:$REMOTE_PATH/"
scp loki-config.yaml "$SERVER:$REMOTE_PATH/"
scp promtail-config.yaml "$SERVER:$REMOTE_PATH/"
scp grafana/provisioning/datasources/datasources.yaml "$SERVER:$REMOTE_PATH/grafana/provisioning/datasources/"
scp grafana/provisioning/dashboards/dashboards.yaml "$SERVER:$REMOTE_PATH/grafana/provisioning/dashboards/"

# Check if .env exists, warn if not
ssh "$SERVER" "test -f $REMOTE_PATH/.env || echo 'WARNING: Create $REMOTE_PATH/.env with GRAFANA_ADMIN_PASSWORD'"

# Deploy
ssh "$SERVER" "cd $REMOTE_PATH && docker compose up -d"

echo "Done! Access Grafana at https://grafana.meuflip.com"
