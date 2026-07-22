import { useEffect } from 'react';
import { Close } from 'pixelarticons/react';
import { useSocket } from '../../hooks/useSocket';

export function Toast() {
  const { error, setError } = useSocket();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, setError]);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 pixel-border bg-navy-800 border-l-2 border-blood-600 p-4 max-w-sm shadow-lg flex items-start gap-3">
      <div className="w-2 h-2 bg-blood-500 mt-1 shrink-0 animate-crystal-pulse" />
      <span className="font-pixel text-[8px] text-stone-300 flex-1 leading-relaxed">{error}</span>
      <button
        onClick={() => setError(null)}
        className="text-stone-600 hover:text-stone-300 transition-colors shrink-0 mt-0.5"
      >
        <Close width={12} height={12} />
      </button>
    </div>
  );
}
