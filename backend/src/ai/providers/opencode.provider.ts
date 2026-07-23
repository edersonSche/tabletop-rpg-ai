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
      const sessionId = await this.createSession();
      this.sessions.set(roomId, sessionId);
    }

    let systemPrompt = getSystemPrompt(context);

    if (context.summary) {
      systemPrompt += `\n\n## Long-Term Memory (campaign summary)\n${context.summary}`;
    }

    const historyBlock = context.history.length > 0
      ? '\n\n## Recent Events (last 30 actions)\n' + this.formatHistoryEntries(context)
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

  private formatHistoryEntries(context: AIContext): string {
    return context.history.slice(-30).map(h =>
      h.role === 'player' ? `[${h.playerId || 'unknown'}] ${h.content}`
      : h.role === 'assistant' ? `GM: ${h.content}`
      : `[system] ${h.content}`
    ).join('\n');
  }

  private buildTradePrompt(context: AIContext, verbose: boolean): string[] {
    const lines: string[] = [];
    const location = context.currentLocation || 'unknown';
    const levels = context.players.map(p => p.level).join(', ');
    lines.push(`[Trade Request] ${context.currentAction!.characterName} is looking for merchants at ${location}.`);
    lines.push('');
    lines.push(`Campaign theme: ${context.campaignTheme}`);
    lines.push(`Party levels: ${levels}`);
    lines.push(`Current location: ${location}`);
    lines.push('');
    lines.push('Generate merchants that would logically be found at this location.');
    lines.push('The number of merchants must reflect the location type:');
    lines.push('- Cities, towns, markets: many merchants (up to 10)');
    lines.push('- Villages, outposts: few merchants (2-5)');
    lines.push('- Wilderness, dungeons, remote areas: 1 merchant at most (if any)');
    lines.push(`Return between 1 and 10 merchants in ${verbose ? 'the "merchants" array.' : '"merchants" array.'}`);
    lines.push('');
    lines.push('For each merchant return:');
    lines.push('- name: unique, flavorful name');
    lines.push(`- type: specialty (e.g., "blacksmith", "alchemist", "general_goods"${verbose ? ', "apothecary", "curio_merchant", "armorer", "enchanter", etc.)' : ')'}`);
    lines.push('- greeting: a line of dialogue in the campaign language');
    lines.push(`- coins: how much coin they have to buy from players${verbose ? ' (reasonable amount based on location)' : ''}`);
    lines.push('- items: 3-8 items for sale');
    if (verbose) {
      lines.push('');
      lines.push('For each item:');
      lines.push('- name, description (in the campaign language)');
      lines.push('- type: "weapon" | "armor" | "shield" | "potion" | "scroll" | "key_item" | "misc"');
      lines.push('- slot: "body" | "hand" | "two-handed" (only for equippable items)');
      lines.push('- baseBuyPrice: what the merchant charges TO SELL (higher price)');
      lines.push('- baseSellPrice: what the merchant pays TO BUY (lower, roughly 40-60% of baseBuyPrice)');
      lines.push('- quantity: stock amount');
      lines.push('- effects: optional array of { type, duration?, stat?, statValue?, statOperation?, dexCap?, hpFormula?, hpType? }');
    } else {
      lines.push('');
      lines.push('For each item: name, description, type, slot (if equippable), baseBuyPrice, baseSellPrice, quantity, effects.');
    }
    lines.push('');
    lines.push('IMPORTANT: Return ONLY the "merchants" field in your JSON. Do NOT include a "narration" or any other field.');
    lines.push('If no merchant would be at this location, return an empty merchants array.');
    return lines;
  }

  private buildActionLines(context: AIContext): string[] {
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
    return lines;
  }

  private buildIncrementalPrompt(context: AIContext): string {
    if (context.currentAction?.action === 'initiate_trade') {
      return this.buildTradePrompt(context, true).join('\n');
    }

    const lines = this.buildActionLines(context);
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

    if (context.summary) {
      lines.push(`## Long-Term Memory (campaign summary)\n${context.summary}`);
      lines.push('');
    }

    if (context.history.length > 0) {
      lines.push('## Recent Events (last 30 actions)');
      lines.push(this.formatHistoryEntries(context));
      lines.push('');
    }

    if (context.currentAction?.action === 'initiate_trade') {
      lines.push(...this.buildTradePrompt(context, false));
      return lines.join('\n');
    }

    lines.push(...this.buildActionLines(context));
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
