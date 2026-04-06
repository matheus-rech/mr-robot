import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import * as path from 'path';
import { Agent } from '../core/agent';
import { BaseChannel } from './base';
import { v4 as uuidv4 } from 'uuid';

export class WhatsAppChannel implements BaseChannel {
  name = 'whatsapp';
  private agent: Agent;
  private sock: any = null;
  private sessions: Map<string, string> = new Map();
  private activeChats: Set<string> = new Set();

  constructor(agent: Agent) {
    this.agent = agent;
    agent.registerChannel(this);
  }

  async send(message: string): Promise<void> {
    if (!this.sock) return;
    for (const jid of this.activeChats) {
      try {
        await this.sock.sendMessage(jid, { text: message });
      } catch {
        // ignore errors for individual chats
      }
    }
  }

  async start(): Promise<void> {
    const authPath = path.join(process.cwd(), 'baileys_auth_info');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const connectWA = async () => {
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            console.log(chalk.yellow('[WhatsApp] Reconnecting...'));
            connectWA();
          } else {
            console.log(chalk.red('[WhatsApp] Logged out'));
          }
        } else if (connection === 'open') {
          console.log(chalk.green('✅ WhatsApp channel ready'));
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages: msgs, type }: any) => {
        if (type !== 'notify') return;
        for (const msg of msgs) {
          if (!msg.message || msg.key.fromMe) continue;
          const jid = msg.key.remoteJid;
          if (!jid) continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

          if (!text) continue;
          this.activeChats.add(jid);

          if (!this.sessions.has(jid)) {
            this.sessions.set(jid, uuidv4());
          }
          const sessionId = this.sessions.get(jid)!;

          try {
            const response = await this.agent.chat(text, 'whatsapp', sessionId);
            await this.sock!.sendMessage(jid, { text: response });
          } catch (err: any) {
            await this.sock!.sendMessage(jid, { text: `Error: ${err.message}` });
          }
        }
      });
    };

    await connectWA();
    await new Promise<void>((resolve) => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
  }
}
