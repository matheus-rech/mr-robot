import axios from 'axios';
import * as cheerio from 'cheerio';
import { Tool } from './base';

export class WebSearchTool implements Tool {
  name = 'web_search';
  description = 'Search the web using DuckDuckGo';

  async execute(query: string): Promise<string> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; mr-robot/1.0)',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: string[] = [];
      let count = 0;

      $('.result__snippet').each((_i, el) => {
        if (count >= 5) return;
        count++;
        const title = $(el).closest('.result').find('.result__title').text().trim();
        const snippet = $(el).text().trim();
        const link = $(el).closest('.result').find('.result__url').text().trim();
        if (title && snippet) {
          results.push(`**${title}**\n${snippet}\n${link}`);
        }
      });

      return results.length > 0
        ? results.join('\n\n')
        : 'No results found.';
    } catch (err: any) {
      return `Search failed: ${err.message}`;
    }
  }
}
