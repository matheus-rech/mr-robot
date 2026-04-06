import http from 'http';
import { Agent } from './agent';
import chalk from 'chalk';

interface MCPTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

interface MCPRequest {
  tool: string;
  args: string | Record<string, any>;
  sessionId?: string;
}

export class MCPServer {
  private server: http.Server | null = null;
  private agent: Agent;
  private port: number;
  private authToken: string | null;

  constructor(agent: Agent, port: number = 3001, authToken?: string) {
    this.agent = agent;
    this.port = port;
    this.authToken = authToken || null;
  }

  start(): void {
    if (this.server) {
      console.warn(chalk.yellow('MCP server already running'));
      return;
    }

    this.server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Authentication check
      if (this.authToken) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${this.authToken}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
      }

      // Route handling
      if (req.url === '/mcp/tools' && req.method === 'GET') {
        await this.handleListTools(req, res);
      } else if (req.url === '/mcp/execute' && req.method === 'POST') {
        await this.handleExecute(req, res);
      } else if (req.url === '/mcp/info' && req.method === 'GET') {
        this.handleInfo(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(this.port, () => {
      console.log(chalk.green(`✅ MCP server listening on port ${this.port}`));
      console.log(chalk.gray(`   - Tools: http://localhost:${this.port}/mcp/tools`));
      console.log(chalk.gray(`   - Execute: http://localhost:${this.port}/mcp/execute`));
      if (this.authToken) {
        console.log(chalk.gray(`   - Auth: Bearer token required\n`));
      }
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(chalk.yellow(`⚠️  Port ${this.port} already in use, MCP server disabled`));
      } else {
        console.error(chalk.red('MCP server error:'), err);
      }
    });
  }

  private async handleListTools(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const tools: MCPTool[] = [
      {
        name: 'web_search',
        description: 'Search the web using DuckDuckGo. Returns top search results with titles, snippets, and URLs.',
        parameters: {
          query: {
            type: 'string',
            description: 'Search query',
            required: true,
          },
        },
      },
      {
        name: 'web_fetch',
        description: 'Fetch and extract content from a web page. Returns clean text content with title.',
        parameters: {
          url: {
            type: 'string',
            description: 'URL to fetch',
            required: true,
          },
        },
      },
      {
        name: 'list_skills',
        description: 'List all available custom skills created by the user.',
      },
      {
        name: 'run_skill',
        description: 'Execute a saved skill by name with optional arguments.',
        parameters: {
          name: {
            type: 'string',
            description: 'Skill name',
            required: true,
          },
          args: {
            type: 'string',
            description: 'Arguments to pass to the skill',
            required: false,
          },
        },
      },
      {
        name: 'get_preferences',
        description: 'Get user preferences stored in memory.',
      },
      {
        name: 'set_preference',
        description: 'Store a user preference.',
        parameters: {
          key: {
            type: 'string',
            description: 'Preference key',
            required: true,
          },
          value: {
            type: 'string',
            description: 'Preference value',
            required: true,
          },
        },
      },
    ];

    // Add custom skills as tools
    const skills = this.agent.listSkills();
    for (const skill of skills) {
      tools.push({
        name: `skill_${skill.name}`,
        description: `Custom skill: ${skill.description}`,
        parameters: {
          args: {
            type: 'string',
            description: 'Arguments for the skill',
            required: false,
          },
        },
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools }, null, 2));
  }

  private async handleExecute(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const request: MCPRequest = JSON.parse(body);

        if (!request.tool) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing tool name' }));
          return;
        }

        const sessionId = request.sessionId || 'mcp-session';
        let result: string;

        // Execute tool via agent's chat interface
        const toolCall = this.buildToolCall(request.tool, request.args);
        result = await this.agent.chat(toolCall, 'mcp', sessionId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }, null, 2));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  private handleInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
    const info = {
      name: 'Mr. Robot MCP Server',
      version: '1.0.0',
      description: 'Personal AI Assistant exposed as MCP server',
      capabilities: [
        'web_search',
        'web_fetch',
        'custom_skills',
        'user_preferences',
        'conversation_memory',
      ],
      authentication: this.authToken ? 'Bearer token' : 'None',
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info, null, 2));
  }

  private buildToolCall(tool: string, args: string | Record<string, any>): string {
    let argsStr: string;

    if (typeof args === 'string') {
      argsStr = args;
    } else if (typeof args === 'object') {
      // Convert object to appropriate format for each tool
      if (tool === 'run_skill') {
        argsStr = `${args.name}:${args.args || ''}`;
      } else if (tool === 'set_preference') {
        argsStr = `${args.key}=${args.value}`;
      } else {
        // For simple tools, use the first value or JSON string
        argsStr = Object.values(args)[0] as string || JSON.stringify(args);
      }
    } else {
      argsStr = '';
    }

    return `Execute tool: TOOL:${tool}:${argsStr}`;
  }

  stop(): void {
    if (this.server) {
      this.server.close(() => {
        console.log(chalk.gray('MCP server stopped'));
      });
      this.server = null;
    }
  }
}
