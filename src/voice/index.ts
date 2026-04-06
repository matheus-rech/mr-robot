import say from 'say';
import chalk from 'chalk';

export class Voice {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.VOICE_ENABLED === 'true';
  }

  async speak(text: string): Promise<void> {
    if (!this.enabled) return;
    return new Promise((resolve) => {
      say.speak(text, undefined, 1.0, (err) => {
        if (err) {
          console.error(chalk.red('[Voice] TTS error:'), err);
        }
        resolve();
      });
    });
  }

  async stopSpeaking(): Promise<void> {
    if (!this.enabled) return;
    say.stop();
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
