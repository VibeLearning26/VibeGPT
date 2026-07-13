#!/bin/bash
# VibeGPT – PostgreSQL Backup Script
# Usage: ./backup.sh
# Recommended: Run daily via cron

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/vibegpt/backups}"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vibegpt_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL backup..."

docker exec vibegpt-postgres pg_dump \
    -U "${POSTGRES_USER:-vibegpt}" \
    -d "${POSTGRES_DB:-vibegpt}" \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Remove old backups
find "$BACKUP_DIR" -name "vibegpt_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete"
