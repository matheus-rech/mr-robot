import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import { Agent } from '../core/agent';
import { BaseChannel } from './base';
import { v4 as uuidv4 } from 'uuid';

export class TerminalChannel implements BaseChannel {
  name = 'terminal';
  private agent: Agent;
  private sessionId: string;
  private rl?: readline.Interface;

  constructor(agent: Agent) {
    this.agent = agent;
    this.sessionId = uuidv4();
    agent.registerChannel(this);
  }

  async send(message: string): Promise<void> {
    console.log('\n' + chalk.cyan('🤖 ') + chalk.white(message) + '\n');
  }

  async start(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.green('💬 Terminal channel ready. Type your message (or "exit" to quit, "help" for commands)\n'));

    const prompt = () => {
      this.rl!.question(chalk.yellow('You: '), async (input) => {
        const message = input.trim();
        if (!message) {
          prompt();
          return;
        }

        if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
          console.log(chalk.cyan('\nGoodbye! 👋\n'));
          process.exit(0);
        }

        if (message.toLowerCase() === 'help') {
          console.log(chalk.cyan('\nCommands:'));
          console.log(chalk.gray('  exit / quit  — exit the assistant'));
          console.log(chalk.gray('  /skills      — list all skills'));
          console.log(chalk.gray('  /prefs       — show preferences'));
          console.log(chalk.gray('  /clear       — start new session'));
          console.log(chalk.gray('  /export [file] — export conversation to JSON file'));
          console.log(chalk.gray('  /import <file> — import conversation from JSON file'));
          console.log();
          prompt();
          return;
        }

        if (message === '/skills') {
          const skills = this.agent.listSkills();
          if (skills.length === 0) {
            console.log(chalk.gray('\nNo skills saved yet.\n'));
          } else {
            console.log(chalk.cyan('\nSaved skills:'));
            for (const s of skills) {
              console.log(chalk.gray(`  • ${s.name}: ${s.description}`));
            }
            console.log();
          }
          prompt();
          return;
        }

        if (message === '/prefs') {
          const prefs = await this.agent.memory.getAllPreferences();
          if (prefs.length === 0) {
            console.log(chalk.gray('\nNo preferences saved yet.\n'));
          } else {
            console.log(chalk.cyan('\nSaved preferences:'));
            for (const p of prefs) {
              console.log(chalk.gray(`  • ${p.key}: ${p.value}`));
            }
            console.log();
          }
          prompt();
          return;
        }

        if (message === '/clear') {
          this.sessionId = uuidv4();
          console.log(chalk.gray('\nNew session started.\n'));
          prompt();
          return;
        }

        if (message.startsWith('/export')) {
          const parts = message.split(' ');
          const filename = parts[1] || `mr-robot-export-${Date.now()}.json`;
          try {
            const exportData = await this.agent.memory.exportConversation();
            await fs.writeFile(filename, exportData, 'utf-8');
            console.log(chalk.green(`\nConversation exported to: ${filename}\n`));
          } catch (err: any) {
            console.log(chalk.red(`\nExport failed: ${err.message}\n`));
          }
          prompt();
          return;
        }

        if (message.startsWith('/import')) {
          const parts = message.split(' ');
          const filename = parts[1];
          if (!filename) {
            console.log(chalk.red('\nPlease specify a file to import: /import <filename>\n'));
            prompt();
            return;
          }
          try {
            const importData = await fs.readFile(filename, 'utf-8');
            const result = await this.agent.memory.importConversation(importData, true);
            console.log(chalk.green(`\nImported ${result.imported} items successfully`));
            if (result.errors.length > 0) {
              console.log(chalk.yellow(`Errors: ${result.errors.join(', ')}`));
            }
            console.log();
          } catch (err: any) {
            console.log(chalk.red(`\nImport failed: ${err.message}\n`));
          }
          prompt();
          return;
        }

        const spinner = ora({ text: chalk.gray('Thinking...'), spinner: 'dots' }).start();
        try {
          const response = await this.agent.chat(message, 'terminal', this.sessionId);
          spinner.stop();
          console.log('\n' + chalk.cyan('🤖 ') + chalk.white(response) + '\n');
        } catch (err: any) {
          spinner.stop();
          console.log(chalk.red('\nError: ' + err.message + '\n'));
        }

        prompt();
      });
    };

    prompt();

    await new Promise<void>((resolve) => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
  }
}
