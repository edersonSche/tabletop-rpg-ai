import { useEffect, useState } from 'react';
import { Lightbulb, Moon } from 'pixelarticons/react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('rpg_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('rpg_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="text-mono text-sm text-parchment-600 dark:text-dungeon-300 hover:text-gold transition-colors px-2 py-1 pixel-border inline-flex items-center gap-1"
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <><Lightbulb width={16} height={16} /><span>LIGHT</span></> : <><Moon width={16} height={16} /><span>DARK</span></>}
    </button>
  );
}
