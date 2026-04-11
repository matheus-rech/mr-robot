# 🚀 New Features - Mr. Robot v1.1.0

## Major Enhancements

### 1. 🤖 Anthropic Claude Support

Mr. Robot now supports Anthropic's Claude models alongside OpenAI and OpenRouter!

**Configuration:**
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

**Available models:**
- claude-3-5-sonnet-20241022 (recommended)
- claude-3-opus-latest
- claude-3-haiku-latest

### 2. 🔄 Automatic Retry Logic

All LLM providers now include exponential backoff retry logic:
- **3 automatic retries** on transient failures
- **Exponential backoff** (1s, 2s, 4s)
- **Smart error handling** (no retry on auth/validation errors)
- **60-second timeout** per request

This makes Mr. Robot much more resilient to API rate limits and temporary network issues.

### 3. ⚡ Scheduler Hot-Reload

Scheduled tasks now activate **immediately** without requiring a restart!

**How it works:**
```
You: Schedule a daily reminder at 9am to exercise
🤖: Scheduled task "daily_reminder" created and activated.
    ← Task starts running immediately!
```

Previously, you had to restart the application. Now it's instant!

### 4. 🧮 Calculator Tool

Safe mathematical expression evaluation with VM sandboxing.

**Usage:**
```
You: Calculate 2 + 2 * 5
🤖: TOOL:calculator:2 + 2 * 5
    Result: 12

You: What's the square root of 144?
🤖: TOOL:calculator:sqrt(144)
    Result: 12
```

**Supported functions:**
- Basic arithmetic: +, -, *, /
- Math functions: sqrt, pow, abs, floor, ceil, round
- Trigonometry: sin, cos, tan
- Constants: PI, E

### 5. 📁 File Operations Tool

Manage files in a safe workspace directory.

**Operations:**
```json
TOOL:file_ops:{"operation":"write","filePath":"notes.txt","content":"My notes"}
TOOL:file_ops:{"operation":"read","filePath":"notes.txt"}
TOOL:file_ops:{"operation":"list","filePath":"."}
TOOL:file_ops:{"operation":"delete","filePath":"old.txt"}
```

**Features:**
- **Safe sandbox** - All operations restricted to `./workspace/` directory
- **Path validation** - Prevents directory traversal attacks
- **Auto-create directories** - Parent directories created automatically

### 6. 💾 Export/Import Conversations

Backup and restore your entire conversation history, preferences, and skills!

**Terminal Commands:**
```bash
/export [filename]           # Export to JSON
/import conversation.json    # Import from JSON
```

**Export includes:**
- All conversation messages
- User preferences
- Custom skills
- Metadata (version, timestamp)

**Merge mode:**
By default, imports merge with existing data (no data loss).

### 7. 🧪 Comprehensive Test Suite

Jest-based testing infrastructure with full coverage.

**Running tests:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
```

**Current coverage:**
- Calculator tool (safe evaluation, error handling)
- Memory operations (CRUD, export/import)
- More tests coming soon!

### 8. 🌐 Web Dashboard

Beautiful, modern web interface for managing Mr. Robot!

**Enable the API server:**
```env
API_SERVER_ENABLED=true
API_SERVER_PORT=3002
```

**Access:**
Open `http://localhost:3002` in your browser

**Features:**
- 💬 **Live chat interface** - Chat with Mr. Robot in the browser
- 📊 **Real-time stats** - Skills, preferences, message count
- 🎯 **Skills management** - View all your custom skills
- ⚙️ **Preferences viewer** - See all saved preferences
- 📥 **Export/Import** - Backup and restore from the UI

### 9. 🔌 REST API Server

Full-featured REST API for integrations and custom frontends.

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/skills` | List all skills |
| GET | `/api/preferences` | List preferences |
| GET | `/api/conversations/:sessionId` | Get conversation history |
| POST | `/api/chat` | Send chat message |
| GET | `/api/export` | Export conversations |
| POST | `/api/import` | Import conversations |
| GET | `/api/stats` | Get statistics |

**Example:**
```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!","sessionId":"web-session"}'
```

## Updated Tool Protocol

Mr. Robot's system prompt now includes all new tools:

```
TOOL:calculator:<expression>
TOOL:file_ops:<json>
TOOL:web_search:<query>         # Existing
TOOL:web_fetch:<url>            # Existing
TOOL:create_skill:<json>        # Existing
TOOL:run_skill:<name>:<args>    # Existing
TOOL:list_skills                # Existing
TOOL:set_preference:<key>=<val> # Existing
TOOL:schedule:<json>            # Existing (now with hot-reload!)
```

## Configuration Updates

**.env.example additions:**

```env
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# API Server (Web Dashboard)
API_SERVER_ENABLED=false
API_SERVER_PORT=3002
```

## Migration Guide

### From v1.0.0 to v1.1.0

1. **No breaking changes!** All existing functionality preserved.

2. **Optional: Install new dependencies** (if not using `npm install`):
   ```bash
   npm install express cors @types/express @types/cors jest ts-jest @types/jest
   ```

3. **Optional: Enable new features** in `.env`:
   ```env
   API_SERVER_ENABLED=true
   ```

4. **Optional: Try Anthropic**:
   ```env
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_key_here
   ```

## Performance Improvements

- **Faster responses** with retry logic (no manual retries needed)
- **Instant task activation** with scheduler hot-reload
- **Non-blocking I/O** for all database operations
- **Efficient sandboxing** for calculator and skills

## Security Enhancements

- **VM sandboxing** for calculator tool
- **Path validation** for file operations
- **Workspace isolation** prevents system file access
- **Input validation** on all API endpoints
- **CORS protection** on API server

## What's Next?

Stay tuned for upcoming features:
- More LLM providers (Google Gemini, local models)
- Enhanced web UI (dark mode, chat history)
- Voice input/output improvements
- Plugin system for community extensions
- Performance analytics dashboard

## Feedback

Have ideas for improvements? Open an issue on GitHub!

https://github.com/matheus-rech/mr-robot/issues
