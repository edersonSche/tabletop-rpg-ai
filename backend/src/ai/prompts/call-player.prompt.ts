import { AIContext } from '../ai.interface';
import { buildActionLines, buildTargetPlayerContext } from '../shared/prompt-builder';

export function getCallPlayerPrompt(context: AIContext): string {
  const parts = [
    ...buildTargetPlayerContext(context),
    ...buildActionLines(context.currentAction),
  ];
  return parts.join('\n');
}
