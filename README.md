# 🤖 Mr. Robot — Personal AI Assistant

A self-hosted, privacy-first personal AI assistant that connects to all your messaging apps and gets smarter over time.

## Features

- 🧠 **Persistent Memory** — Remembers your preferences and conversation history across sessions using SQLite
- 🔌 **Multi-Channel** — Chat from Terminal, Telegram, Discord, Slack, or WhatsApp with one continuous conversation
- 🛠️ **Dynamic Skills** — Teach your assistant new skills; it saves them and can run them later
- 🔄 **LLM Flexibility** — Switch between OpenAI and OpenRouter without changing code
- 🌐 **Built-in Tools** — Web search (DuckDuckGo) and web page fetching with automatic content extraction
- ⏰ **Scheduler** — Set up recurring tasks like daily summaries using cron expressions
- 🎙️ **Voice** — Text-to-speech responses (TTS)
- 🧙 **Setup Wizard** — Interactive CLI wizard for first-time setup
- 🔒 **Privacy-First** — All data stored locally; no external tracking or data collection
- 🔄 **Session Management** — Separate conversation contexts across channels with persistent session tracking
- 📡 **Broadcast System** — Send messages simultaneously to all connected channels
- 🔧 **Extensible Architecture** — Easy to add new LLM providers, channels, and tools

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

## Architecture & Design

### Core Components

**Agent (`src/core/agent.ts`)** — The central orchestrator that:
- Manages conversation flow and context
- Builds dynamic system prompts with user preferences and available skills
- Processes tool calls using a custom protocol (`TOOL:<name>:<args>`)
- Implements automatic learning from conversation patterns
- Coordinates between LLM providers and tools

**Memory (`src/core/memory.ts`)** — SQLite-based persistence layer with four tables:
- `messages` — Full conversation history with session tracking
- `preferences` — Key-value store for user preferences (auto-learned and manual)
- `skills` — Dynamic JavaScript code snippets created at runtime
- `scheduled_tasks` — Cron-based recurring tasks with enable/disable status

**Skills Manager (`src/core/skills.ts`)** — Runtime code execution system:
- Compiles user-provided JavaScript code into executable functions
- Loads persisted skills from the database on startup
- Sandboxed execution with error handling
- Skills can accept arguments and return results asynchronously

**Scheduler (`src/core/scheduler.ts`)** — Cron-based task automation:
- Validates cron expressions before scheduling
- Executes scheduled tasks via the agent's chat interface
- Broadcasts results to all connected channels
- Supports daily summaries and custom recurring tasks

### Design Patterns

- **Strategy Pattern** — LLM providers implement a common interface for easy switching
- **Observer Pattern** — Channels register with the agent for broadcast messages
- **Repository Pattern** — Memory class abstracts all database operations
- **Factory Pattern** — Channels instantiated based on environment configuration
- **Dependency Injection** — Agent instance passed to channels and scheduler

### Tool Protocol

Mr. Robot uses a simple text-based protocol for tool execution:

```
User: "Search for TypeScript tutorials"
Agent: "Let me search for that. TOOL:web_search:TypeScript tutorials"
       ↓ (Regex extraction)
       ↓ (Tool execution)
       ↓ (Result returned to LLM)
Agent: "Here are the top results I found..."
```

**Available Tools:**
- `TOOL:web_search:<query>` — DuckDuckGo search (returns top 5 results)
- `TOOL:web_fetch:<url>` — Fetch and extract web page content (3000 char limit)
- `TOOL:create_skill:<json>` — Create new skill: `{"name":"...","description":"...","code":"..."}`
- `TOOL:run_skill:<name>:<args>` — Execute saved skill with arguments
- `TOOL:list_skills` — Show all available skills
- `TOOL:set_preference:<key>=<value>` — Store user preference
- `TOOL:schedule:<json>` — Persist a recurring task definition: `{"name":"...","cron":"...","action":"..."}`. Note: with the current implementation, newly added scheduled tasks are loaded by the scheduler on application startup, so they become active after a restart rather than immediately.

### Session Management

Each channel maintains separate session IDs (UUIDs) for conversation context:
- Terminal generates new session on startup or `/clear` command
- Telegram/Discord/Slack use chat/channel IDs as session keys
- WhatsApp uses contact IDs for session tracking
- Sessions persist conversation history across reconnects

### Automatic Learning

The agent automatically extracts and stores preferences from natural language:
- "I prefer dark mode" → `preference: dark mode`
- "My name is John" → `user_name: John`
- "Call me Alex" → `user_name: Alex`

Pattern matching runs on every user message without LLM overhead.

## Advanced Usage

### Creating Custom Skills

Skills are JavaScript code snippets that can be created conversationally:

```
You: Calculate factorial of 5, then save this as a skill

🤖: The factorial of 5 is 120. I'll save this as a skill.
    TOOL:create_skill:{"name":"factorial","description":"Calculate factorial of a number","code":"const n = parseInt(args); let result = 1; for(let i = 2; i <= n; i++) result *= i; return result;"}

You: Run factorial with 7
🤖: Using the factorial skill... The result is 5040.
```

Skills have access to the `args` parameter (string) and must return a value.

### Broadcast Messages

The scheduler uses the broadcast system to send messages to all connected channels:

```typescript
// Example: Daily summary at 9 AM
DAILY_SUMMARY_ENABLED=true
DAILY_SUMMARY_CRON=0 9 * * *
```

All active channels (Terminal, Telegram, Discord, Slack, WhatsApp) receive the message simultaneously.

