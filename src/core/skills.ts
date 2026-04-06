import { Memory } from './memory';
import chalk from 'chalk';

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
    this.loadPersistedSkills();
  }

  private loadPersistedSkills(): void {
    const skills = this.memory.getAllSkills();
    for (const skill of skills) {
      this.compileAndRegister(skill.name, skill.description, skill.code);
    }
  }

  private validateSkillCode(code: string): { valid: boolean; reason?: string } {
    // Basic validation to prevent dangerous operations
    const dangerousPatterns = [
      { pattern: /require\s*\(/i, reason: 'require() is not allowed' },
      { pattern: /import\s+/i, reason: 'import statements are not allowed' },
      { pattern: /process\./i, reason: 'process access is not allowed' },
      { pattern: /child_process/i, reason: 'child_process access is not allowed' },
      { pattern: /fs\./i, reason: 'filesystem access is not allowed' },
      { pattern: /eval\s*\(/i, reason: 'eval() is not allowed' },
      { pattern: /Function\s*\(/i, reason: 'Function constructor is not allowed' },
      { pattern: /\.constructor\s*\(/i, reason: 'constructor access is not allowed' },
      { pattern: /__dirname|__filename/i, reason: 'directory access is not allowed' },
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
      const fn = new Function('args', `
        const result = (async (args) => {
          ${code}
        })(args);
        return result;
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
            const executionPromise = fn(args);
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

  createSkill(name: string, description: string, code: string): boolean {
    const ok = this.compileAndRegister(name, description, code);
    if (ok) {
      this.memory.saveSkill(name, description, code);
    }
    return ok;
  }

  getSkill(name: string): Skill | undefined {
    return this.loadedSkills.get(name);
  }

  listSkills(): Skill[] {
    return Array.from(this.loadedSkills.values());
  }

  deleteSkill(name: string): void {
    this.loadedSkills.delete(name);
    this.memory.deleteSkill(name);
  }
}
