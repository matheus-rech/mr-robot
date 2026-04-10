import { LLMProvider, LLMMessage } from './base';
import axios from 'axios';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private apiKey: string;
  private model: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Convert messages to Anthropic format
        const systemMessages = messages.filter(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const anthropicMessages = conversationMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));

        const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: this.model,
            max_tokens: 4096,
            system: systemPrompt || undefined,
            messages: anthropicMessages,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
            },
            timeout: 60000,
          }
        );

        const content = response.data.content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0].text || '';
        }
        return '';

      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors or invalid requests
        if (error.response?.status === 401 || error.response?.status === 400) {
          throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
        }

        // Retry on rate limits or server errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Anthropic API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw new Error(`Anthropic API call failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }
}
