import express, { Request, Response } from 'express';
import cors from 'cors';
import { Agent } from './agent';
import chalk from 'chalk';

export class APIServer {
  private app: express.Application;
  private agent: Agent;
  private port: number;
  private server: any;

  constructor(agent: Agent, port: number = 3002) {
    this.agent = agent;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public')); // Serve static files from public directory
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

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
        const limitStr = typeof limitQuery === 'string'
          ? limitQuery
          : Array.isArray(limitQuery)
            ? limitQuery[0]
            : undefined;
        const parsedLimit = limitStr !== undefined
          ? parseInt(limitStr, 10)
          : DEFAULT_CONVERSATION_LIMIT;
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
    this.server = this.app.listen(this.port, () => {
      console.log(chalk.green(`🌐 API Server running on http://localhost:${this.port}`));
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      console.log(chalk.yellow('API Server stopped'));
    }
  }
}
