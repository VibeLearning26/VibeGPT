#!/bin/bash
# VibeGPT – Health Check Script
# Usage: ./health-check.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

echo "=== VibeGPT Health Check ==="
echo ""

# Check API health
echo -n "API Health:     "
if curl -sf "${API_URL}/api/v1/health" > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAIL"
fi

# Check API readiness
echo -n "API Ready:      "
READY=$(curl -sf "${API_URL}/api/v1/ready" 2>/dev/null || echo '{"status":"error"}')
echo "$READY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
db = '✅' if data.get('database') else '❌'
ollama = '✅' if data.get('ollama') else '⚠️'
print(f'DB {db} | Ollama {ollama}')
" 2>/dev/null || echo "❌ FAIL"

# Check Web
echo -n "Web Frontend:   "
if curl -sf "${WEB_URL}" > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAIL"
fi

# Check Docker containers
echo ""
echo "=== Docker Containers ==="
docker ps --filter "name=vibegpt" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available"

echo ""
echo "=== Done ==="
