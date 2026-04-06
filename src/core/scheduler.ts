import cron from 'node-cron';
import { Agent } from './agent';
import chalk from 'chalk';

export class Scheduler {
  private agent: Agent;
  private tasks: Map<string, ReturnType<typeof cron.schedule>> = new Map();

  constructor(agent: Agent) {
    this.agent = agent;
  }

  init(): void {
    if (process.env.DAILY_SUMMARY_ENABLED === 'true') {
      const cronExp = process.env.DAILY_SUMMARY_CRON || '0 9 * * *';
      this.schedule('daily-summary', cronExp, async () => {
        console.log(chalk.cyan('[Scheduler] Running daily summary...'));
        const summary = await this.agent.chat(
          'Please provide me a brief daily summary based on what you know about my preferences and recent activity.',
          'scheduler',
          'system-session'
        );
        console.log(chalk.cyan('[Daily Summary]'), summary);
        await this.agent.broadcast(`📋 *Daily Summary*\n\n${summary}`);
      });
    }

    const memory = this.agent.memory;
    if (memory) {
      const tasks = memory.getScheduledTasks();
      for (const task of tasks) {
        this.schedule(task.id, task.cron, async () => {
          const result = await this.agent.chat(task.action, 'scheduler', 'system-session');
          await this.agent.broadcast(`⏰ *Scheduled: ${task.name}*\n\n${result}`);
        });
      }
    }

    console.log(chalk.gray(`[Scheduler] Initialized with ${this.tasks.size} task(s)`));
  }

  schedule(id: string, cronExp: string, fn: () => Promise<void>): void {
    if (!cron.validate(cronExp)) {
      console.error(chalk.red(`[Scheduler] Invalid cron expression: ${cronExp}`));
      return;
    }
    const task = cron.schedule(cronExp, fn);
    this.tasks.set(id, task);
  }

  stop(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.stop();
      this.tasks.delete(id);
    }
  }
}
