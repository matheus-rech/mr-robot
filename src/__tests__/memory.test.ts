import { Memory } from '../core/memory';
import * as path from 'path';
import * as fs from 'fs';

describe('Memory', () => {
  let memory: Memory;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    memory = new Memory(testDbPath);
  });

  afterEach(() => {
    memory.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should add and retrieve messages', async () => {
    await memory.addMessage({
      role: 'user',
      content: 'Hello',
      channel: 'terminal',
      timestamp: Date.now(),
      sessionId: 'test-session',
    });

    const messages = await memory.getConversationHistory('test-session', 10);
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Hello');
  });

  test('should set and get preferences', async () => {
    await memory.setPreference('theme', 'dark');
    const value = await memory.getPreference('theme');
    expect(value).toBe('dark');
  });

  test('should export and import conversations', async () => {
    // Add test data
    await memory.addMessage({
      role: 'user',
      content: 'Test message',
      channel: 'terminal',
      timestamp: Date.now(),
      sessionId: 'session-1',
    });
    await memory.setPreference('test_pref', 'test_value');

    // Export
    const exportData = await memory.exportConversation();
    expect(exportData).toBeTruthy();

    const exported = JSON.parse(exportData);
    expect(exported.version).toBe('1.0');
    expect(exported.messages.length).toBe(1);
    expect(exported.preferences.length).toBe(1);

    // Import
    const result = await memory.importConversation(exportData, true);
    expect(result.imported).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  test('should manage skills', async () => {
    await memory.saveSkill('test_skill', 'A test skill', 'return "test";');
    const skill = await memory.getSkill('test_skill');
    expect(skill).toBeTruthy();
    expect(skill!.name).toBe('test_skill');
    expect(skill!.code).toBe('return "test";');

    await memory.deleteSkill('test_skill');
    const deleted = await memory.getSkill('test_skill');
    expect(deleted).toBeUndefined();
  });
});
