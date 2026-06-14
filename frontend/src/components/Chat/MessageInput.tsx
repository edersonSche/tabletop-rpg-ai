import { useState, useCallback, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping: (username: string) => void;
  onTypingStop: () => void;
  disabled: boolean;
  disabledReason?: string;
  playerName: string;
  turnType: string | null;
}

export function MessageInput({ onSend, onTyping, onTypingStop, disabled, disabledReason, playerName, turnType }: MessageInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback((value: string) => {
    if (!typingRef.current && value.length > 0) {
      typingRef.current = true;
      onTyping(playerName);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      onTypingStop();
    }, 2500);
  }, [onTyping, onTypingStop, playerName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;

    typingRef.current = false;
    onTypingStop();
    onSend(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const placeholder = turnType === 'call_roll'
    ? 'Click the dice to roll...'
    : disabled
      ? disabledReason || 'Waiting...'
      : 'Type your action...';

  return (
    <form onSubmit={handleSubmit} className="border-t-2 border-dungeon-600 p-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => {
            setText(e.target.value);
            handleTyping(e.target.value);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      {disabled && disabledReason && (
        <p className="text-mono text-xs text-gold mt-1 italic">{disabledReason}</p>
      )}
    </form>
  );
}
