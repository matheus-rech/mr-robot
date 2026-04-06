# 🚀 Quick Start Guide - Mr. Robot

## Choose Your Deployment Method

### 🐳 Option 1: Docker (Recommended for Production)

**Best for:** Linux servers, Raspberry Pi, production deployments

1. **Install Docker and Docker Compose**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. **Clone and configure**
   ```bash
   git clone https://github.com/matheus-rech/mr-robot.git
   cd mr-robot
   cp .env.example .env
   nano .env  # Edit with your API keys
   ```

3. **Start the service**
   ```bash
   docker-compose up -d
   ```

4. **Check status**
   ```bash
   docker-compose logs -f
   curl http://localhost:3000/health
   ```

**That's it!** Mr. Robot is now running in the background.

---

### 🔧 Option 2: One-Line Linux Install

**Best for:** Linux servers, VPS, Ubuntu/Debian systems

```bash
curl -fsSL https://raw.githubusercontent.com/matheus-rech/mr-robot/main/deployment/install.sh | bash
```

This script will:
- ✅ Install Node.js if needed
- ✅ Download the latest release
- ✅ Run the setup wizard
- ✅ Create systemd service
- ✅ Optionally start the service

**Manage the service:**
```bash
sudo systemctl start mr-robot    # Start
sudo systemctl stop mr-robot     # Stop
sudo systemctl status mr-robot   # Check status
sudo journalctl -u mr-robot -f   # View logs
```

---

### 💻 Option 3: From Source (Development)

**Best for:** Development, testing, customization

1. **Prerequisites**
   - Node.js 20+ installed
   - npm or yarn

2. **Install and setup**
   ```bash
   git clone https://github.com/matheus-rech/mr-robot.git
   cd mr-robot
   npm install
   npm run setup  # Interactive configuration wizard
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Or build and run in production mode**
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 Quick Configuration

### Minimum Required Setup

You only need an LLM API key to get started:

**For OpenAI:**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

**For OpenRouter (access 100+ models):**
```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o
```

### Adding Messaging Channels (Optional)

**Telegram:**
1. Message [@BotFather](https://t.me/botfather)
2. Create bot with `/newbot`
3. Add token to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your-token
   ENABLED_CHANNELS=terminal,telegram
   ```

**Discord:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application → Add bot
3. Copy token:
   ```env
   DISCORD_BOT_TOKEN=your-token
   ENABLED_CHANNELS=terminal,discord
   ```

**WhatsApp:**
```env
WHATSAPP_ENABLED=true
ENABLED_CHANNELS=terminal,whatsapp
```
Scan QR code on first run.

---

## 🎯 First Steps

1. **Test the terminal interface**
   - Type: `help`
   - Try: "What's the weather in Tokyo?"
   - Ask: "Remember that I prefer dark mode"

2. **Check health endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Create your first skill**
   - "Calculate compound interest, then save it as a skill"
   - "Run the compound_interest skill with principal=1000,rate=5,years=10"

4. **Set up a scheduled task**
   - "Every morning at 9am, send me a motivational quote"

---

## 🔍 Verification

**Is it running?**
```bash
# Docker
docker-compose ps
docker-compose logs --tail=50

# Systemd
sudo systemctl status mr-robot
sudo journalctl -u mr-robot --since "5 minutes ago"

# Health check
curl http://localhost:3000/health
```

**Expected health response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "agent": true,
    "channels": 1
  }
}
```

---

## 🆘 Troubleshooting

### Docker Issues

**Container won't start:**
```bash
docker-compose logs
docker-compose down
docker-compose up
```

**Permission denied:**
```bash
sudo chown -R 1001:1001 ./data ./baileys_auth_info
```

### Linux Install Issues

**Service fails to start:**
```bash
sudo journalctl -u mr-robot -n 50
cat /opt/mr-robot/.env  # Check configuration
```

**Port already in use:**
```bash
# Find what's using port 3000
sudo netstat -tlnp | grep 3000
# Change port in .env
HEALTH_PORT=3100
```

### General Issues

**API key not working:**
- Check for extra spaces in `.env`
- Verify key is active at provider's dashboard
- Test key with curl:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer YOUR_KEY"
  ```

**Database locked:**
```bash
# Stop all instances
docker-compose down
# Or
sudo systemctl stop mr-robot
# Remove lock files
rm data/mr-robot.db-wal data/mr-robot.db-shm
```

---

## 📚 Next Steps

- Read the full [README.md](README.md) for all features
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production best practices
- Learn about [MCP Server integration](DEPLOYMENT.md#mcp-server-integration)
- Join discussions at [GitHub Discussions](https://github.com/matheus-rech/mr-robot/discussions)

---

## 🎓 Learn More

**Key Features to Explore:**

1. **Skills System** - Teach your assistant new capabilities
2. **Scheduler** - Automate recurring tasks with cron
3. **Multi-Channel** - Connect all your messaging apps
4. **Memory** - Persistent conversations and preferences
5. **MCP Server** - Expose your assistant as a tool for other AIs
6. **Web Tools** - Built-in search and web scraping

**Commands:**

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `/skills` | List saved skills |
| `/prefs` | Show preferences |
| `/clear` | Start new conversation |

---

## ⚡ Performance Tips

**For Raspberry Pi:**
```env
ENABLED_CHANNELS=telegram  # Disable terminal in production
OPENROUTER_MODEL=openai/gpt-3.5-turbo  # Use faster model
```

**For Docker:**
```yaml
# In docker-compose.yml, adjust memory:
deploy:
  resources:
    limits:
      memory: 1G  # Increase if needed
```

---

**Need help?** Open an issue at [GitHub Issues](https://github.com/matheus-rech/mr-robot/issues)

**Ready for production?** See [DEPLOYMENT.md](DEPLOYMENT.md) for advanced configuration.
