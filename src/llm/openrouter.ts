import axios from 'axios';
import { LLMProvider, LLMMessage } from './base';

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  private apiKey: string;
  private model: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          { model: this.model, messages, max_tokens: 2048 },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://github.com/mr-robot/mr-robot',
              'X-Title': 'mr-robot',
            },
            timeout: 60000,
          }
        );
        return response.data.choices[0]?.message?.content || '';

      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors
        if (error.response?.status === 401 || error.response?.status === 400) {
          throw error;
        }

        // Retry on rate limits or server errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`OpenRouter API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw new Error(`OpenRouter API call failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }
}
