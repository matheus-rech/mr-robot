#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';

async function runWizard() {
  console.log(chalk.cyan(figlet.textSync('Mr. Robot', { horizontalLayout: 'full' })));
  console.log(chalk.cyan("  Setup Wizard — Let's configure your personal AI assistant\n"));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'agentName',
      message: 'What do you want to call your assistant?',
      default: 'Mr. Robot',
    },
    {
      type: 'list',
      name: 'llmProvider',
      message: 'Which LLM provider do you want to use?',
      choices: [
        { name: 'OpenAI (GPT-4o, etc.)', value: 'openai' },
        { name: 'OpenRouter (access many models)', value: 'openrouter' },
      ],
    },
    {
      type: 'input',
      name: 'openaiApiKey',
      message: 'Enter your OpenAI API key:',
      when: (a: any) => a.llmProvider === 'openai',
    },
    {
      type: 'input',
      name: 'openaiModel',
      message: 'OpenAI model to use:',
      default: 'gpt-4o',
      when: (a: any) => a.llmProvider === 'openai',
    },
    {
      type: 'input',
      name: 'openrouterApiKey',
      message: 'Enter your OpenRouter API key:',
      when: (a: any) => a.llmProvider === 'openrouter',
    },
    {
      type: 'input',
      name: 'openrouterModel',
      message: 'OpenRouter model to use:',
      default: 'openai/gpt-4o',
      when: (a: any) => a.llmProvider === 'openrouter',
    },
    {
      type: 'checkbox',
      name: 'channels',
      message: 'Which messaging channels do you want to enable?',
      choices: [
        { name: 'Terminal (always enabled)', value: 'terminal', checked: true, disabled: true },
        { name: 'Telegram', value: 'telegram' },
        { name: 'Discord', value: 'discord' },
        { name: 'Slack', value: 'slack' },
        { name: 'WhatsApp', value: 'whatsapp' },
      ],
    },
    {
      type: 'input',
      name: 'telegramToken',
      message: 'Enter your Telegram Bot Token (from @BotFather):',
      when: (a: any) => a.channels.includes('telegram'),
    },
    {
      type: 'input',
      name: 'discordToken',
      message: 'Enter your Discord Bot Token:',
      when: (a: any) => a.channels.includes('discord'),
    },
    {
      type: 'input',
      name: 'discordClientId',
      message: 'Enter your Discord Client ID:',
      when: (a: any) => a.channels.includes('discord'),
    },
    {
      type: 'input',
      name: 'slackBotToken',
      message: 'Enter your Slack Bot Token (xoxb-...):',
      when: (a: any) => a.channels.includes('slack'),
    },
    {
      type: 'input',
      name: 'slackAppToken',
      message: 'Enter your Slack App Token (xapp-...):',
      when: (a: any) => a.channels.includes('slack'),
    },
    {
      type: 'input',
      name: 'slackSigningSecret',
      message: 'Enter your Slack Signing Secret:',
      when: (a: any) => a.channels.includes('slack'),
    },
    {
      type: 'confirm',
      name: 'voiceEnabled',
      message: 'Enable voice capabilities (TTS/STT)?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'dailySummary',
      message: 'Enable daily morning summary?',
      default: false,
    },
    {
      type: 'input',
      name: 'dailySummaryCron',
      message: 'Daily summary time (cron format):',
      default: '0 9 * * *',
      when: (a: any) => a.dailySummary,
    },
  ]);

  const allChannels = ['terminal', ...(answers.channels || [])];
  const envLines = [
    `AGENT_NAME=${answers.agentName}`,
    '',
    `LLM_PROVIDER=${answers.llmProvider}`,
    '',
    `OPENAI_API_KEY=${answers.openaiApiKey || ''}`,
    `OPENAI_MODEL=${answers.openaiModel || 'gpt-4o'}`,
    '',
    `OPENROUTER_API_KEY=${answers.openrouterApiKey || ''}`,
    `OPENROUTER_MODEL=${answers.openrouterModel || 'openai/gpt-4o'}`,
    '',
    `TELEGRAM_BOT_TOKEN=${answers.telegramToken || ''}`,
    '',
    `DISCORD_BOT_TOKEN=${answers.discordToken || ''}`,
    `DISCORD_CLIENT_ID=${answers.discordClientId || ''}`,
    '',
    `SLACK_BOT_TOKEN=${answers.slackBotToken || ''}`,
    `SLACK_APP_TOKEN=${answers.slackAppToken || ''}`,
    `SLACK_SIGNING_SECRET=${answers.slackSigningSecret || ''}`,
    '',
    `WHATSAPP_ENABLED=${allChannels.includes('whatsapp') ? 'true' : 'false'}`,
    '',
    `VOICE_ENABLED=${answers.voiceEnabled ? 'true' : 'false'}`,
    `VOICE_LANG=en`,
    '',
    `ENABLED_CHANNELS=${allChannels.join(',')}`,
    '',
    `DAILY_SUMMARY_ENABLED=${answers.dailySummary ? 'true' : 'false'}`,
    `DAILY_SUMMARY_CRON=${answers.dailySummaryCron || '0 9 * * *'}`,
  ];

  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, envLines.join('\n') + '\n');

  console.log(chalk.green('\n✅ Configuration saved to .env'));
  console.log(chalk.yellow('\nNext steps:'));
  console.log(chalk.white('  1. Run: npm run build'));
  console.log(chalk.white('  2. Run: npm start'));
  if (allChannels.includes('whatsapp')) {
    console.log(chalk.white('  3. Scan the WhatsApp QR code when prompted'));
  }
  console.log(chalk.cyan('\nYour assistant is ready to run! 🤖\n'));
}

runWizard().catch(err => {
  console.error(chalk.red('Setup failed:'), err);
  process.exit(1);
});
