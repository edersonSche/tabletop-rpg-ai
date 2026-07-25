import { AIContext } from '../ai.interface';
import { AIResponse } from '../../dto/ai-response.dto';
import { getSystemPrompt } from '../prompts/system.prompt';

export function formatHistoryEntries(
  history: AIContext['history'],
  maxEntries = 30,
): string {
  return history.slice(-maxEntries).map(h =>
    h.role === 'player' ? `[${h.playerId || 'unknown'}] ${h.content}`
    : h.role === 'assistant' ? `GM: ${h.content}`
    : `[system] ${h.content}`
  ).join('\n');
}

export function buildTradePrompt(
  context: AIContext,
  verbose: boolean,
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

  if (context.summary) {
    lines.push(`## Long-Term Memory (campaign summary)\n${context.summary}`);
    lines.push('');
  }

  if (context.history.length > 0) {
    lines.push('## Recent Events (last 30 actions)');
    lines.push(formatHistoryEntries(context.history));
    lines.push('');
  }

  if (context.currentAction?.action === 'initiate_trade') {
    lines.push(...buildTradePrompt(context, false));
    return lines.join('\n');
  }

  lines.push(...buildActionLines(context.currentAction));
  return lines.join('\n');
}

export function parseResponse(text: string): AIResponse {
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
