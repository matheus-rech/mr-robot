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

  // Helper to wrap sync DB operations in async non-blocking wrapper
  private async runAsync<T>(fn: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          resolve(fn());
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // Async wrapper for adding message to avoid blocking
  async addMessage(msg: Omit<Message, 'id'>): Promise<void> {
    return this.runAsync(() => {
      this.db.prepare(
        'INSERT INTO messages (role, content, channel, timestamp, session_id) VALUES (?, ?, ?, ?, ?)'
      ).run(msg.role, msg.content, msg.channel, msg.timestamp, msg.sessionId);
    });
  }

  // Async wrapper for getting recent messages
  async getRecentMessages(limit = 20, channel?: string): Promise<Message[]> {
    return this.runAsync(() => {
      if (channel) {
        return this.db.prepare(
          'SELECT * FROM messages WHERE channel = ? ORDER BY timestamp DESC LIMIT ?'
        ).all(channel, limit) as Message[];
      }
      return this.db.prepare(
        'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?'
      ).all(limit) as Message[];
    });
  }

  // Async wrapper for getting conversation history
  async getConversationHistory(sessionId: string, limit = 50): Promise<Message[]> {
    return this.runAsync(() => {
      return this.db.prepare(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?'
      ).all(sessionId, limit) as Message[];
    });
  }

  // Async wrapper for setting preference
  async setPreference(key: string, value: string): Promise<void> {
    return this.runAsync(() => {
      this.db.prepare(
        'INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, ?)'
      ).run(key, value, Date.now());
    });
  }

  // Async wrapper for getting preference
  async getPreference(key: string): Promise<string | undefined> {
    return this.runAsync(() => {
      const row = this.db.prepare('SELECT value FROM preferences WHERE key = ?').get(key) as { value: string } | undefined;
      return row?.value;
    });
  }

  // Async wrapper for getting all preferences
  async getAllPreferences(): Promise<Preference[]> {
    return this.runAsync(() => {
      return this.db.prepare('SELECT * FROM preferences').all() as Preference[];
    });
  }

  // Async wrapper for saving skill
  async saveSkill(name: string, description: string, code: string): Promise<void> {
    return this.runAsync(() => {
      this.db.prepare(
        'INSERT OR REPLACE INTO skills (name, description, code, created_at) VALUES (?, ?, ?, ?)'
      ).run(name, description, code, Date.now());
    });
  }

  // Async wrapper for getting skill
  async getSkill(name: string): Promise<{ name: string; description: string; code: string } | undefined> {
    return this.runAsync(() => {
      return this.db.prepare('SELECT * FROM skills WHERE name = ?').get(name) as { name: string; description: string; code: string } | undefined;
    });
  }

  // Async wrapper for getting all skills
  async getAllSkills(): Promise<Array<{ name: string; description: string; code: string }>> {
    return this.runAsync(() => {
      return this.db.prepare('SELECT * FROM skills').all() as Array<{ name: string; description: string; code: string }>;
    });
  }

  // Async wrapper for deleting skill
  async deleteSkill(name: string): Promise<void> {
    return this.runAsync(() => {
      this.db.prepare('DELETE FROM skills WHERE name = ?').run(name);
    });
  }

  // Async wrapper for adding scheduled task
  async addScheduledTask(id: string, name: string, cron: string, action: string): Promise<void> {
    return this.runAsync(() => {
      this.db.prepare(
        'INSERT OR REPLACE INTO scheduled_tasks (id, name, cron, action, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)'
      ).run(id, name, cron, action, Date.now());
    });
  }

  // Async wrapper for getting scheduled tasks
  async getScheduledTasks(): Promise<Array<{ id: string; name: string; cron: string; action: string; enabled: number }>> {
    return this.runAsync(() => {
      return this.db.prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1').all() as Array<{ id: string; name: string; cron: string; action: string; enabled: number }>;
    });
  }

  // Export conversation history to JSON
  async exportConversation(sessionId?: string): Promise<string> {
    return this.runAsync(() => {
      const messages = sessionId
        ? this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId)
        : this.db.prepare('SELECT * FROM messages ORDER BY timestamp ASC').all();

      const preferences = this.db.prepare('SELECT * FROM preferences').all();
      const skills = this.db.prepare('SELECT * FROM skills').all();

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        sessionId,
        messages,
        preferences,
        skills,
      };

      return JSON.stringify(exportData, null, 2);
    });
  }

  // Import conversation history from JSON
  async importConversation(jsonData: string, mergeMode: boolean = false): Promise<{ imported: number; errors: string[] }> {
    return this.runAsync(() => {
      const errors: string[] = [];
      let imported = 0;

      try {
        const data = JSON.parse(jsonData);

        if (!data.version || data.version !== '1.0') {
          errors.push('Unsupported export version');
          return { imported, errors };
        }

        // If not merge mode, clear existing data
        if (!mergeMode) {
          this.db.prepare('DELETE FROM messages').run();
          this.db.prepare('DELETE FROM preferences').run();
          this.db.prepare('DELETE FROM skills').run();
        }

        // Import messages
        if (Array.isArray(data.messages)) {
          const insertMsg = this.db.prepare(
            `INSERT INTO messages (role, content, channel, timestamp, session_id)
             SELECT ?, ?, ?, ?, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM messages
               WHERE role = ? AND content = ? AND channel = ? AND timestamp = ? AND session_id = ?
             )`
          );
          for (const msg of data.messages) {
            try {
              // Support both snake_case (DB export) and camelCase (legacy exports)
              const sessionId = msg.session_id ?? msg.sessionId;
              const result = insertMsg.run(
                msg.role, msg.content, msg.channel, msg.timestamp, sessionId,
                msg.role, msg.content, msg.channel, msg.timestamp, sessionId
              );
              if (result.changes > 0) {
                imported++;
              }
            } catch (err: any) {
              errors.push(`Failed to import message: ${err.message}`);
            }
          }
        }

        // Import preferences
        if (Array.isArray(data.preferences)) {
          const insertPref = this.db.prepare(
            'INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, ?)'
          );
          for (const pref of data.preferences) {
            try {
              insertPref.run(pref.key, pref.value, pref.updated_at || Date.now());
              imported++;
            } catch (err: any) {
              errors.push(`Failed to import preference: ${err.message}`);
            }
          }
        }

        // Import skills
        if (Array.isArray(data.skills)) {
          const insertSkill = this.db.prepare(
            'INSERT OR REPLACE INTO skills (name, description, code, created_at) VALUES (?, ?, ?, ?)'
          );
          for (const skill of data.skills) {
            try {
              insertSkill.run(skill.name, skill.description, skill.code, skill.created_at || Date.now());
              imported++;
            } catch (err: any) {
              errors.push(`Failed to import skill: ${err.message}`);
            }
          }
        }

        return { imported, errors };
      } catch (err: any) {
        errors.push(`Import failed: ${err.message}`);
        return { imported, errors };
      }
    });
  }

  close(): void {
    this.db.close();
  }
}
