#!/bin/bash
# Backup script for Mr. Robot data
# Usage: ./backup.sh [backup_directory]

set -e

# Configuration
BACKUP_DIR="${1:-/backup/mr-robot}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Detect if running in Docker or local
if [ -f "/.dockerenv" ]; then
    DATA_DIR="/data"
    BAILEYS_DIR="/app/baileys_auth_info"
else
    DATA_DIR="${DATA_DIR:-./data}"
    BAILEYS_DIR="${BAILEYS_DIR:-./baileys_auth_info}"
fi

echo "🤖 Mr. Robot Backup Script"
echo "=========================="
echo "Timestamp: $TIMESTAMP"
echo "Backup directory: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup SQLite database
if [ -f "$DATA_DIR/mr-robot.db" ]; then
    echo "📦 Backing up database..."
    cp "$DATA_DIR/mr-robot.db" "$BACKUP_DIR/mr-robot-$TIMESTAMP.db"

    # Create compressed backup
    gzip -c "$DATA_DIR/mr-robot.db" > "$BACKUP_DIR/mr-robot-$TIMESTAMP.db.gz"

    echo "✅ Database backup: mr-robot-$TIMESTAMP.db.gz"
else
    echo "⚠️  Database not found at: $DATA_DIR/mr-robot.db"
fi

# Backup WhatsApp/Baileys auth if exists
if [ -d "$BAILEYS_DIR" ] && [ "$(ls -A $BAILEYS_DIR 2>/dev/null)" ]; then
    echo "📦 Backing up WhatsApp authentication..."
    tar -czf "$BACKUP_DIR/baileys-$TIMESTAMP.tar.gz" -C "$(dirname $BAILEYS_DIR)" "$(basename $BAILEYS_DIR)"
    echo "✅ WhatsApp backup: baileys-$TIMESTAMP.tar.gz"
fi

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "💾 Backup size: $BACKUP_SIZE"

# Cleanup old backups
if [ "$RETENTION_DAYS" -gt 0 ]; then
    echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "mr-robot-*.db" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "mr-robot-*.db.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "baileys-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
fi

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lht "$BACKUP_DIR" | head -10

echo ""
echo "✅ Backup completed successfully!"
echo "Location: $BACKUP_DIR"
