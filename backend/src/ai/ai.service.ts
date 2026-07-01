import { Injectable, Inject } from '@nestjs/common';
import { AIProvider, AIContext, AIConfig } from './ai.interface';
import { AIResponse } from '../dto/ai-response.dto';

@Injectable()
export class AiService {
  constructor(
    @Inject('AI_PROVIDER') private provider: AIProvider,
    @Inject('AI_CONFIG') private config: AIConfig,
  ) {}

  async generate(context: AIContext): Promise<AIResponse> {
    if (!this.config.apiKey) {
      return this.fallbackResponse(context);
    }

    try {
      const response = await this.provider.generate(context);
      return this.validateResponse(response);
    } catch (error) {
      console.error('AI provider error:', error.message);
      return this.fallbackResponse(context);
    }
  }

  private validateResponse(response: AIResponse): AIResponse {
    const validTypes = ['group_action', 'call_player', 'call_roll', 'narration_only'];

    if (!response.narration) {
      response.narration = 'The Game Master reflects for a moment...';
    }

    if (!response.next || !validTypes.includes(response.next.type)) {
      response.next = { type: 'group_action' };
    }

    if (response.next.type === 'call_roll') {
      response.next.skill = response.next.skill || 'destreza';
      response.next.dc = response.next.dc || 10;
    }

    return response;
  }

  async summarizeHistory(entries: string[], existingSummary?: string): Promise<string> {
    if (!this.config.apiKey || !this.provider.summarize) {
      return this.fallbackSummary(entries);
    }
    try {
      return await this.provider.summarize(entries, existingSummary);
    } catch (error) {
      console.error('Summarization error:', error.message);
      return this.fallbackSummary(entries);
    }
  }

  private fallbackSummary(entries: string[]): string {
    return entries.slice(0, 8).join(' ').slice(0, 500);
  }

  private fallbackResponse(context: AIContext): AIResponse {
    const playerNames = context.players.map(p => p.name).join(', ');

    return {
      narration: `The adventure continues... ${context.currentAction?.action || 'The group awaits the next move.'}`,
      next: {
        type: 'group_action',
      },
    };
  }
}
