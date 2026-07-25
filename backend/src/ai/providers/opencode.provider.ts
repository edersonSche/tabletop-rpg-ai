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

interface MessagePart {
  type: string;
  text?: string;
}

interface SessionResponse {
  id: string;
}

interface MessageResponse {
  info: Record<string, unknown>;
  parts: MessagePart[];
}

@Injectable()
export class OpencodeProvider implements AIProvider, OnModuleInit {
  private baseUrl: string;
  private auth: string | null = null;
  private model: string | null = null;
  private sessions = new Map<string, string>();
  private sessionContextSent = new Set<string>();

  constructor(@Inject('AI_CONFIG') private config: AIConfig) {}

  onModuleInit(): void {
    this.baseUrl = this.config.baseUrl || 'http://localhost:4096';
    this.model = this.config.model || null;

    if (this.config.apiKey) {
      this.auth = 'Basic ' + Buffer.from(`opencode:${this.config.apiKey}`).toString('base64');
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
      const body: Record<string, unknown> = {
        parts: [{ type: 'text', text: prompt }],
      };
      if (this.model) body.model = this.model;

      const msgRes = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      if (!msgRes.ok) {
        throw new Error(`Summarization request failed: ${msgRes.status}`);
      }

      const msgData = (await msgRes.json()) as MessageResponse;
      const text = this.extractText(msgData);
      return text.trim();
    } finally {
      fetch(`${this.baseUrl}/session/${sessionId}`, {
        method: 'DELETE',
        headers: this.headers(),
      }).catch(() => {});
    }
  }

  async destroy(): Promise<void> {
    const deletePromises: Promise<void>[] = [];
    for (const sessionId of this.sessions.values()) {
      deletePromises.push(
        fetch(`${this.baseUrl}/session/${sessionId}`, {
          method: 'DELETE',
          headers: this.headers(),
        }).then(() => {}).catch(() => {})
      );
    }
    await Promise.all(deletePromises);
    this.sessions.clear();
    this.sessionContextSent.clear();
  }

  async onRoomEmpty(roomId: string): Promise<void> {
    const sessionId = this.sessions.get(roomId);
    if (!sessionId) return;

    await fetch(`${this.baseUrl}/session/${sessionId}`, {
      method: 'DELETE',
      headers: this.headers(),
    }).catch(() => {});

    this.sessions.delete(roomId);
    this.sessionContextSent.delete(roomId);
  }

  private async sendMessage(roomId: string, content: string): Promise<MessageResponse> {
    const sessionId = this.sessions.get(roomId);
    if (!sessionId) {
      throw new Error(`No session for room: ${roomId}`);
    }

    const body: Record<string, unknown> = {
      parts: [{ type: 'text', text: content }],
    };

    if (this.model) {
      body.model = this.model;
    }

    const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = new Error(`Failed to send message: ${res.status} ${res.statusText}`);
      (err as any).status = res.status;
      throw err;
    }

    return (await res.json()) as MessageResponse;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.auth) {
      headers['Authorization'] = this.auth;
    }

    return headers;
  }

  private async createSession(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error(`Failed to create session: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as SessionResponse;
    return data.id;
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
    const status = error?.status;
    return status === 404 || status === 410 || status === 400;
  }

  private extractText(message: MessageResponse): string {
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
