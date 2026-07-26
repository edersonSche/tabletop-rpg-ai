import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { AIProvider, AIConfig, AIContext } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { getSystemPrompt } from '../prompts/system.prompt';
import {
  formatHistoryEntries,
  buildActionLines,
  buildTradePrompt,
  buildFullPrompt,
  parseResponse,
} from '../shared/prompt-builder';

@Injectable()
export class OpencodeProvider implements AIProvider, OnModuleInit {
  private client: any = null;
  private sessions = new Map<string, string>();
  private sessionContextSent = new Set<string>();

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
      const message = await this.sendMessage(context.roomId, prompt);
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
          const message = await this.sendMessage(context.roomId, fullPrompt);
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

    let systemPrompt = getSystemPrompt(context);

    if (context.summary) {
      systemPrompt += `\n\n## Long-Term Memory (campaign summary)\n${context.summary}`;
    }

    const historyBlock = context.history.length > 0
      ? '\n\n## Recent Events (last 30 actions)\n' + formatHistoryEntries(context.history)
      : '';

    await this.sendMessage(roomId, systemPrompt + historyBlock);
    this.sessionContextSent.add(roomId);
  }

  async summarize(entries: string[], existingSummary?: string): Promise<string> {
    const promptLines: string[] = [];

    if (existingSummary) {
      promptLines.push(`Existing campaign summary:\n${existingSummary}\n`);
      promptLines.push('Below are new events that happened after that summary. Please produce an updated, merged narrative summary that incorporates both the existing summary and these new events. Keep it concise but capture key plot points, character developments, locations, NPCs, and important decisions.');
    } else {
      promptLines.push('Summarize the following RPG campaign history concisely in narrative prose, capturing key plot points, character developments, locations visited, NPCs encountered, and important decisions made by the players.');
    }

    promptLines.push('');
    promptLines.push(...entries);
    promptLines.push('');
    promptLines.push('Return only the updated summary as plain text, no JSON, no formatting.');

    const prompt = promptLines.join('\n');
    const sessionId = await this.createSession();

    try {
      const result = await this.client.session.prompt({
        path: { id: sessionId },
        body: { parts: [{ type: 'text', text: prompt }] },
      });

      const text = this.extractText(result.data);
      return text.trim();
    } finally {
      this.client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }
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

  private async sendMessage(roomId: string, content: string): Promise<{ info: any; parts: any[] }> {
    const sessionId = this.sessions.get(roomId);
    if (!sessionId) {
      throw new Error(`No session for room: ${roomId}`);
    }

    const result = await this.client.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: 'text', text: content }] },
    });

    return result.data;
  }

  private buildIncrementalPrompt(context: AIContext): string {
    if (context.currentAction?.action === 'initiate_trade') {
      return buildTradePrompt(context, true).join('\n');
    }

    const lines = buildActionLines(context.currentAction);
    if (lines.length === 0) {
      lines.push('The adventure continues. What happens next?');
    }
    return lines.join('\n');
  }

  private isSessionError(error: any): boolean {
    const name = error?.cause?.name;
    return name === 'NotFoundError' || name === 'BadRequest';
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
      next: {
        type: 'group_action',
      },
    };
  }
}
