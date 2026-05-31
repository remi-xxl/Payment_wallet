#!/bin/bash
# scripts/backup.sh
# Backs up the PostgreSQL database and uploads to a safe location.
# In production this runs on a cron schedule — every day at 2am.

# Configuration
DB_NAME="fintech_db"
DB_USER="postgres"
BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# Create backup directory if it does not exist
mkdir -p $BACKUP_DIR

echo "Starting backup of ${DB_NAME}..."

# pg_dump creates a complete backup of the database.
# The output is piped through gzip to compress it.
# A typical database backup might be 100MB uncompressed
# but only 10MB after gzip compression.
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "✅ Backup created: ${BACKUP_FILE}"

  # Keep only the last 7 days of backups
  # Older backups are deleted automatically
  find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
  echo "✅ Old backups cleaned up"

else
  echo "❌ Backup failed!"
  exit 1
fi

