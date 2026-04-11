import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Agent } from './agent';
import chalk from 'chalk';

export class APIServer {
  private app: express.Application;
  private agent: Agent;
  private port: number;
  private host: string;
  private server: any;
  private apiToken: string | undefined;
  /** Simple in-memory rate limiter: ip -> { count, windowStart } */
  private authAttempts: Map<string, { count: number; windowStart: number }> = new Map();
  private static readonly AUTH_RATE_LIMIT = 10;    // max failed auth attempts
  private static readonly AUTH_WINDOW_MS  = 60_000; // per 60-second window

  constructor(agent: Agent, port: number = 3002) {
    this.agent = agent;
    this.port = port;
    // Bind to localhost by default to prevent unintended remote access.
    // Set API_SERVER_HOST=0.0.0.0 to override (e.g. inside a container).
    this.host = process.env.API_SERVER_HOST || '127.0.0.1';
    this.apiToken = process.env.API_SERVER_TOKEN;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Restrict CORS to the configured origin (or same-origin only if not set).
    const allowedOrigin = process.env.API_SERVER_CORS_ORIGIN;
    this.app.use(cors(allowedOrigin ? { origin: allowedOrigin } : { origin: false }));
    this.app.use(express.json());
    this.app.use(express.static('public')); // Serve static files from public directory
  }

  /**
   * Bearer-token middleware with rate limiting on failed attempts.
   * Skips auth for the health endpoint and when no token is configured.
   */
  private requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!this.apiToken) {
      // No token configured – allow all requests (development mode).
      next();
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const record = this.authAttempts.get(ip);

    // Reset window if expired
    if (!record || now - record.windowStart > APIServer.AUTH_WINDOW_MS) {
      this.authAttempts.set(ip, { count: 0, windowStart: now });
    }

    const current = this.authAttempts.get(ip)!;
    if (current.count >= APIServer.AUTH_RATE_LIMIT) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    const auth = req.headers['authorization'] ?? '';
    if (auth === `Bearer ${this.apiToken}`) {
      // Successful auth – reset counter for this IP
      this.authAttempts.delete(ip);
      next();
      return;
    }

    current.count++;
    res.status(401).json({ error: 'Unauthorized' });
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // All other API routes require authentication when a token is configured.
    this.app.use('/api', (req: Request, res: Response, next: NextFunction) => this.requireAuth(req, res, next));

    // Get skills
    this.app.get('/api/skills', async (req: Request, res: Response) => {
      try {
        const skills = this.agent.listSkills();
        res.json({ skills });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get preferences
    this.app.get('/api/preferences', async (req: Request, res: Response) => {
      try {
        const prefs = await this.agent.memory.getAllPreferences();
        res.json({ preferences: prefs });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get conversation history
    this.app.get('/api/conversations/:sessionId', async (req: Request, res: Response) => {
      try {
        const sessionIdParam = req.params.sessionId;
        const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;

        const DEFAULT_CONVERSATION_LIMIT = 50;
        const MAX_CONVERSATION_LIMIT = 200;
        const limitQuery = req.query.limit;
        const limitStr: string | undefined = typeof limitQuery === 'string'
          ? limitQuery
          : Array.isArray(limitQuery) && typeof limitQuery[0] === 'string'
            ? limitQuery[0] as string
            : undefined;
        const parsedLimit = limitStr !== undefined ? parseInt(limitStr, 10) : DEFAULT_CONVERSATION_LIMIT;
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, MAX_CONVERSATION_LIMIT)
          : DEFAULT_CONVERSATION_LIMIT;

        const messages = await this.agent.memory.getConversationHistory(sessionId, limit);
        res.json({ messages });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Send chat message
    this.app.post('/api/chat', async (req: Request, res: Response) => {
      try {
        const { message, sessionId } = req.body;
        if (!message || !sessionId) {
          return res.status(400).json({ error: 'message and sessionId are required' });
        }

        const response = await this.agent.chat(message, 'api', sessionId);
        res.json({ response });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export conversation
    this.app.get('/api/export', async (req: Request, res: Response) => {
      try {
        const sessionIdQuery = req.query.sessionId;
        const sessionId = typeof sessionIdQuery === 'string' ? sessionIdQuery : undefined;
        const exportData = await this.agent.memory.exportConversation(sessionId);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="mr-robot-export-${Date.now()}.json"`);
        res.send(exportData);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Import conversation
    this.app.post('/api/import', async (req: Request, res: Response) => {
      try {
        const { data, mergeMode } = req.body;
        if (!data) {
          return res.status(400).json({ error: 'data is required' });
        }

        const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
        const result = await this.agent.memory.importConversation(jsonData, mergeMode || false);
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get stats
    this.app.get('/api/stats', async (req: Request, res: Response) => {
      try {
        const skills = this.agent.listSkills();
        const prefs = await this.agent.memory.getAllPreferences();
        const recentMessages = await this.agent.memory.getRecentMessages(100);

        res.json({
          skillCount: skills.length,
          preferenceCount: prefs.length,
          messageCount: recentMessages.length,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  start(): void {
    this.server = this.app.listen(this.port, this.host, () => {
      console.log(chalk.green(`🌐 API Server running on http://${this.host}:${this.port}`));
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      console.log(chalk.yellow('API Server stopped'));
    }
  }
}
