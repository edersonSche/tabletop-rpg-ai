import { AIProvider, AIConfig, AIContext } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { getSystemPrompt } from '../prompts/system.prompt';

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

export class OpencodeProvider implements AIProvider {
  private baseUrl: string;
  private auth: string | null = null;
  private model: string | null = null;
  private sessions = new Map<string, string>();
  private sessionContextSent = new Set<string>();

  configure(config: AIConfig): void {
    this.baseUrl = config.baseUrl || 'http://localhost:4096';
    this.model = config.model || null;

    if (config.apiKey) {
      this.auth = 'Basic ' + Buffer.from(`opencode:${config.apiKey}`).toString('base64');
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

      return this.parseResponse(text);
    } catch (error) {
      console.error('Opencode provider error:', error.message);

      if (this.isSessionError(error)) {
        this.sessions.delete(context.roomId);
        this.sessionContextSent.delete(context.roomId);

        try {
          await this.onRoomReady(context.roomId, context);
          const fullPrompt = this.buildPrompt(context);
          const message = await this.sendMessage(context.roomId, fullPrompt);
          return this.parseResponse(this.extractText(message));
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
      const res = await fetch(`${this.baseUrl}/session`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(`Failed to create session: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as SessionResponse;
      this.sessions.set(roomId, data.id);
    }

    const systemPrompt = getSystemPrompt(context);

    const historyBlock = context.history.length > 0
      ? '\n\n## Previous Events\n' + context.history.slice(-30).map(h =>
          h.role === 'player' ? `[${h.playerId || 'unknown'}] ${h.content}`
          : h.role === 'assistant' ? `GM: ${h.content}`
          : `[system] ${h.content}`
        ).join('\n')
      : '';

    await this.sendMessage(roomId, systemPrompt + historyBlock);
    this.sessionContextSent.add(roomId);
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

  private buildIncrementalPrompt(context: AIContext): string {
    const lines: string[] = [];

    if (context.currentAction) {
      if (context.currentAction.characterName) {
        lines.push(`Player acting: ${context.currentAction.characterName}`);
      }
      if (context.currentAction.action) {
        lines.push(`Action: ${context.currentAction.action}`);
      }
      if (context.currentAction.rollResult !== undefined) {
        const roll = `Roll: ${context.currentAction.rollResult}`;
        const dc = context.currentAction.dc ? ` (DC ${context.currentAction.dc})` : '';
        lines.push(`${roll}${dc}`);
        if (context.currentAction.skill) {
          lines.push(`Skill: ${context.currentAction.skill}`);
        }
      }
      lines.push('');
    }

    if (context.currentAction?.rollResult !== undefined && context.currentAction?.dc !== undefined) {
      lines.push('Note: a roll was made. If the roll meets or exceeds the DC, describe success. Otherwise describe failure.');
    }

    if (lines.length === 0) {
      lines.push('The adventure continues. What happens next?');
    }

    return lines.join('\n');
  }

  private buildPrompt(context: AIContext): string {
    const lines: string[] = [
      getSystemPrompt(context),
      '',
    ];

    if (context.history.length > 0) {
      lines.push('Recent history:');
      for (const entry of context.history.slice(-30)) {
        if (entry.role === 'player') {
          lines.push(`[${entry.playerId || 'unknown'}] ${entry.content}`);
        } else if (entry.role === 'assistant') {
          lines.push(`GM: ${entry.content}`);
        }
      }
      lines.push('');
    }

    if (context.currentAction) {
      if (context.currentAction.characterName) {
        lines.push(`Player acting: ${context.currentAction.characterName}`);
      }
      if (context.currentAction.action) {
        lines.push(`Action: ${context.currentAction.action}`);
      }
      if (context.currentAction.rollResult !== undefined) {
        const roll = `Roll: ${context.currentAction.rollResult}`;
        const dc = context.currentAction.dc ? ` (DC ${context.currentAction.dc})` : '';
        lines.push(`${roll}${dc}`);
        if (context.currentAction.skill) {
          lines.push(`Skill: ${context.currentAction.skill}`);
        }
      }
      lines.push('');
    }

    if (context.currentAction?.rollResult !== undefined && context.currentAction?.dc !== undefined) {
      lines.push('Note: a roll was made. If the roll meets or exceeds the DC, describe success. Otherwise describe failure.');
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

  private parseResponse(text: string): AIResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? jsonMatch[0] : text;

    try {
      return JSON.parse(json) as AIResponse;
    } catch {
      return {
        narration: text,
        next: { type: 'group_action' },
      };
    }
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
