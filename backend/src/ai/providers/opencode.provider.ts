import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { AIProvider, AIConfig, AIContext } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { getSystemPrompt } from '../prompts/system.prompt';
import {
  getPhasePrompt,
  buildPhaseContexts,
  buildFullPrompt,
  parseResponse,
} from '../shared/prompt-builder';
import { retryWithBackoff } from '../shared/retry';

@Injectable()
export class OpencodeProvider implements AIProvider, OnModuleInit {
  private client: any = null;
  private sessions = new Map<string, string>();
  private sessionContextSent = new Map<string, string>();

  private static readonly RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];
  private static readonly NETWORK_ERROR_PATTERN =
    /fetch failed|network error|econnrefused|econnreset|etimedout|enotfound|eai_again/i;

  constructor(@Inject('AI_CONFIG') private config: AIConfig) {}

  async onModuleInit(): Promise<void> {
    this.validateConfig(this.config);

    const sdk = await eval('import("@opencode-ai/sdk")');
    const { createOpencodeClient } = sdk;
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`opencode:${this.config.apiKey}`).toString('base64');
    }
    this.client = createOpencodeClient({
      baseUrl: this.config.baseUrl || 'http://localhost:4096',
      throwOnError: true,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });
  }

  validateConfig(config: AIConfig): void {
    if (!config.model) {
      throw new Error('AI_MODEL is required for OpenCode provider');
    }
    if (!config.baseUrl) {
      throw new Error('AI_BASE_URL is required for OpenCode provider');
    }
  }

  async generate(context: AIContext): Promise<AIResponse> {
    try {
      if (!this.sessionContextSent.has(context.roomId)) {
        await this.onRoomReady(context.roomId, context);
      }

      const prompt = this.buildIncrementalPrompt(context);
      const message = await this.sendMessageWithRetry(context.roomId, prompt);
      const text = this.extractText(message);

      return parseResponse(text);
    } catch (error) {
      console.error('Opencode provider error:', error.message);

      if (this.isSessionError(error)) {
        this.sessions.delete(context.roomId);
        this.sessionContextSent.delete(context.roomId);

        try {
          await this.onRoomReady(context.roomId, context);
          const fullPrompt = buildFullPrompt(context);
          const message = await this.sendMessageWithRetry(context.roomId, fullPrompt);
          return parseResponse(this.extractText(message));
        } catch (retryError) {
          console.error('Opencode provider retry failed:', retryError.message);
          return this.fallbackResponse(context);
        }
      }

      return this.fallbackResponse(context);
    }
  }

  async onRoomReady(roomId: string, context: AIContext): Promise<void> {
    if (!this.sessions.has(roomId)) {
      const sessionId = await this.createSession();
      this.sessions.set(roomId, sessionId);
    }

    const fingerprint = this.buildContextFingerprint(context);
    if (this.sessionContextSent.get(roomId) === fingerprint) {
      return;
    }

    const lines: string[] = [
      getSystemPrompt(context),
      '',
      ...buildPhaseContexts(context),
    ];

    await this.sendMessage(roomId, lines.join('\n'), true);
    this.sessionContextSent.set(roomId, fingerprint);
  }

  private buildContextFingerprint(context: AIContext): string {
    return JSON.stringify({
      players: context.players.map(p => ({
        id: p.id,
        name: p.name,
        level: p.level,
      })),
      currentLocation: context.currentLocation,
      summary: context.summary,
    });
  }

  async destroy(): Promise<void> {
    const deletePromises: Promise<void>[] = [];
    for (const sessionId of this.sessions.values()) {
      deletePromises.push(
        this.client.session.delete({ path: { id: sessionId } }).then(() => {}).catch(() => {})
      );
    }
    await Promise.all(deletePromises);
    this.sessions.clear();
    this.sessionContextSent.clear();
  }

  async onRoomEmpty(roomId: string): Promise<void> {
    const sessionId = this.sessions.get(roomId);
    if (!sessionId) return;

    await this.client.session.delete({ path: { id: sessionId } }).catch(() => {});

    this.sessions.delete(roomId);
    this.sessionContextSent.delete(roomId);
  }

  private async createSession(): Promise<string> {
    const result = await this.client.session.create({ body: {} });
    return result.data.id;
  }

  private async sendMessage(roomId: string, content: string, noReply = false): Promise<{ info: any; parts: any[] }> {
    const sessionId = this.sessions.get(roomId);
    if (!sessionId) {
      throw new Error(`No session for room: ${roomId}`);
    }

    const result = await this.client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: content }],
        ...(noReply ? { noReply: true } : {}),
      },
    });

    return result.data;
  }

  private buildIncrementalPrompt(context: AIContext): string {
    const phasePrompt = getPhasePrompt(context);
    if (phasePrompt) return phasePrompt;
    return 'The adventure continues. What happens next?';
  }

  private isSessionError(error: any): boolean {
    const cause = error?.cause;
    const status = cause?.status;
    const name = cause?.body?.name;
    return (
      status === 400 ||
      status === 404 ||
      status === 410 ||
      name === 'NotFoundError' ||
      name === 'BadRequest'
    );
  }

  private async sendMessageWithRetry(roomId: string, content: string): Promise<{ info: any; parts: any[] }> {
    return retryWithBackoff(
      () => this.sendMessage(roomId, content),
      {
        decide: (error) => this.retryDelayFor(error),
        onRetry: (attempt, error, delayMs) => {
          console.warn(
            `Opencode provider transient error (attempt ${attempt}): ${error.message} — retrying in ${delayMs}ms`,
          );
        },
      },
    );
  }

  private retryDelayFor(error: any): number | true | false {
    const status = error?.cause?.status;
    if (typeof status === 'number') {
      return OpencodeProvider.RETRYABLE_STATUS.includes(status);
    }
    const message = error?.message || '';
    if (OpencodeProvider.NETWORK_ERROR_PATTERN.test(message)) {
      return true;
    }
    return false;
  }

  private extractText(message: { parts: any[] }): string {
    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        return part.text;
      }
    }
    throw new Error('No text part found in response');
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
