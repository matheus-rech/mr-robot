import { Bot } from 'grammy';
import chalk from 'chalk';
import { Agent } from '../core/agent';
import { BaseChannel } from './base';
import { v4 as uuidv4 } from 'uuid';

export class TelegramChannel implements BaseChannel {
  name = 'telegram';
  private agent: Agent;
  private bot: Bot;
  private sessions: Map<number, string> = new Map();

  constructor(agent: Agent) {
    this.agent = agent;
    this.bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
    agent.registerChannel(this);
  }

  async send(message: string): Promise<void> {
    for (const [chatId] of this.sessions) {
      try {
        await this.bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch {
        // ignore errors for individual chats
      }
    }
  }

  async start(): Promise<void> {
    this.bot.on('message:text', async (ctx) => {
      const chatId = ctx.chat.id;
      if (!this.sessions.has(chatId)) {
        this.sessions.set(chatId, uuidv4());
      }
      const sessionId = this.sessions.get(chatId)!;

      try {
        await ctx.replyWithChatAction('typing');
        const response = await this.agent.chat(ctx.message.text, 'telegram', sessionId);
        await ctx.reply(response, { parse_mode: 'Markdown' });
      } catch (err: any) {
        await ctx.reply(`Error: ${err.message}`);
      }
    });

    this.bot.catch((err) => {
      console.error(chalk.red('[Telegram] Error:'), err);
    });

    await this.bot.start();
    console.log(chalk.green('✅ Telegram channel ready'));
  }
}
