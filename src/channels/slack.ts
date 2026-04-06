import { App } from '@slack/bolt';
import chalk from 'chalk';
import { Agent } from '../core/agent';
import { BaseChannel } from './base';
import { v4 as uuidv4 } from 'uuid';

export class SlackChannel implements BaseChannel {
  name = 'slack';
  private agent: Agent;
  private app: App;
  private sessions: Map<string, string> = new Map();
  private activeChannels: Set<string> = new Set();

  constructor(agent: Agent) {
    this.agent = agent;
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
    });
    agent.registerChannel(this);
  }

  async send(message: string): Promise<void> {
    for (const channelId of this.activeChannels) {
      try {
        await this.app.client.chat.postMessage({ channel: channelId, text: message });
      } catch {
        // ignore errors for individual channels
      }
    }
  }

  async start(): Promise<void> {
    this.app.message(async ({ message, say }: any) => {
      if (message.subtype) return;
      const key = `${message.channel}:${message.user}`;
      if (!this.sessions.has(key)) {
        this.sessions.set(key, uuidv4());
      }
      const sessionId = this.sessions.get(key)!;
      this.activeChannels.add(message.channel);

      try {
        const response = await this.agent.chat(message.text || '', 'slack', sessionId);
        await say(response);
      } catch (err: any) {
        await say(`Error: ${err.message}`);
      }
    });

    await this.app.start();
    console.log(chalk.green('✅ Slack channel ready'));
  }
}
