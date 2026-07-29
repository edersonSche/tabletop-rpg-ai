import { AIContext } from '../ai.interface';
import { buildActionLines } from '../shared/prompt-builder';

export function getGroupActionPrompt(context: AIContext): string {
  const lines = buildActionLines(context.currentAction);
  if (lines.length === 0) return 'The adventure continues. What happens next?';
  return lines.join('\n');
}