### Multi-Model Support

OpenRouter provides access to hundreds of models:

```env
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
# or
OPENROUTER_MODEL=google/gemini-pro
# or
OPENROUTER_MODEL=meta-llama/llama-3-70b-instruct
```

### Web Scraping Details

The `web_fetch` tool:
- Removes scripts, styles, navigation, footers, ads automatically
- Extracts clean text from HTML using Cheerio
- Limits content to 3000 characters for LLM context
- 15-second timeout for slow pages
- Returns page title and body text

## Privacy

- All data (conversations, preferences, skills) is stored locally in `mr-robot.db`
- Your API keys stay in your local `.env` file
- No data is sent to any third party except your chosen LLM provider
- SQLite database location: `./mr-robot.db` (in project root)
- WhatsApp session data stored locally in `.wwebjs_auth/` directory

## Extending Mr. Robot

### Adding a New LLM Provider

1. Create a new file in `src/llm/` (e.g., `anthropic.ts`)
2. Implement the `LLMProvider` interface:
```typescript
import { LLMProvider, LLMMessage } from './base';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  async chat(messages: LLMMessage[]): Promise<string> {
    // Your implementation
  }
}
```
3. Register in `src/core/agent.ts` constructor
4. Add configuration to `.env.example`

### Adding a New Channel

1. Create a new file in `src/channels/` (e.g., `signal.ts`)
2. Implement the `BaseChannel` interface:
```typescript
import { BaseChannel } from './base';
import { Agent } from '../core/agent';

export class SignalChannel implements BaseChannel {
  name = 'signal';

  async start(): Promise<void> {
    // Initialize channel
  }

  async send(message: string): Promise<void> {
    // Send message to channel
  }
}
```
3. Register in `src/index.ts`
4. Add to `ENABLED_CHANNELS` configuration

### Adding a New Tool

1. Create a new file in `src/tools/` (e.g., `calculator.ts`)
2. Implement the `Tool` interface:
```typescript
import { Tool } from './base';

export class CalculatorTool implements Tool {
  name = 'calculator';
  description = 'Perform mathematical calculations';

  async execute(args: string): Promise<string> {
    // Your implementation
    return result;
  }
}
```
3. Register in `src/core/agent.ts` init method
4. Add to system prompt in `buildSystemPrompt()`

## Troubleshooting

### Database Issues

**"Database is locked" error:**
```bash
# Close all running instances and remove lock
rm mr-robot.db-wal mr-robot.db-shm
```

**Reset database:**
```bash
# Backup first!
mv mr-robot.db mr-robot.db.backup
# Restart app to create fresh database
npm start
```

### Channel Connection Issues

**Telegram not responding:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot is not blocked by user
- Ensure bot has privacy mode disabled in @BotFather

**Discord "Missing Access" error:**
- Enable "Message Content Intent" in Discord Developer Portal
- Verify bot has proper permissions in server
- Reinvite bot with correct OAuth2 scopes

**WhatsApp QR code not appearing:**
- Delete `.wwebjs_auth` directory and restart
- Ensure no other WhatsApp Web sessions are active
- Check the firewall isn't blocking WebSocket connections

### LLM Provider Issues

**"Invalid API key" error:**
```bash
# Verify key is set correctly
echo $OPENAI_API_KEY
# Check .env file has no extra spaces
cat .env | grep API_KEY
```

**Rate limit errors:**
- OpenAI: Check usage at platform.openai.com
- OpenRouter: Verify credits at openrouter.ai
- Consider implementing retry logic with exponential backoff

### Skills Not Loading

```bash
# Check skill compilation errors in console
npm run dev  # More verbose output

# List all skills in database
sqlite3 mr-robot.db "SELECT name, description FROM skills;"

# Delete problematic skill
sqlite3 mr-robot.db "DELETE FROM skills WHERE name='skill_name';"
```

## Development

### Running Tests
```bash
# Currently no tests - contributions welcome!
```

### Building from Source
```bash
npm install
npm run build
# Output in dist/
```

### Development Mode
```bash
npm run dev  # Uses ts-node for hot reloading
```

### Debugging
```bash
# Enable verbose logging
NODE_ENV=development npm run dev

# Check database contents
sqlite3 mr-robot.db
> .tables
> SELECT * FROM messages LIMIT 5;
> SELECT * FROM preferences;
> SELECT * FROM skills;
```

## Technical Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20+ | JavaScript execution environment |
| Language | TypeScript 5.3+ | Type-safe development |
| Database | better-sqlite3 | Local SQLite database |
| LLM Client | OpenAI SDK | GPT model access |
| Telegram | Grammy | Bot framework |
| Discord | discord.js 14 | Bot library |
| Slack | @slack/bolt | App framework |
| WhatsApp | Baileys | Client protocol |
| Scheduler | node-cron | Cron job execution |
| CLI | Inquirer | Interactive prompts |
| HTTP | Axios | Web requests |
| HTML Parser | Cheerio | Web scraping |
| TTS | say | Text-to-speech |
| UI | Chalk + Figlet | Terminal styling |

## Contributing

Contributions are welcome! Areas for improvement:
- Add unit tests and integration tests
- Support for more LLM providers (Anthropic, Google, local models)
- Additional channels (Matrix, IRC, SMS)
- More built-in tools (calculator, file operations, API calls)
- Conversation export/import functionality
- Web UI for management
- Docker container support
- Enhanced error handling and retry logic

## License

MIT
