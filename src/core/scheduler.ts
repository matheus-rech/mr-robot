import cron from 'node-cron';
import { Agent } from './agent';
import chalk from 'chalk';

export class Scheduler {
  private agent: Agent;
  private tasks: Map<string, ReturnType<typeof cron.schedule>> = new Map();
  private loadedTaskIds: Set<string> = new Set();
  /** Tracks cron/action fingerprint per task id to detect updates. */
  private taskMeta: Map<string, { cron: string; action: string }> = new Map();

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async init(): Promise<void> {
    if (process.env.DAILY_SUMMARY_ENABLED === 'true') {
      const cronExp = process.env.DAILY_SUMMARY_CRON || '0 9 * * *';
      this.schedule('daily-summary', cronExp, async () => {
        try {
          console.log(chalk.cyan('[Scheduler] Running daily summary...'));
          const summary = await this.agent.chat(
            'Please provide me a brief daily summary based on what you know about my preferences and recent activity.',
            'scheduler',
            'system-session'
          );
          console.log(chalk.cyan('[Daily Summary]'), summary);
          await this.agent.broadcast(`📋 *Daily Summary*\n\n${summary}`);
        } catch (err: any) {
          console.error(chalk.red('[Scheduler] Error in daily-summary task:'), err.message);
          console.error(err.stack);
        }
      });
    }

    await this.reloadTasks();
    console.log(chalk.gray(`[Scheduler] Initialized with ${this.tasks.size} task(s)`));
  }

  /**
   * Reload tasks from database and start any new or updated ones.
   * Stops tasks that have been removed or whose cron/action changed,
   * then (re)starts them so changes take effect without a restart.
   */
  async reloadTasks(): Promise<void> {
    const memory = this.agent.memory;
    if (!memory) return;

    let tasks: Array<{ id: string; name: string; cron: string; action: string; enabled: number }> = [];
    try {
      tasks = await memory.getScheduledTasks();
    } catch (err: any) {
      console.error(chalk.red('[Scheduler] Failed to load persisted tasks:'), err.message);
      return;
    }

    const currentTaskIds = new Set(tasks.map(t => t.id));

    // Stop tasks that were removed from DB
    for (const loadedId of this.loadedTaskIds) {
      if (!currentTaskIds.has(loadedId) && loadedId !== 'daily-summary') {
        this.stop(loadedId);
        this.loadedTaskIds.delete(loadedId);
        console.log(chalk.yellow(`[Scheduler] Stopped removed task: ${loadedId}`));
      }
    }

    // Start new tasks or reschedule updated ones
    for (const task of tasks) {
      const existing = this.taskMeta.get(task.id);
      const hasChanged = existing && (existing.cron !== task.cron || existing.action !== task.action);

      if (hasChanged) {
        // Stop the old instance before rescheduling
        this.stop(task.id);
        this.loadedTaskIds.delete(task.id);
        console.log(chalk.yellow(`[Scheduler] Rescheduling updated task: ${task.name}`));
      }

      if (!this.loadedTaskIds.has(task.id)) {
        this.schedule(task.id, task.cron, async () => {
          try {
            const result = await this.agent.chat(task.action, 'scheduler', 'system-session');
            await this.agent.broadcast(`⏰ *Scheduled: ${task.name}*\n\n${result}`);
          } catch (err: any) {
            console.error(chalk.red(`[Scheduler] Error in task "${task.name}" (${task.id}):`), err.message);
            console.error(err.stack);
          }
        });
        this.loadedTaskIds.add(task.id);
        this.taskMeta.set(task.id, { cron: task.cron, action: task.action });
        console.log(chalk.green(`[Scheduler] Started task: ${task.name}`));
      }
    }
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
      this.taskMeta.delete(id);
    }
  }
}
