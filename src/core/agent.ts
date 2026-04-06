import { Memory } from './memory';
import { SkillsManager } from './skills';
import { LLMProvider } from '../llm/base';
import { OpenAIProvider } from '../llm/openai';
import { OpenRouterProvider } from '../llm/openrouter';
import { Tool } from '../tools/base';
import { WebSearchTool } from '../tools/web-search';
import { WebFetchTool } from '../tools/web-fetch';
import { BaseChannel } from '../channels/base';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

export class Agent {
  memory: Memory;
  private skillsManager!: SkillsManager;
  private llm!: LLMProvider;
  private tools: Map<string, Tool> = new Map();
  private channels: BaseChannel[] = [];
  private agentName: string;

  constructor() {
    this.memory = new Memory();
    this.agentName = process.env.AGENT_NAME || 'Mr. Robot';
  }

  async init(): Promise<void> {
    const provider = process.env.LLM_PROVIDER || 'openai';
    if (provider === 'openrouter') {
      this.llm = new OpenRouterProvider();
    } else {
      this.llm = new OpenAIProvider();
    }

    this.skillsManager = new SkillsManager(this.memory);

    const tools: Tool[] = [
      new WebSearchTool(),
      new WebFetchTool(),
    ];
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }

    console.log(chalk.green(`✅ ${this.agentName} initialized (LLM: ${provider})`));
  }

  registerChannel(channel: BaseChannel): void {
    this.channels.push(channel);
  }

  async broadcast(message: string): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.send(message);
      } catch {
        // ignore channel errors during broadcast
      }
    }
  }

  async chat(userMessage: string, channel: string, sessionId: string): Promise<string> {
    this.memory.addMessage({
      role: 'user',
      content: userMessage,
      channel,
      timestamp: Date.now(),
      sessionId,
    });

    const history = this.memory.getConversationHistory(sessionId, 30);
    const systemPrompt = this.buildSystemPrompt();

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of history.slice(-20)) {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    const response = await this.processWithTools(messages, userMessage, channel, sessionId);

    this.memory.addMessage({
      role: 'assistant',
      content: response,
      channel,
      timestamp: Date.now(),
      sessionId,
    });

    await this.learnFromConversation(userMessage);

    return response;
  }

  private buildSystemPrompt(): string {
    const name = this.agentName;
    const prefs = this.memory.getAllPreferences();
    const skills = this.skillsManager.listSkills();
    const prefsText = prefs.length > 0
      ? '\nUser preferences:\n' + prefs.map(p => `- ${p.key}: ${p.value}`).join('\n')
      : '';
    const skillsText = skills.length > 0
      ? '\nAvailable skills:\n' + skills.map(s => `- ${s.name}: ${s.description}`).join('\n')
      : '';

    return `You are ${name}, a personal AI assistant running locally. You are helpful, concise, and learn from interactions.

You have access to these tools (call them using the format TOOL:<name>:<args>):
- TOOL:web_search:<query> — search the web
- TOOL:web_fetch:<url> — fetch and read a web page
- TOOL:create_skill:<json> — create a new skill, JSON format: {"name":"...","description":"...","code":"..."}
- TOOL:run_skill:<name>:<args> — run a saved skill
- TOOL:list_skills — list all available skills
- TOOL:set_preference:<key>=<value> — remember a user preference
- TOOL:schedule:<json> — schedule a task, JSON: {"name":"...","cron":"...","action":"..."}
${prefsText}${skillsText}

Always be helpful and concise. When you learn something important about the user, use set_preference to remember it.
When the user shows you a complex task, offer to create a skill for it so you can repeat it later.`;
  }

  private async processWithTools(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    _userMessage: string,
    _channel: string,
    _sessionId: string
  ): Promise<string> {
    let response = await this.llm.chat(messages);

    if (response.includes('TOOL:list_skills')) {
      const skills = this.skillsManager.listSkills();
      const skillList = skills.length > 0
        ? skills.map(s => `- **${s.name}**: ${s.description}`).join('\n')
        : 'No skills saved yet.';
      response = response.replace('TOOL:list_skills', `Skills:\n${skillList}`);
      return response;
    }

    const toolMatch = response.match(/TOOL:(\w+):([\s\S]*?)(?=\nTOOL:|$)/);
    if (toolMatch) {
      const toolName = toolMatch[1];
      const toolArgs = toolMatch[2].trim();
      let toolResult = '';

      try {
        if (toolName === 'web_search') {
          const tool = this.tools.get('web_search');
          if (tool) toolResult = await tool.execute(toolArgs);
        } else if (toolName === 'web_fetch') {
          const tool = this.tools.get('web_fetch');
          if (tool) toolResult = await tool.execute(toolArgs);
        } else if (toolName === 'create_skill') {
          const skillData = JSON.parse(toolArgs);
          const ok = this.skillsManager.createSkill(skillData.name, skillData.description, skillData.code);
          toolResult = ok ? `Skill "${skillData.name}" created successfully!` : `Failed to create skill.`;
        } else if (toolName === 'run_skill') {
          const colonIdx = toolArgs.indexOf(':');
          const skillName = colonIdx >= 0 ? toolArgs.slice(0, colonIdx) : toolArgs;
          const skillArgs = colonIdx >= 0 ? toolArgs.slice(colonIdx + 1) : '';
          const skill = this.skillsManager.getSkill(skillName);
          toolResult = skill ? await skill.execute(skillArgs) : `Skill "${skillName}" not found.`;
        } else if (toolName === 'set_preference') {
          const eqIdx = toolArgs.indexOf('=');
          if (eqIdx >= 0) {
            const key = toolArgs.slice(0, eqIdx).trim();
            const value = toolArgs.slice(eqIdx + 1).trim();
            this.memory.setPreference(key, value);
            toolResult = `Preference "${key}" saved.`;
          }
        } else if (toolName === 'schedule') {
          const schedData = JSON.parse(toolArgs);
          const id = uuidv4();
          this.memory.addScheduledTask(id, schedData.name, schedData.cron, schedData.action);
          toolResult = `Scheduled task "${schedData.name}" created.`;
        }
      } catch (err: any) {
        toolResult = `Tool error: ${err.message}`;
      }

      if (toolResult) {
        messages.push({ role: 'assistant', content: response });
        messages.push({ role: 'user', content: `Tool result: ${toolResult}\n\nPlease provide your final response based on this information.` });
        response = await this.llm.chat(messages);
      }
    }

    return response;
  }

  private async learnFromConversation(userMessage: string): Promise<void> {
    const prefPatterns = [
      { regex: /I (?:prefer|like|love|enjoy) (.+?)(?:\.|,|$)/i, key: 'preference' },
      { regex: /my name is (\w+)/i, key: 'user_name' },
      { regex: /call me (\w+)/i, key: 'user_name' },
    ];

    for (const pattern of prefPatterns) {
      const match = userMessage.match(pattern.regex);
      if (match) {
        this.memory.setPreference(`${pattern.key}_${Date.now()}`, match[1]);
      }
    }
  }
}
