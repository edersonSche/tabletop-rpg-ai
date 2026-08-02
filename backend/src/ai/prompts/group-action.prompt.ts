import { AIContext } from '../ai.interface';
import { buildActionLines } from '../shared/prompt-builder';

export function getGroupActionPrompt(context: AIContext): string {
  const lines = buildActionLines(context.currentAction);
  const prompt =
    lines.length === 0
      ? 'The adventure continues. What happens next?'
      : lines.join('\n');
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
