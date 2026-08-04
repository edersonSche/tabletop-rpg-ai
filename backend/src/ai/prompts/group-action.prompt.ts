import { AIContext } from '../ai.interface';
import { buildActionLines } from '../shared/prompt-builder';

export function getGroupActionPrompt(context: AIContext): string {
  const lines = buildActionLines(context.currentAction);
  const actionGuidance = [
    "Resolve the action through the fiction: weigh the player's intent and abilities against the situation, then show logical consequences (NPC reactions, environment changes, new threats).",
    'If a roll was made, its result against the DC is the arbiter of success or failure.',
    'Anchor the narration in the current location and ongoing context — never contradict what was established.',
  ];
  const openGuidance = [
    'No player action to resolve. Advance the scene on your own:',
    '- Describe the current location and its atmosphere.',
    '- Have an NPC, creature, or environment event act or react.',
    '- Introduce a hook, clue, or dilemma the party can respond to.',
    '- Keep it brief and open-ended — do not resolve what the players did not choose.',
  ];

  const prompt =
    lines.length === 0
      ? openGuidance.join('\n')
      : [...lines, ...actionGuidance].join('\n');
  return `${prompt}\n\n${buildGroupActionExample()}`;
}

function buildGroupActionExample(): string {
  return [
    'Respond with a single JSON object matching this structure:',
    '{',
    '  "narration": "(Markdown narration describing the scene)",',
    '  "summary": "(updated summary: [SCENE] [EVENTS] [NPCS] [THREATS] [STATUS])",',
    '  "location": "(current location)",',
    '  "next": { "type": "group_action" },',
    '  "conditions": [',
    '    {',
    '      "targetPlayerId": "(valid player id)",',
    '      "name": "Condition Name",',
    '      "description": "(short description)",',
    '      "effects": [{ "type": "temporary", "duration": 2, "stat": "strength", "statValue": -2, "statOperation": "add" }]',
    '    }',
    '  ]',
    '}',
    'Use placeholders only — never copy example text. "conditions" is optional; omit it when nothing affects a player.',
  ].join('\n');
}
