import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react';
import { Send } from 'pixelarticons/react';

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping: (username: string) => void;
  onTypingStop: () => void;
  disabled: boolean;
  disabledReason?: string;
  characterName: string;
  turnType: string | null;
}

export function MessageInput({ onSend, onTyping, onTypingStop, disabled, disabledReason, characterName, turnType }: MessageInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback((value: string) => {
    if (!typingRef.current && value.length > 0) {
      typingRef.current = true;
      onTyping(characterName);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      onTypingStop();
    }, 2500);
  }, [onTyping, onTypingStop, characterName]);

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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const placeholder = turnType === 'call_roll'
    ? 'Cast the dice...'
    : disabled
      ? disabledReason || 'Awaiting your turn...'
      : 'Speak your action...';

  return (
    <form onSubmit={handleSubmit} className="pt-2">
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
          className="flex-1 input-field disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="w-11 h-11 flex items-center justify-center bg-gold-500 text-navy-900 pixel-border hover:bg-gold-400 hover:shadow-glow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <Send width={18} height={18} />
        </button>
      </div>
      {disabled && disabledReason && (
        <p className="font-pixel text-[7px] text-gold-500/60 mt-1.5 ml-1">{disabledReason}</p>
      )}
    </form>
  );
}
