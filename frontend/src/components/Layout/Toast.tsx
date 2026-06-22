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
    <div className="fixed bottom-4 right-4 z-50 pixel-border bg-dungeon-700 border border-blood/30 p-4 max-w-sm shadow-lg flex items-start gap-3">
      <span className="text-mono text-sm text-blood flex-1">{error}</span>
      <button
        onClick={() => setError(null)}
        className="text-dungeon-300 hover:text-dungeon-100 transition-colors shrink-0 mt-0.5"
      >
        <Close width={14} height={14} />
      </button>
    </div>
  );
}
