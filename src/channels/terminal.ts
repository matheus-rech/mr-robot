import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
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
          console.log();
          prompt();
          return;
        }

        if (message === '/skills') {
          const skills = (this.agent as any).skillsManager?.listSkills() || [];
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
          const prefs = (this.agent as any).memory?.getAllPreferences() || [];
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
