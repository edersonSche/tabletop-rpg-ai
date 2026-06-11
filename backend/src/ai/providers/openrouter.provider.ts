import OpenAI from 'openai';
import { AIProvider, AIConfig, AIContext } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { SYSTEM_PROMPT } from '../prompts/system.prompt';

export class OpenRouterProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  configure(config: AIConfig): void {
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async generate(context: AIContext): Promise<AIResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Campaign: ${context.campaignName}
Setting: ${context.campaignSetting}

Players:
${context.players.map(p => `- ${p.name}: HP ${p.hp}/${p.maxHp}`).join('\n')}

Current scene: ${context.scene}`,
      },
    ];

    for (const entry of context.history.slice(-30)) {
      if (entry.role === 'player') {
        messages.push({
          role: 'user',
          content: `[${entry.playerId || 'unknown'}] ${entry.content}`,
          name: entry.playerId?.slice(0, 64),
        } as any);
      } else if (entry.role === 'assistant') {
        messages.push({ role: 'assistant', content: entry.content });
      }
    }

    if (context.currentAction) {
      const actionParts: string[] = [];
      if (context.currentAction.playerName) {
        actionParts.push(`Player: ${context.currentAction.playerName}`);
      }
      if (context.currentAction.action) {
        actionParts.push(`Action: ${context.currentAction.action}`);
      }
      if (context.currentAction.rollResult !== undefined) {
        actionParts.push(`Roll: ${context.currentAction.rollResult}${context.currentAction.dc ? ` (DC ${context.currentAction.dc})` : ''}`);
        if (context.currentAction.skill) {
          actionParts.push(`Skill: ${context.currentAction.skill}`);
        }
      }
      messages.push({ role: 'user', content: actionParts.join('\n') });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';

    try {
      return JSON.parse(content) as AIResponse;
    } catch {
      return {
        narration: content,
        next: { type: 'group_action' },
      };
    }
  }
}
