# Production Deployment Guide

## Quick Start

### Docker Deployment (Recommended)

**1. Create environment file:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**2. Start with Docker Compose:**
```bash
docker-compose up -d
```

**3. Check health:**
```bash
curl http://localhost:3000/health
```

**4. View logs:**
```bash
docker-compose logs -f mr-robot
```

### Linux Server Installation

**One-line install:**
```bash
curl -fsSL https://raw.githubusercontent.com/matheus-rech/mr-robot/main/deployment/install.sh | bash
```

**Manual installation:**
```bash
# Clone repository
git clone https://github.com/matheus-rech/mr-robot.git
cd mr-robot

# Install dependencies
npm install

# Run setup wizard
npm run setup

# Build
npm run build

# Start
npm start
```

### Raspberry Pi Deployment

Mr. Robot fully supports Raspberry Pi (ARM64). Use the same Docker or Linux installation methods above.

**Requirements:**
- Raspberry Pi 3B+ or newer
- 64-bit OS (Raspberry Pi OS 64-bit, Ubuntu Server 64-bit)
- At least 1GB RAM available
- Node.js 20+ (automatically installed by script)

**Performance tip:** For Raspberry Pi, consider disabling terminal channel in production:
```bash
ENABLED_CHANNELS=telegram,discord  # No terminal
```

## Architecture

### Multi-Architecture Docker Images

Docker images are built for multiple architectures:
- `linux/amd64` - Standard x86_64 servers
- `linux/arm64` - ARM64 including Raspberry Pi

Docker automatically pulls the correct image for your platform.

### Health Check Endpoint

The health check server runs on port 3000 (configurable via `HEALTH_PORT`).

**Endpoints:**
- `GET /health` - Health status (used by Docker health checks)
- `GET /metrics` - Application and system metrics
- `GET /` - Web dashboard with endpoint documentation

**Health Response:**
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "uptime": 86400000,
  "version": "1.0.0",
  "checks": {
    "database": true,
    "agent": true,
    "channels": 2
  }
}
```

## MCP Server Integration

Mr. Robot can expose its capabilities as an MCP (Model Context Protocol) server, allowing other AI tools to use your assistant's skills and tools.

### Enabling MCP Server

Add to `.env`:
```bash
MCP_SERVER_ENABLED=true
MCP_SERVER_PORT=3001
MCP_SERVER_AUTH_TOKEN=your-secret-token
```

### MCP Capabilities

When enabled as an MCP server, Mr. Robot exposes:

1. **Skills as Tools** - All your custom skills become MCP tools
2. **Web Search** - DuckDuckGo search capability
3. **Web Fetch** - Web page content extraction
4. **Memory Access** - Query user preferences and conversation history
5. **Scheduler** - Create and manage scheduled tasks

### Using with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "mr-robot": {
      "url": "http://localhost:3001",
      "headers": {
        "Authorization": "Bearer your-secret-token"
      }
    }
  }
}
```

### Using with other MCP clients

```bash
# Test MCP connection
curl -H "Authorization: Bearer your-secret-token" \
  http://localhost:3001/mcp/tools

# Execute a tool
curl -X POST -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"tool":"web_search","args":"TypeScript tutorials"}' \
  http://localhost:3001/mcp/execute
```

## Systemd Service (Linux)

### Service Management

```bash
# Start service
sudo systemctl start mr-robot

# Stop service
sudo systemctl stop mr-robot

# Restart service
sudo systemctl restart mr-robot

# Enable auto-start on boot
sudo systemctl enable mr-robot

# Disable auto-start
sudo systemctl disable mr-robot

# Check status
sudo systemctl status mr-robot

# View logs
sudo journalctl -u mr-robot -f

# View last 100 lines
sudo journalctl -u mr-robot -n 100
```

### Service Location

- Service file: `/etc/systemd/system/mr-robot.service`
- Installation directory: `/opt/mr-robot`
- Data directory: `/opt/mr-robot/data`
- Config file: `/opt/mr-robot/.env`

### Updating

```bash
# Stop service
sudo systemctl stop mr-robot

# Download new version
cd /opt/mr-robot
sudo -u mrrobot git pull
sudo -u mrrobot npm install --production
sudo -u mrrobot npm run build

# Start service
sudo systemctl start mr-robot
```

## Docker Production Setup

### docker-compose.yml Configuration

```yaml
version: '3.8'

services:
  mr-robot:
    image: ghcr.io/matheus-rech/mr-robot:latest
    container_name: mr-robot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/data
      - ./baileys_auth_info:/app/baileys_auth_info
    ports:
      - "3000:3000"  # Health check
      - "3001:3001"  # MCP server (if enabled)
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Docker Commands

```bash
# Pull latest image
docker-compose pull

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Update to latest
docker-compose pull && docker-compose up -d
```

### Data Persistence

Important directories to persist:
- `./data` - SQLite database with messages, skills, preferences
- `./baileys_auth_info` - WhatsApp authentication (if using WhatsApp)

## Environment Variables

### Required

```bash
LLM_PROVIDER=openai|openrouter
OPENAI_API_KEY=sk-...          # If using OpenAI
OPENROUTER_API_KEY=sk-or-...   # If using OpenRouter
```

### Optional

```bash
# Health Check
HEALTH_ENABLED=true
HEALTH_PORT=3000

