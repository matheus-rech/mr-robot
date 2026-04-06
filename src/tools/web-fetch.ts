import axios from 'axios';
import * as cheerio from 'cheerio';
import { Tool } from './base';

export class WebFetchTool implements Tool {
  name = 'web_fetch';
  description = 'Fetch and read the content of a web page';

  async execute(url: string): Promise<string> {
    try {
      const response = await axios.get(url.trim(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; mr-robot/1.0)',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      $('script, style, nav, footer, header, aside, .ad, .ads, .advertisement').remove();

      const title = $('title').text().trim();
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);

      return `**${title}**\n\n${bodyText}`;
    } catch (err: any) {
      return `Fetch failed: ${err.message}`;
    }
  }
}
