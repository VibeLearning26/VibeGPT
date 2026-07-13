#!/bin/bash
# VibeGPT – PostgreSQL Restore Script
# Usage: ./restore.sh <backup_file.sql.gz>

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "${BACKUP_DIR:-/opt/vibegpt/backups}"/vibegpt_*.sql.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will restore the database from: $BACKUP_FILE"
echo "All current data will be OVERWRITTEN."
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "[$(date)] Restoring from $BACKUP_FILE..."

gunzip -c "$BACKUP_FILE" | docker exec -i vibegpt-postgres psql \
    -U "${POSTGRES_USER:-vibegpt}" \
    -d "${POSTGRES_DB:-vibegpt}"

echo "[$(date)] Restore complete"
