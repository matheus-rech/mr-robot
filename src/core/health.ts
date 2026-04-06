import http from 'http';
import chalk from 'chalk';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  checks: {
    database: boolean;
    agent: boolean;
    channels: number;
  };
}

export class HealthServer {
  private server: http.Server | null = null;
  private startTime: number = Date.now();
  private isAgentReady: boolean = false;
  private activeChannels: number = 0;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
  }

  setAgentReady(ready: boolean): void {
    this.isAgentReady = ready;
  }

  setActiveChannels(count: number): void {
    this.activeChannels = count;
  }

  start(): void {
    if (this.server) {
      console.warn(chalk.yellow('Health server already running'));
      return;
    }

    this.server = http.createServer((req, res) => {
      // CORS headers for potential web UI
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/health' && req.method === 'GET') {
        this.handleHealthCheck(req, res);
      } else if (req.url === '/metrics' && req.method === 'GET') {
        this.handleMetrics(req, res);
      } else if (req.url === '/' && req.method === 'GET') {
        this.handleRoot(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(this.port, () => {
      console.log(chalk.green(`✅ Health check server listening on port ${this.port}`));
      console.log(chalk.gray(`   - Health: http://localhost:${this.port}/health`));
      console.log(chalk.gray(`   - Metrics: http://localhost:${this.port}/metrics\n`));
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(chalk.yellow(`⚠️  Port ${this.port} already in use, health server disabled`));
      } else {
        console.error(chalk.red('Health server error:'), err);
      }
    });
  }

  private handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
    const status: HealthStatus = {
      status: this.isAgentReady ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: this.isAgentReady, // Agent ready implies DB is working
        agent: this.isAgentReady,
        channels: this.activeChannels,
      },
    };

    const statusCode = status.status === 'healthy' ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  private handleMetrics(req: http.IncomingMessage, res: http.ServerResponse): void {
    const metrics = {
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      application: {
        uptime: Date.now() - this.startTime,
        agentReady: this.isAgentReady,
        activeChannels: this.activeChannels,
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  }

  private handleRoot(req: http.IncomingMessage, res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Mr. Robot - Health Status</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; margin-top: 0; }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      margin: 10px 0;
    }
    .healthy { background: #d4edda; color: #155724; }
    .unhealthy { background: #f8d7da; color: #721c24; }
    .endpoint {
      background: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }
    .endpoint code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Mr. Robot</h1>
    <p>Personal AI Assistant - Health Monitor</p>

    <h2>Available Endpoints</h2>

    <div class="endpoint">
      <strong><code>GET /health</code></strong>
      <p>Health check endpoint for monitoring and container orchestration</p>
      <a href="/health">View Health Status</a>
    </div>

    <div class="endpoint">
      <strong><code>GET /metrics</code></strong>
      <p>Detailed application and system metrics</p>
      <a href="/metrics">View Metrics</a>
    </div>

    <h2>Documentation</h2>
    <p>For setup and usage instructions, see the <a href="https://github.com/matheus-rech/mr-robot">GitHub repository</a>.</p>
  </div>
</body>
</html>
`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  stop(): void {
    if (this.server) {
      this.server.close(() => {
        console.log(chalk.gray('Health server stopped'));
      });
      this.server = null;
    }
  }
}
