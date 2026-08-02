import { AIContext } from '../ai.interface';
import { buildActionLines, buildTargetPlayerContext } from '../shared/prompt-builder';

export function getCallPlayerPrompt(context: AIContext): string {
  const parts = [
    ...buildTargetPlayerContext(context),
    ...buildActionLines(context.currentAction),
    buildCallPlayerExample(),
  ];
  return parts.join('\n');
}

function buildCallPlayerExample(): string {
  return [
    'Respond with a single JSON object matching this structure:',
    '{',
    '  "narration": "(Markdown narration addressing the target player)",',
    '  "summary": "(updated summary: [SCENE] [EVENTS] [NPCS] [THREATS] [STATUS])",',
    '  "location": "(current location)",',
    '  "next": { "type": "call_player", "target": "(valid player id from the Players list)" }',
    '}',
    'Use placeholders only — never copy example text. "target" must be a real player id — never use names.',
  ].join('\n');
}
