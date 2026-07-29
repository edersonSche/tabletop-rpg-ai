import { AIContext } from '../ai.interface';

export function getTradePrompt(context: AIContext): string {
  const lines: string[] = [];
  const location = context.currentLocation || 'unknown';
  const levels = context.players.map(p => p.level).join(', ');
  lines.push(`[Trade Request] ${context.currentAction!.characterName} is looking for merchants at ${location}.`);
  lines.push('');
  lines.push(`Campaign theme: ${context.campaignTheme}`);
  lines.push(`Party levels: ${levels}`);
  lines.push(`Current location: ${location}`);
  lines.push('');

  const partyState = context.players
    .filter(p => p.hp !== undefined)
    .map(p => `${p.name}: ${p.hp !== undefined ? `${p.hp}/${p.maxHp} HP, ` : ''}${p.attributes ? `CHA ${p.attributes.charisma}` : ''}`)
    .join('; ');
  if (partyState) {
    lines.push(`Party state: ${partyState}`);
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
  lines.push('IMPORTANT: Your response MUST be a valid JSON object with ALL standard fields (narration, summary, location, next) as described in the system prompt, PLUS the "merchants" array. Do NOT return only merchants.');
  lines.push('');
  lines.push('Expected JSON structure:');
  lines.push('{');
  lines.push('  "narration": "Brief atmospheric description of the merchant scene at this location.",');
  lines.push('  "summary": "Updated summary merging new events.",');
  lines.push('  "location": "Same as current location.",');
  lines.push('  "next": { "type": "group_action" },');
  lines.push('  "merchants": [');
  lines.push('    {');
  lines.push('      "name": "Merchant Name",');
  lines.push('      "type": "blacksmith",');
  lines.push('      "greeting": "Welcome, travelers!",');
  lines.push('      "coins": 100,');
  lines.push('      "items": [');
  lines.push('        { "name": "Item", "description": "...", "type": "weapon", "slot": "mainHand", "baseBuyPrice": 10, "baseSellPrice": 5, "quantity": 1, "effects": [] }');
  lines.push('      ]');
  lines.push('    }');
  lines.push('  ]');
  lines.push('}');
  lines.push('');
  lines.push('If no merchant would be at this location, return an empty "merchants" array.');
  return lines.join('\n');
}