# MCP Server
MCP_SERVER_ENABLED=false
MCP_SERVER_PORT=3001
MCP_SERVER_AUTH_TOKEN=secret

# Channels
ENABLED_CHANNELS=terminal,telegram,discord,slack,whatsapp
TELEGRAM_BOT_TOKEN=...
DISCORD_BOT_TOKEN=...
SLACK_BOT_TOKEN=...
WHATSAPP_ENABLED=true

# Agent Configuration
AGENT_NAME=Mr. Robot
VOICE_ENABLED=false

# Scheduler
DAILY_SUMMARY_ENABLED=false
DAILY_SUMMARY_CRON=0 9 * * *
```

## Monitoring

### Health Checks

```bash
# Check if service is healthy
curl http://localhost:3000/health

# Check with Docker
docker exec mr-robot curl -f http://localhost:3000/health

# Monitor health
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

### Prometheus Metrics

Add to your Prometheus config:

```yaml
scrape_configs:
  - job_name: 'mr-robot'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Log Management

**Docker logs:**
```bash
docker-compose logs -f --tail=100 mr-robot
```

**Systemd logs:**
```bash
journalctl -u mr-robot -f
journalctl -u mr-robot --since "1 hour ago"
journalctl -u mr-robot --since "2024-01-01" --until "2024-01-02"
```

## Backup and Restore

### Backup

```bash
#!/bin/bash
# backup.sh - Backup Mr. Robot data

BACKUP_DIR="/backup/mr-robot"
DATA_DIR="/opt/mr-robot/data"  # or ./data for Docker

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup database
cp "$DATA_DIR/mr-robot.db" "$BACKUP_DIR/mr-robot-$TIMESTAMP.db"

# Backup WhatsApp auth (if exists)
if [ -d "/opt/mr-robot/baileys_auth_info" ]; then
    tar -czf "$BACKUP_DIR/baileys-$TIMESTAMP.tar.gz" /opt/mr-robot/baileys_auth_info
fi

# Keep only last 7 days
find "$BACKUP_DIR" -name "mr-robot-*.db" -mtime +7 -delete
find "$BACKUP_DIR" -name "baileys-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/mr-robot-$TIMESTAMP.db"
```

### Restore

```bash
#!/bin/bash
# restore.sh - Restore from backup

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh /backup/mr-robot/mr-robot-20240101_120000.db"
    exit 1
fi

# Stop service
sudo systemctl stop mr-robot  # or docker-compose down

# Restore database
cp "$BACKUP_FILE" /opt/mr-robot/data/mr-robot.db

# Start service
sudo systemctl start mr-robot  # or docker-compose up -d

echo "Restore completed"
```

### Automated Backups

Add to crontab:
```bash
# Backup every day at 3 AM
0 3 * * * /opt/mr-robot/deployment/backup.sh
```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use strong API keys
   - Rotate keys periodically

2. **File Permissions**
   ```bash
   chmod 600 .env
   chmod 600 data/mr-robot.db
   ```

3. **Network Security**
   - Use firewall rules to restrict port 3000 (health check)
   - For MCP server, use strong authentication tokens
   - Consider using reverse proxy with TLS

4. **Updates**
   - Subscribe to GitHub releases
   - Apply security updates promptly
   - Test updates in staging first

5. **Skill Sandboxing**
   - Skills run in vm.Script sandbox
   - No access to filesystem or network from skills
   - Review skills before execution

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u mr-robot -n 50

# Check configuration
cat /opt/mr-robot/.env

# Test manually
cd /opt/mr-robot
node dist/index.js
```

### Database locked

```bash
# Check for multiple instances
ps aux | grep "node.*mr-robot"

# Remove lock files
rm /opt/mr-robot/data/mr-robot.db-wal
rm /opt/mr-robot/data/mr-robot.db-shm
```

### Health check failing

```bash
# Test locally
curl -v http://localhost:3000/health

# Check if port is in use
sudo netstat -tlnp | grep 3000

# Check firewall
sudo ufw status
```

### Out of memory

```bash
# Check memory usage
docker stats mr-robot

# Increase Docker memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

## Performance Tuning

### Raspberry Pi Optimization

```bash
# Reduce memory usage
ENABLED_CHANNELS=telegram  # Disable unused channels
DAILY_SUMMARY_ENABLED=false  # Disable if not needed

# Use lightweight model
OPENROUTER_MODEL=openai/gpt-3.5-turbo  # Faster, cheaper
```

### Server Optimization

```bash
# Enable Node.js optimization flags
NODE_OPTIONS="--max-old-space-size=512"

# Adjust SQLite cache
# In future: Add SQLITE_CACHE_SIZE env var
```

## Support

- Documentation: https://github.com/matheus-rech/mr-robot
- Issues: https://github.com/matheus-rech/mr-robot/issues
- Discussions: https://github.com/matheus-rech/mr-robot/discussions
