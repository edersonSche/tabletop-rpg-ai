import { AIContext, GamePhase } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { getSystemPrompt } from '../prompts/system.prompt';
import { getGroupActionPrompt } from '../prompts/group-action.prompt';
import { getCallPlayerPrompt } from '../prompts/call-player.prompt';
import { getCallRollPrompt } from '../prompts/call-roll.prompt';
import { getTradePrompt } from '../prompts/trade.prompt';

const HISTORY_PER_PHASE: Record<GamePhase, number> = {
  group_action: 8,
  call_player: 5,
  call_roll: 4,
  trade: 3,
};

export function getPhasePrompt(context: AIContext): string {
  switch (context.gamePhase) {
    case 'trade': return getTradePrompt(context);
    case 'call_player': return getCallPlayerPrompt(context);
    case 'call_roll': return getCallRollPrompt(context);
    default: return getGroupActionPrompt(context);
  }
}

export function formatHistoryEntries(
  history: AIContext['history'],
  maxEntries: number,
): string {
  return history.slice(-maxEntries).map(h =>
    h.role === 'player' ? `[${h.playerId || 'unknown'}] ${h.content}`
    : h.role === 'assistant' ? `GM: ${h.content}`
    : `[system] ${h.content}`
  ).join('\n');
}

export function buildTargetPlayerContext(context: AIContext): string[] {
  const lines: string[] = [];
  if (context.gamePhase !== 'call_player' && context.gamePhase !== 'call_roll') return lines;

  const targetId = context.currentAction?.playerId;
  if (!targetId) return lines;

  const target = context.players.find(p => p.id === targetId);
  if (!target || !target.attributes) return lines;

  const attrs = target.attributes;
  const mods = Object.entries(attrs).map(([k, v]) => `${k}: ${v} (mod ${Math.floor((v - 10) / 2)})`);
  lines.push(`## Target Player: ${target.name}\n${mods.join(', ')}${target.hp !== undefined ? `\nHP: ${target.hp}/${target.maxHp}` : ''}`);
  lines.push('');
  return lines;
}

export function buildPhaseContexts(
  context: AIContext,
): string[] {
  const lines: string[] = [];

  if (context.history.length > 0) {
    const maxEntries = HISTORY_PER_PHASE[context.gamePhase] || 5;
    lines.push(`## Recent Events (last ${maxEntries})\n${formatHistoryEntries(context.history, maxEntries)}`);
    lines.push('');
  }

  return lines;
}

export function buildActionLines(
  action: AIContext['currentAction'],
): string[] {
  const lines: string[] = [];
  if (action) {
    if (action.characterName) {
      lines.push(`Player acting: ${action.characterName}`);
    }
    if (action.action) {
      lines.push(`Action: ${action.action}`);
    }
    if (action.rollResult !== undefined) {
      const roll = `Roll: ${action.rollResult}`;
      const dc = action.dc ? ` (DC ${action.dc})` : '';
      lines.push(`${roll}${dc}`);
      if (action.skill) {
        lines.push(`Skill: ${action.skill}`);
      }
    }
    lines.push('');
  }
  if (action?.rollResult !== undefined && action?.dc !== undefined) {
    lines.push('Note: a roll was made. If the roll meets or exceeds the DC, describe success. Otherwise describe failure.');
  }
  return lines;
}

export function buildFullPrompt(context: AIContext): string {
  return [
    getSystemPrompt(context),
    '',
    ...buildPhaseContexts(context),
    getPhasePrompt(context),
  ].join('\n');
}

export function parseResponse(text: string): AIResponse {
  const cleaned = text
    .replace(/```(?:json)?\s*\n?/g, '')
    .replace(/```\s*$/g, '')
    .trim();

  const greedyMatch = cleaned.match(/\{[\s\S]*\}/);
  if (greedyMatch) {
    try {
      return JSON.parse(greedyMatch[0]) as AIResponse;
    } catch {}
  }

  try {
    return JSON.parse(cleaned) as AIResponse;
  } catch {}

  const fallbackMatch = cleaned.match(/\{[\s\S]*?\}/);
  if (fallbackMatch) {
    try {
      return JSON.parse(fallbackMatch[0]) as AIResponse;
    } catch {}
  }

  console.warn('[parseResponse] Failed to parse AI response as JSON:', cleaned.slice(0, 200));
  return {
    narration: cleaned,
    summary: cleaned.slice(0, 200),
    next: { type: 'group_action' },
  };
}
