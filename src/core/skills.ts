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

  private compileAndRegister(name: string, description: string, code: string): boolean {
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
            return String(await fn(args));
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
