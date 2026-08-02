import { AIContext } from '../ai.interface';
import { buildActionLines, buildTargetPlayerContext } from '../shared/prompt-builder';

export function getCallRollPrompt(context: AIContext): string {
  const parts = [
    ...buildTargetPlayerContext(context),
    ...buildActionLines(context.currentAction),
    buildCallRollExample(),
  ];
  return parts.join('\n');
}

function buildCallRollExample(): string {
  return [
    'Respond with a single JSON object matching this structure:',
    '{',
    '  "narration": "(Markdown narration describing why the skill check is needed)",',
    '  "summary": "(updated summary: [SCENE] [EVENTS] [NPCS] [THREATS] [STATUS])",',
    '  "location": "(current location)",',
    '  "next": { "type": "call_roll", "target": "(valid player id)", "skill": "dexterity", "dc": 13 }',
    '}',
    'Use placeholders only — never copy example text. "skill" must be an attribute name; "dc" between 5 and 30.',
  ].join('\n');
}
