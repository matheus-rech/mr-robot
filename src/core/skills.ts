import { Memory } from './memory';
import chalk from 'chalk';
import vm from 'vm';

export interface Skill {
  name: string;
  description: string;
  execute: (args: string) => Promise<string>;
}

export class SkillsManager {
  private memory: Memory;
  private loadedSkills: Map<string, Skill> = new Map();

  constructor(memory: Memory) {
    this.memory = memory;
    // Load skills asynchronously - they'll be available shortly after construction
    this.loadPersistedSkills().catch(err => {
      console.error('Failed to load persisted skills:', err);
    });
  }

  private async loadPersistedSkills(): Promise<void> {
    const skills = await this.memory.getAllSkills();
    for (const skill of skills) {
      this.compileAndRegister(skill.name, skill.description, skill.code);
    }
  }

  private validateSkillCode(code: string): { valid: boolean; reason?: string } {
    // Enhanced validation with word boundaries to prevent bypasses
    const dangerousPatterns = [
      { pattern: /\brequire\s*\(/i, reason: 'require() is not allowed' },
      { pattern: /\bimport\s+/i, reason: 'import statements are not allowed' },
      { pattern: /\bprocess\b/i, reason: 'process access is not allowed' },
      { pattern: /child_process/i, reason: 'child_process access is not allowed' },
      { pattern: /\bfs\b/i, reason: 'filesystem access is not allowed' },
      { pattern: /\beval\s*\(/i, reason: 'eval() is not allowed' },
      { pattern: /\bFunction\s*\(/i, reason: 'Function constructor is not allowed' },
      { pattern: /\.constructor\s*\(/i, reason: 'constructor access is not allowed' },
      { pattern: /\b__dirname\b|\b__filename\b/i, reason: 'directory access is not allowed' },
      { pattern: /\bglobal\b/i, reason: 'global object access is not allowed' },
      { pattern: /\bmodule\b/i, reason: 'module access is not allowed' },
      { pattern: /\bexports\b/i, reason: 'exports access is not allowed' },
    ];

    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(code)) {
        return { valid: false, reason };
      }
    }

    // Check code length to prevent excessively large skills
    if (code.length > 10000) {
      return { valid: false, reason: 'skill code exceeds maximum length of 10000 characters' };
    }

    return { valid: true };
  }

  private compileAndRegister(name: string, description: string, code: string): boolean {
    // Validate the skill code before compilation
    const validation = this.validateSkillCode(code);
    if (!validation.valid) {
      console.error(chalk.red(`Cannot compile skill ${name}: ${validation.reason}`));
      return false;
    }

    try {
      // Create a sandboxed context with vm module for safer execution
      const sandbox = {
        console: {
          log: (...args: any[]) => console.log(`[Skill:${name}]`, ...args),
          error: (...args: any[]) => console.error(`[Skill:${name}]`, ...args),
        },
        // Only expose safe APIs
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        Promise,
        JSON,
        Math,
        Date,
        String,
        Number,
        Boolean,
        Array,
        Object,
      };

      // Compile the skill in the sandbox
      const script = new vm.Script(`
        (async (args) => {
          ${code}
        })(args);
      `);

      this.loadedSkills.set(name, {
        name,
        description,
        execute: async (args: string) => {
          try {
            // Add timeout to prevent infinite loops
            const timeoutMs = 30000; // 30 seconds
            const timeoutPromise = new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error('Skill execution timeout')), timeoutMs);
            });

            // Execute in sandboxed context
            const context = vm.createContext({ ...sandbox, args });
            const executionPromise = script.runInContext(context, { timeout: timeoutMs });

            const result = await Promise.race([executionPromise, timeoutPromise]);
            return String(result);
          } catch (err: any) {
            return `Skill error: ${err.message}`;
          }
        },
      });
      return true;
    } catch (err: any) {
      console.error(chalk.red(`Failed to compile skill ${name}:`), err.message);
      return false;
    }
  }

  async createSkill(name: string, description: string, code: string): Promise<boolean> {
    const ok = this.compileAndRegister(name, description, code);
    if (ok) {
      await this.memory.saveSkill(name, description, code);
    }
    return ok;
  }

  getSkill(name: string): Skill | undefined {
    return this.loadedSkills.get(name);
  }

  listSkills(): Skill[] {
    return Array.from(this.loadedSkills.values());
  }

  async deleteSkill(name: string): Promise<void> {
    this.loadedSkills.delete(name);
    await this.memory.deleteSkill(name);
  }
}
