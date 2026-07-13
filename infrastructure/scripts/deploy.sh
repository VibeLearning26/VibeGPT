#!/bin/bash
# VibeGPT – Production Deployment Script
# Usage: ./deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== VibeGPT Deployment ==="
echo "Project directory: $PROJECT_DIR"
echo ""

cd "$PROJECT_DIR"

# Pull latest code
echo "1. Pulling latest code..."
git pull origin main

# Build and start services
echo "2. Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "3. Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for API to be ready
echo "4. Waiting for API to be ready..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo "   API is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 5
done

# Run migrations
echo "5. Running database migrations..."
docker exec vibegpt-api alembic upgrade head || echo "   Migration skipped or failed"

echo ""
echo "=== Deployment Complete ==="
echo "Run ./scripts/health-check.sh to verify all services"
