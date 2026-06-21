import { AIProvider, AIConfig, AIContext } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';

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

  configure(config: AIConfig): void {
    this.baseUrl = config.baseUrl || 'http://localhost:4096';
    this.model = config.model || null;

    if (config.apiKey) {
      this.auth = 'Basic ' + Buffer.from(`opencode:${config.apiKey}`).toString('base64');
    }
  }

  async generate(context: AIContext): Promise<AIResponse> {
    try {
      await this.onRoomReady(context.roomId);

      const prompt = this.buildPrompt(context);

      const message = await this.sendMessage(context.roomId, prompt);

      const text = this.extractText(message);

      return this.parseResponse(text);
    } catch (error) {
      console.error('Opencode provider error:', error.message);
      return this.fallbackResponse(context);
    }
  }

  async onRoomReady(roomId: string): Promise<void> {
    if (this.sessions.has(roomId)) return;

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

  async onRoomEmpty(roomId: string): Promise<void> {
    const sessionId = this.sessions.get(roomId);
    if (!sessionId) return;

    await fetch(`${this.baseUrl}/session/${sessionId}`, {
      method: 'DELETE',
      headers: this.headers(),
    }).catch(() => {});

    this.sessions.delete(roomId);
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
      throw new Error(`Failed to send message: ${res.status} ${res.statusText}`);
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

  private buildPrompt(context: AIContext): string {
    const langName = { english: 'English', portuguese: 'Portuguese (Brazil)', spanish: 'Spanish' }[context.language] || 'English';

    const lines: string[] = [
      `You are the Game Master for a tabletop RPG. Write all narrations in ${langName}. You may use Markdown formatting (**bold**, *italic*, lists, blockquotes) for emphasis. Respond with a JSON object only, no explanation outside the JSON.`,
      '',
      `Campaign: ${context.campaignName}`,
      `Setting: ${context.campaignSetting}`,
      `Language: ${langName}`,
      '',
      'Players:',
      ...context.players.map(p => `- ${p.name}`),
      '',
      ...(context.currentLocation ? [`Current location: ${context.currentLocation}`] : []),
      `Current scene: ${context.scene}`,
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

    lines.push(
      'Respond with valid JSON using this exact schema:',
      '{',
      '  "narration": "Your **narrative** text here with *markdown*",',
      '  "location": "optional — set when players move to a new place (e.g. \"tavern\", \"dark forest\", \"city square\")",',
      '  "next": {',
      '    "type": "group_action" | "call_player" | "call_roll" | "narration_only"',
      '  }',
      '}',
    );

    if (context.currentAction?.rollResult !== undefined && context.currentAction?.dc !== undefined) {
      lines.push('');
      lines.push('Note: a roll was made. If the roll meets or exceeds the DC, describe success. Otherwise describe failure.');
    }

    return lines.join('\n');
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
    const playerNames = context.players.map(p => p.name).join(', ');

    return {
      narration: `The adventure continues... ${context.currentAction?.action || 'The group awaits the next move.'}`,
      next: {
        type: 'group_action',
      },
    };
  }
}
