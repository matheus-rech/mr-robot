# 🤖 Mr. Robot — Personal AI Assistant

A self-hosted, privacy-first personal AI assistant that connects to all your messaging apps and gets smarter over time.

## Features

- 🧠 **Persistent Memory** — Remembers your preferences and conversation history across sessions using SQLite
- 🔌 **Multi-Channel** — Chat from Terminal, Telegram, Discord, Slack, or WhatsApp with one continuous conversation
- 🛠️ **Dynamic Skills** — Teach your assistant new skills; it saves them and can run them later
- 🔄 **LLM Flexibility** — Switch between OpenAI and OpenRouter without changing code
- 🌐 **Built-in Tools** — Web search (DuckDuckGo) and web page fetching
- ⏰ **Scheduler** — Set up recurring tasks like daily summaries
- 🎙️ **Voice** — Text-to-speech responses
- 🧙 **Setup Wizard** — Interactive CLI wizard for first-time setup

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Run Setup Wizard

```bash
npm run setup
```

This walks you through configuring:
- Your preferred LLM provider (OpenAI / OpenRouter)
- Which messaging channels to enable
- API keys and tokens
- Voice and scheduler settings

### 3. Build and Start

```bash
npm run build
npm start
```

Or run in development mode:

```bash
npm run dev
```

## Manual Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### LLM Providers

**OpenAI:**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

**OpenRouter:**
```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o
```

## Channel Setup

### Telegram
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the token to `TELEGRAM_BOT_TOKEN`

### Discord
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and add a bot
3. Copy the bot token to `DISCORD_BOT_TOKEN`
4. Enable "Message Content Intent" in the bot settings

### Slack
1. Create a new app at [api.slack.com](https://api.slack.com/apps)
2. Enable Socket Mode and generate an App Token
3. Add `chat:write` and `im:history` OAuth scopes
4. Install to workspace and copy the Bot Token

### WhatsApp
WhatsApp uses QR code authentication (no API key needed):
```env
WHATSAPP_ENABLED=true
ENABLED_CHANNELS=terminal,whatsapp
```
Scan the QR code that appears in the terminal on first run.

## Built-in Terminal Commands

| Command | Description |
|---------|-------------|
| `exit` / `quit` | Exit the assistant |
| `help` | Show available commands |
| `/skills` | List all saved skills |
| `/prefs` | Show remembered preferences |
| `/clear` | Start a new conversation session |

## Teaching New Skills

You can ask your assistant to create a new skill:

```
You: Show me how to calculate compound interest, then save it as a skill

🤖 Sure! Here's how compound interest works...
   I'll save this as a skill called "compound_interest".
   
You: Run the compound_interest skill with principal=1000,rate=5,years=10
```

## Scheduled Tasks

Ask your assistant to schedule recurring tasks:

```
You: Every morning at 9am, send me a weather summary for New York
```

Or enable the built-in daily summary:
```env
DAILY_SUMMARY_ENABLED=true
DAILY_SUMMARY_CRON=0 9 * * *
```

## Project Structure

```
src/
├── index.ts          # Main entry point
├── wizard.ts         # Setup wizard
├── core/
│   ├── agent.ts      # Main AI agent
│   ├── memory.ts     # SQLite memory system
│   ├── scheduler.ts  # Task scheduler
│   └── skills.ts     # Dynamic skills
├── llm/
│   ├── base.ts       # LLM interface
│   ├── openai.ts     # OpenAI provider
│   └── openrouter.ts # OpenRouter provider
├── channels/
│   ├── terminal.ts   # Terminal UI
│   ├── telegram.ts   # Telegram bot
│   ├── discord.ts    # Discord bot
│   ├── slack.ts      # Slack app
│   └── whatsapp.ts   # WhatsApp (Baileys)
├── tools/
│   ├── web-search.ts # DuckDuckGo search
│   └── web-fetch.ts  # Web page reader
└── voice/
    └── index.ts      # TTS/STT
```

## Privacy

- All data (conversations, preferences, skills) is stored locally in `mr-robot.db`
- Your API keys stay in your local `.env` file
- No data is sent to any third party except your chosen LLM provider

## License

MIT
