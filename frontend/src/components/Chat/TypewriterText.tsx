import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
}

export function TypewriterText({ text, speed = 20 }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState(() => text.slice(0, 1));
  const paraRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (text.length <= 1) {
      setDisplayed(text);
      return;
    }

    let i = 1;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  useEffect(() => {
    if (paraRef.current) {
      const parent = paraRef.current.closest('.overflow-y-auto');
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [displayed]);

  return <span ref={paraRef}>{displayed}</span>;
}
