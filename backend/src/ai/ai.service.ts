import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { AIProvider, AIContext } from './ai.interface';
import {
  AIResponse,
  AIResponseSchema,
  ConditionSeed,
  MerchantSeed,
  NextSchema,
} from '../dto/ai-response.dto';

class AiTimeoutError extends Error {}

@Injectable()
export class AiService implements OnModuleDestroy {
  private static readonly AI_TIMEOUT_MS = 30_000;

  constructor(
    @Inject('AI_PROVIDER') private provider: AIProvider,
  ) {}

  async generate(context: AIContext): Promise<AIResponse> {
    try {
      const response = await this.withTimeout(this.provider.generate(context));
      return this.sanitizeResponse(response, context);
    } catch (error) {
      if (error instanceof AiTimeoutError) {
        console.error(`[room ${context.roomId}] AI call timed out — retrying once`);
        try {
          const response = await this.withTimeout(this.provider.generate(context));
          return this.sanitizeResponse(response, context);
        } catch (retryError) {
          if (retryError instanceof AiTimeoutError) {
            console.error(`[room ${context.roomId}] AI call timed out on retry — propagating error`);
            throw retryError;
          }
          console.error('AI provider retry error:', retryError.message);
          return this.fallbackResponse(context);
        }
      }
      console.error('AI provider error:', error.message);
      return this.fallbackResponse(context);
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new AiTimeoutError(`AI call timed out after ${AiService.AI_TIMEOUT_MS}ms`));
      }, AiService.AI_TIMEOUT_MS);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private sanitizeResponse(response: unknown, context: AIContext): AIResponse {
    const parsed = AIResponseSchema.safeParse(response);
    const sanitized = parsed.success ? parsed.data : this.recoverResponse(response, context);

    if (!sanitized.narration) {
      sanitized.narration = 'The Game Master reflects for a moment...';
    }

    sanitized.summary = this.ensureSummaryQuality(sanitized, context);

    if (sanitized.next.type === 'call_roll') {
      sanitized.next.skill = sanitized.next.skill || 'dexterity';
      sanitized.next.dc = sanitized.next.dc || 10;
    }

    return sanitized;
  }

  private recoverResponse(raw: unknown, context: AIContext): AIResponse {
    const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const warn = (field: string): void => {
      console.warn(`[room ${context.roomId}] AI response has invalid field "${field}" — using default.`);
    };

    const narration = typeof src.narration === 'string' ? src.narration : '';
    if (src.narration !== undefined && narration === '') warn('narration');

    const summary = typeof src.summary === 'string' ? src.summary : '';
    if (src.summary !== undefined && summary === '') warn('summary');

    const location = typeof src.location === 'string' && src.location.length > 0 ? src.location : undefined;
    if (src.location !== undefined && location === undefined) warn('location');

    let next: AIResponse['next'] = { type: 'group_action' };
    const nextParsed = NextSchema.safeParse(src.next);
    if (nextParsed.success) {
      next = nextParsed.data;
    } else if (src.next !== undefined) {
      warn('next');
    }

    let merchants: MerchantSeed[] | undefined;
    if (src.merchants !== undefined) {
      const merchantsParsed = AIResponseSchema.shape.merchants.safeParse(src.merchants);
      if (merchantsParsed.success) {
        merchants = merchantsParsed.data;
      } else {
        warn('merchants');
      }
    }

    let conditions: ConditionSeed[] | undefined;
    if (src.conditions !== undefined) {
      const conditionsParsed = AIResponseSchema.shape.conditions.safeParse(src.conditions);
      if (conditionsParsed.success) {
        conditions = conditionsParsed.data;
      } else {
        warn('conditions');
      }
    }

    return { narration, summary, location, merchants, conditions, next };
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
