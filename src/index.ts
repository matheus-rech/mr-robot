#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import figlet from 'figlet';
import { Agent } from './core/agent';
import { TerminalChannel } from './channels/terminal';
import { TelegramChannel } from './channels/telegram';
import { DiscordChannel } from './channels/discord';
import { SlackChannel } from './channels/slack';
import { WhatsAppChannel } from './channels/whatsapp';
import { Scheduler } from './core/scheduler';
import { HealthServer } from './core/health';
import { MCPServer } from './core/mcp-server';

async function main() {
  console.log(chalk.cyan(figlet.textSync('Mr. Robot', { horizontalLayout: 'full' })));
  console.log(chalk.gray('  Personal AI Assistant — always running, always learning\n'));

  // Start health check server if enabled
  const healthPort = parseInt(process.env.HEALTH_PORT || '3000', 10);
  const healthEnabled = process.env.HEALTH_ENABLED !== 'false';
  let healthServer: HealthServer | null = null;

  if (healthEnabled) {
    healthServer = new HealthServer(healthPort);
    healthServer.start();
  }

  const agent = new Agent();
  await agent.init();

  if (healthServer) {
    healthServer.setAgentReady(true);
  }

  // Start MCP server if enabled
  const mcpEnabled = process.env.MCP_SERVER_ENABLED === 'true';
  const mcpPort = parseInt(process.env.MCP_SERVER_PORT || '3001', 10);
  const mcpAuthToken = process.env.MCP_SERVER_AUTH_TOKEN;
  let mcpServer: MCPServer | null = null;

  if (mcpEnabled) {
    mcpServer = new MCPServer(agent, mcpPort, mcpAuthToken);
    mcpServer.start();
  }

  const enabledChannels = (process.env.ENABLED_CHANNELS || 'terminal').split(',').map(s => s.trim());

  const channels = [];

  if (enabledChannels.includes('terminal')) {
    channels.push(new TerminalChannel(agent));
  }
  if (enabledChannels.includes('telegram') && process.env.TELEGRAM_BOT_TOKEN) {
    channels.push(new TelegramChannel(agent));
  }
  if (enabledChannels.includes('discord') && process.env.DISCORD_BOT_TOKEN) {
    channels.push(new DiscordChannel(agent));
  }
  if (enabledChannels.includes('slack') && process.env.SLACK_BOT_TOKEN) {
    channels.push(new SlackChannel(agent));
  }
  if (enabledChannels.includes('whatsapp') && process.env.WHATSAPP_ENABLED === 'true') {
    channels.push(new WhatsAppChannel(agent));
  }

  if (healthServer) {
    healthServer.setActiveChannels(channels.length);
  }

  const scheduler = new Scheduler(agent);
  await scheduler.init();
  agent.setScheduler(scheduler);

  await Promise.all(channels.map(c => c.start()));

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\nReceived SIGTERM, shutting down gracefully...'));
    if (healthServer) {
      healthServer.stop();
    }
    if (mcpServer) {
      mcpServer.stop();
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nReceived SIGINT, shutting down gracefully...'));
    if (healthServer) {
      healthServer.stop();
    }
    if (mcpServer) {
      mcpServer.stop();
    }
    process.exit(0);
  });
}

main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
