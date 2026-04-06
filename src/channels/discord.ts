import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import chalk from 'chalk';
import { Agent } from '../core/agent';
import { BaseChannel } from './base';
import { v4 as uuidv4 } from 'uuid';

export class DiscordChannel implements BaseChannel {
  name = 'discord';
  private agent: Agent;
  private client: Client;
  private sessions: Map<string, string> = new Map();
  private activeChannels: Set<string> = new Set();

  constructor(agent: Agent) {
    this.agent = agent;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });
    agent.registerChannel(this);
  }

  async send(message: string): Promise<void> {
    for (const channelId of this.activeChannels) {
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
          await (channel as any).send(message);
        }
      } catch {
        // ignore errors for individual channels
      }
    }
  }

  async start(): Promise<void> {
    this.client.once(Events.ClientReady, () => {
      console.log(chalk.green(`✅ Discord channel ready (${this.client.user?.tag})`));
    });

    this.client.on(Events.MessageCreate, async (msg: Message) => {
      if (msg.author.bot) return;
      if (!msg.mentions.has(this.client.user!) && msg.guild) return;

      const key = `${msg.channelId}:${msg.author.id}`;
      if (!this.sessions.has(key)) {
        this.sessions.set(key, uuidv4());
      }
      const sessionId = this.sessions.get(key)!;
      this.activeChannels.add(msg.channelId);

      const content = msg.content.replace(/<@!?\d+>/g, '').trim();
      if (!content) return;

      try {
        await (msg.channel as any).sendTyping();
        const response = await this.agent.chat(content, 'discord', sessionId);
        await msg.reply(response);
      } catch (err: any) {
        await msg.reply(`Error: ${err.message}`);
      }
    });

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}
