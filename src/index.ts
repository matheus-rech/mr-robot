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

async function main() {
  console.log(chalk.cyan(figlet.textSync('Mr. Robot', { horizontalLayout: 'full' })));
  console.log(chalk.gray('  Personal AI Assistant — always running, always learning\n'));

  const agent = new Agent();
  await agent.init();

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

  const scheduler = new Scheduler(agent);
  await scheduler.init();

  await Promise.all(channels.map(c => c.start()));
}

main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
