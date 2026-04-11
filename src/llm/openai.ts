import OpenAI from 'openai';
import { LLMProvider, LLMMessage } from './base';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: 2048,
        }, {
          timeout: 60000,
        });
        return response.choices[0]?.message?.content || '';

      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors
        if (error.status === 401 || error.status === 400) {
          throw error;
        }

        // Retry on rate limits or server errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`OpenAI API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw new Error(`OpenAI API call failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }
}
