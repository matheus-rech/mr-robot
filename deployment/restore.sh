#!/bin/bash
# Restore script for Mr. Robot data
# Usage: ./restore.sh <backup_file>

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo ""
    echo "Examples:"
    echo "  ./restore.sh /backup/mr-robot/mr-robot-20240101_120000.db"
    echo "  ./restore.sh /backup/mr-robot/mr-robot-20240101_120000.db.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🤖 Mr. Robot Restore Script"
echo "==========================="
echo "Backup file: $BACKUP_FILE"
echo ""

# Detect if running in Docker or local
if [ -f "/.dockerenv" ]; then
    DATA_DIR="/data"
    SERVICE_CMD="docker-compose restart"
else
    DATA_DIR="${DATA_DIR:-./data}"
    if systemctl is-active --quiet mr-robot; then
        SERVICE_CMD="sudo systemctl restart mr-robot"
    else
        SERVICE_CMD="echo 'Please restart manually'"
    fi
fi

# Confirm before proceeding
read -p "⚠️  This will overwrite the current database. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Stop service
echo "🛑 Stopping service..."
if [ -f "/.dockerenv" ]; then
    echo "   (Please stop docker-compose manually)"
else
    if systemctl is-active --quiet mr-robot 2>/dev/null; then
        sudo systemctl stop mr-robot
    fi
fi

# Create backup of current database
if [ -f "$DATA_DIR/mr-robot.db" ]; then
    echo "💾 Creating backup of current database..."
    cp "$DATA_DIR/mr-robot.db" "$DATA_DIR/mr-robot.db.pre-restore-$(date +%Y%m%d_%H%M%S)"
fi

# Restore database
echo "📦 Restoring database..."
mkdir -p "$DATA_DIR"

if [[ "$BACKUP_FILE" == *.gz ]]; then
    # Decompress and restore
    gunzip -c "$BACKUP_FILE" > "$DATA_DIR/mr-robot.db"
else
    # Direct copy
    cp "$BACKUP_FILE" "$DATA_DIR/mr-robot.db"
fi

# Set permissions
if [ ! -f "/.dockerenv" ]; then
    if id "mrrobot" &>/dev/null; then
        sudo chown mrrobot:mrrobot "$DATA_DIR/mr-robot.db"
    fi
fi

echo "✅ Database restored successfully!"

# Start service
echo "🚀 Starting service..."
eval $SERVICE_CMD

echo ""
echo "✅ Restore completed!"
echo "Location: $DATA_DIR/mr-robot.db"
