import { AIContext } from "../ai.interface";

export function getTradePrompt(context: AIContext): string {
  const lines: string[] = [];
  const location = context.currentLocation || "unknown";
  const levels = context.players.map((p) => p.level).join(", ");
  lines.push(
    `[Trade Request] ${context.currentAction!.characterName} is looking for merchants at ${location}.`,
  );
  lines.push("");
  lines.push(`Campaign theme: ${context.campaignTheme}`);
  lines.push(`Party levels: ${levels}`);
  lines.push(`Current location: ${location}`);
  lines.push(`Language: ${context.language}`);
  lines.push(
    "All dialogue, narration, item names, descriptions, and greetings must be written in this language.",
  );
  lines.push("");

  const partyState = context.players
    .filter((p) => p.hp !== undefined)
    .map(
      (p) =>
        `${p.name}: ${p.hp !== undefined ? `${p.hp}/${p.maxHp} HP, ` : ""}${p.attributes ? `CHA ${p.attributes.charisma}` : ""}`,
    )
    .join("; ");
  if (partyState) {
    lines.push(`Party state: ${partyState}`);
    lines.push("");
  }

  lines.push(
    "Generate merchants that would logically be found at this location.",
  );
  lines.push("The number of merchants must reflect the location type:");
  lines.push("- Cities, towns, markets: many merchants (up to 10)");
  lines.push("- Villages, outposts: few merchants (2-5)");
  lines.push(
    "- Wilderness, dungeons, remote areas: 1 merchant at most (if any)",
  );
  lines.push('Return between 1 and 10 merchants in the "merchants" array.');
  lines.push("");
  lines.push("For each merchant return:");
  lines.push(`- name: unique, flavorful name in ${context.language}`);
  lines.push(
    '- type: specialty (e.g., "blacksmith", "alchemist", "general_goods")',
  );
  lines.push(`- greeting: a line of dialogue in ${context.language}`);
  lines.push("- coins: how much coin they have to buy from players");
  lines.push(
    "- items: 3-8 items for sale with name, description, type, slot (if equippable), baseBuyPrice, baseSellPrice, quantity, effects, antidoteFor (if antidote)",
  );
  lines.push("");
  lines.push("  EFFECTS RULES per item type:");
  lines.push(
    '  - weapon / armor / shield: MUST have at least one stat effect (e.g., "stat": "ac" for armor/shield, "stat": "damage" for weapon). "type": "permanent".',
  );
  lines.push(
    '  - potion (healing): MUST have hpChange ("type": "immediate", "hpFormula", "hpType": "heal").',
  );
  lines.push(
    "  - potion (antidote): MUST have antidoteFor (condition name it cures) + hpChange or stat effect.",
  );
  lines.push(
    "  - scroll / key_item / misc: effects are OPTIONAL (can be empty array).",
  );
  lines.push("");
  lines.push(
    'IMPORTANT: Your response MUST be a valid JSON object with ALL standard fields (narration, summary, location, next) as described in the system prompt, PLUS the "merchants" array. Do NOT return only merchants.',
  );
  lines.push("");
  lines.push("Expected JSON structure:");
  lines.push("{");
  lines.push(
    '  "narration": "(narration in ' +
      context.language +
      ' describing the merchant scene)",',
  );
  lines.push('  "summary": "(updated summary in ' + context.language + ')",');
  lines.push('  "location": "Same as current location.",');
  lines.push('  "next": { "type": "group_action" },');
  lines.push('  "merchants": [');
  lines.push("    {");
  lines.push('      "name": "Merchant Name",');
  lines.push('      "type": "blacksmith",');
  lines.push('      "greeting": "(greeting in ' + context.language + ')",');
  lines.push('      "coins": 100,');
  lines.push('      "items": [');
  lines.push("        {");
  lines.push('          "name": "(item name in ' + context.language + ')",');
  lines.push(
    '          "description": "(description in ' + context.language + ')",',
  );
  lines.push('          "type": "weapon",');
  lines.push('          "slot": "hand",');
  lines.push('          "baseBuyPrice": 15,');
  lines.push('          "baseSellPrice": 7,');
  lines.push('          "quantity": 1,');
  lines.push(
    '          "effects": [{ "type": "permanent", "stat": "damage", "statValue": 1, "statOperation": "add" }]',
  );
  lines.push("        },");
  lines.push("        {");
  lines.push('          "name": "(potion name in ' + context.language + ')",');
  lines.push(
    '          "description": "(description in ' + context.language + ')",',
  );
  lines.push('          "type": "potion",');
  lines.push('          "baseBuyPrice": 50,');
  lines.push('          "baseSellPrice": 25,');
  lines.push('          "quantity": 2,');
  lines.push(
    '          "effects": [{ "type": "immediate", "hpFormula": "2d4+2", "hpType": "heal" }]',
  );
  lines.push("        }");
  lines.push("      ]");
  lines.push("    }");
  lines.push("  ]");
  lines.push("}");
  lines.push("");
  lines.push(
    'If no merchant would be at this location, return an empty "merchants" array.',
  );
  return lines.join("\n");
}
