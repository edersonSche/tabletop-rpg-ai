import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { AIProvider, AIContext } from './ai.interface';
import { AIResponse } from '../dto/ai-response.dto';

@Injectable()
export class AiService implements OnModuleDestroy {
  constructor(
    @Inject('AI_PROVIDER') private provider: AIProvider,
  ) {}

  async generate(context: AIContext): Promise<AIResponse> {
    try {
      const response = await this.provider.generate(context);
      return this.validateResponse(response, context);
    } catch (error) {
      console.error('AI provider error:', error.message);
      return this.fallbackResponse(context);
    }
  }

  private validateResponse(response: AIResponse, context: AIContext): AIResponse {
    const validTypes = ['group_action', 'call_player', 'call_roll'];

    if (!response.narration) {
      response.narration = 'The Game Master reflects for a moment...';
    }

    response.summary = this.ensureSummaryQuality(response, context);

    if (!response.next || !validTypes.includes(response.next.type)) {
      response.next = { type: 'group_action' };
    }

    if (response.next.type === 'call_roll') {
      response.next.skill = response.next.skill || 'dexterity';
      response.next.dc = response.next.dc || 10;
    }

    return response;
  }

  private ensureSummaryQuality(response: AIResponse, context: AIContext): string {
    const summary = response.summary || '';
    const previous = context.summary || '';
    const narration = response.narration || '';

    if (!summary.length) {
      console.warn(`[room ${context.roomId}] AI returned empty summary — using fallback`);
      return this.fallbackSummary(narration, previous);
    }

    if (summary === previous) {
      console.warn(`[room ${context.roomId}] AI returned unchanged summary — appending action context`);
      return this.fixUnchangedSummary(summary, context);
    }

    if (summary.length < 80) {
      console.warn(`[room ${context.roomId}] AI summary too short (${summary.length} chars) — extending`);
      return this.fixShortSummary(summary, narration);
    }

    if (narration.length > 0 && narration.startsWith(summary)) {
      console.warn(`[room ${context.roomId}] AI summary copied from narration — extracting`);
      return this.extractSummaryFromNarration(narration);
    }

    return summary;
  }

  private fixUnchangedSummary(summary: string, context: AIContext): string {
    const action = context.currentAction?.action;
    if (action) return `${summary} Since then, ${action}.`;
    return summary + ' The adventure continues.';
  }

  private fixShortSummary(summary: string, narration: string): string {
    const sentences = narration.match(/[^.!?\n]+[.!?\n]+/g) || [];
    const extra = sentences.slice(0, 2).join(' ').trim();
    if (extra) return `${summary} ${extra}`;
    return summary;
  }

  private extractSummaryFromNarration(narration: string): string {
    const sentences = narration.match(/[^.!?\n]+[.!?\n]+/g) || [narration];
    return sentences.slice(0, 3).join(' ').trim();
  }

  private fallbackSummary(narration: string, previous: string): string {
    if (narration) return this.extractSummaryFromNarration(narration);
    return previous || 'The adventure continues.';
  }

  async onRoomReady(roomId: string, context: AIContext): Promise<void> {
    if (this.provider.onRoomReady) {
      await this.provider.onRoomReady(roomId, context);
    }
  }

  async onRoomEmpty(roomId: string): Promise<void> {
    if (this.provider.onRoomEmpty) {
      await this.provider.onRoomEmpty(roomId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.provider.destroy) {
      await this.provider.destroy();
    }
  }

  private fallbackResponse(context: AIContext): AIResponse {
    return {
      narration: `The adventure continues... ${context.currentAction?.action || 'The group awaits the next move.'}`,
      summary: context.summary || 'The adventure continues.',
      next: {
        type: 'group_action',
      },
    };
  }
}
