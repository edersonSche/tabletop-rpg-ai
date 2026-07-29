import { AIContext, GamePhase } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { getSystemPrompt } from '../prompts/system.prompt';

const HISTORY_PER_PHASE: Record<GamePhase, number> = {
  group_action: 8,
  call_player: 5,
  call_roll: 4,
  trade: 3,
};

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

export function buildTradePrompt(
  context: AIContext,
): string[] {
  const lines: string[] = [];
  const location = context.currentLocation || 'unknown';
  const levels = context.players.map(p => p.level).join(', ');
  lines.push(`[Trade Request] ${context.currentAction!.characterName} is looking for merchants at ${location}.`);
  lines.push('');
  lines.push(`Campaign theme: ${context.campaignTheme}`);
  lines.push(`Party levels: ${levels}`);
  lines.push(`Current location: ${location}`);
  lines.push('');

  const goldSummary = context.players
    .filter(p => p.hp !== undefined)
    .map(p => `${p.name}: ${p.hp !== undefined ? `${p.hp}/${p.maxHp} HP, ` : ''}${p.attributes ? `CHA ${p.attributes.charisma}` : ''}`)
    .join('; ');
  if (goldSummary) {
    lines.push(`Party state: ${goldSummary}`);
    lines.push('');
  }

  lines.push('Generate merchants that would logically be found at this location.');
  lines.push('The number of merchants must reflect the location type:');
  lines.push('- Cities, towns, markets: many merchants (up to 10)');
  lines.push('- Villages, outposts: few merchants (2-5)');
  lines.push('- Wilderness, dungeons, remote areas: 1 merchant at most (if any)');
  lines.push('Return between 1 and 10 merchants in the "merchants" array.');
  lines.push('');
  lines.push('For each merchant return:');
  lines.push('- name: unique, flavorful name');
  lines.push('- type: specialty (e.g., "blacksmith", "alchemist", "general_goods")');
  lines.push('- greeting: a line of dialogue in the campaign language');
  lines.push('- coins: how much coin they have to buy from players');
  lines.push('- items: 3-8 items for sale with name, description, type, slot (if equippable), baseBuyPrice, baseSellPrice, quantity, effects');
  lines.push('');
  lines.push('IMPORTANT: Return ONLY the "merchants" field in your JSON. Do NOT include a "narration" or any other field.');
  lines.push('If no merchant would be at this location, return an empty merchants array.');
  return lines;
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

  lines.push(...buildTargetPlayerContext(context));

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
  const lines: string[] = [
    getSystemPrompt(context),
    '',
  ];

  lines.push(...buildPhaseContexts(context));

  if (context.gamePhase === 'trade') {
    lines.push(...buildTradePrompt(context));
    return lines.join('\n');
  }

  lines.push(...buildActionLines(context.currentAction));
  return lines.join('\n');
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
