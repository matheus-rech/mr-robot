import Database from 'better-sqlite3';
import * as path from 'path';

export interface Message {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  channel: string;
  timestamp: number;
  sessionId: string;
}

export interface Preference {
  key: string;
  value: string;
  updatedAt: number;
}

export class Memory {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const p = dbPath || path.join(process.cwd(), 'mr-robot.db');
    this.db = new Database(p);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'terminal',
        timestamp INTEGER NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS skills (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        code TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cron TEXT NOT NULL,
        action TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
    `);
  }

  addMessage(msg: Omit<Message, 'id'>): void {
    this.db.prepare(
      'INSERT INTO messages (role, content, channel, timestamp, session_id) VALUES (?, ?, ?, ?, ?)'
    ).run(msg.role, msg.content, msg.channel, msg.timestamp, msg.sessionId);
  }

  getRecentMessages(limit = 20, channel?: string): Message[] {
    if (channel) {
      return this.db.prepare(
        'SELECT * FROM messages WHERE channel = ? ORDER BY timestamp DESC LIMIT ?'
      ).all(channel, limit) as Message[];
    }
    return this.db.prepare(
      'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as Message[];
  }

  getConversationHistory(sessionId: string, limit = 50): Message[] {
    return this.db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?'
    ).all(sessionId, limit) as Message[];
  }

  setPreference(key: string, value: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, ?)'
    ).run(key, value, Date.now());
  }

  getPreference(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM preferences WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  getAllPreferences(): Preference[] {
    return this.db.prepare('SELECT * FROM preferences').all() as Preference[];
  }

  saveSkill(name: string, description: string, code: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO skills (name, description, code, created_at) VALUES (?, ?, ?, ?)'
    ).run(name, description, code, Date.now());
  }

  getSkill(name: string): { name: string; description: string; code: string } | undefined {
    return this.db.prepare('SELECT * FROM skills WHERE name = ?').get(name) as { name: string; description: string; code: string } | undefined;
  }

  getAllSkills(): Array<{ name: string; description: string; code: string }> {
    return this.db.prepare('SELECT * FROM skills').all() as Array<{ name: string; description: string; code: string }>;
  }

  deleteSkill(name: string): void {
    this.db.prepare('DELETE FROM skills WHERE name = ?').run(name);
  }

  addScheduledTask(id: string, name: string, cron: string, action: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO scheduled_tasks (id, name, cron, action, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)'
    ).run(id, name, cron, action, Date.now());
  }

  getScheduledTasks(): Array<{ id: string; name: string; cron: string; action: string; enabled: number }> {
    return this.db.prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1').all() as Array<{ id: string; name: string; cron: string; action: string; enabled: number }>;
  }

  close(): void {
    this.db.close();
  }
}
