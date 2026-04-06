import axios from 'axios';
import { LLMProvider, LLMMessage } from './base';

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
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
      }
    );
    return response.data.choices[0]?.message?.content || '';
  }
}
