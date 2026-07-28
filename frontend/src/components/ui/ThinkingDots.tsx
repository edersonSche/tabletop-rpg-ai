import { memo } from 'react';

export const ThinkingDots = memo(function ThinkingDots() {
  return (
    <span>
      <span className="thinking-dot inline-block">.</span>
      <span className="thinking-dot inline-block">.</span>
      <span className="thinking-dot inline-block">.</span>
    </span>
  );
});
