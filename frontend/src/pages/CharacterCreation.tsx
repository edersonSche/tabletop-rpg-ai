import { useState } from 'react';
import { Sword } from 'pixelarticons/react';
import { useSocket } from '../hooks/useSocket';

type StatKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

const STATS: Array<{ key: StatKey; label: string }> = [
  { key: 'strength', label: 'STRENGTH' },
  { key: 'dexterity', label: 'DEXTERITY' },
  { key: 'constitution', label: 'CONSTITUTION' },
  { key: 'intelligence', label: 'INTELLIGENCE' },
  { key: 'wisdom', label: 'WISDOM' },
  { key: 'charisma', label: 'CHARISMA' },
];

const MIN = 8;
const MAX = 16;
const TOTAL = 72;
const DEFAULT = 10;

type Attributes = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

function defaultAttributes(): Attributes {
  return {
    strength: DEFAULT,
    dexterity: DEFAULT,
    constitution: DEFAULT,
    intelligence: DEFAULT,
    wisdom: DEFAULT,
    charisma: DEFAULT,
  };
}

function sum(attrs: Attributes): number {
  return attrs.strength + attrs.dexterity + attrs.constitution
    + attrs.intelligence + attrs.wisdom + attrs.charisma;
}

export function CharacterCreation() {
  const { createCharacter, player, error } = useSocket();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState<Attributes>(defaultAttributes);

  const currentSum = sum(attributes);
  const remaining = TOTAL - currentSum;
  const canSubmit = name.trim().length > 0 && remaining === 0 && !loading;

  const adjust = (key: StatKey, delta: number) => {
    setAttributes(prev => {
      const current = prev[key];
      const next = current + delta;
      if (next < MIN || next > MAX) return prev;
      const newSum = sum(prev) + delta;
      if (newSum > TOTAL) return prev;
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || !player.roomId) return;
    setLoading(true);
    createCharacter(player.roomId, name.trim(), attributes);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dungeon-800 bg-noise flex items-center justify-center p-4 relative">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-pixel text-2xl text-gold mb-2 flex items-center justify-center gap-2">
            <Sword width={24} height={24} />
            <span>RPG TABLETOP</span>
            <Sword width={24} height={24} />
          </h1>
          <p className="text-mono text-dungeon-300 text-lg">Create your character</p>
        </div>

        {error && (
          <div className="text-mono text-sm text-blood bg-blood/10 border border-blood/30 p-3 pixel-border text-center mb-4">
            {error}
          </div>
        )}

        <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
          <h2 className="text-pixel text-gold text-lg mb-4 text-center">NEW CHARACTER</h2>

          <div className="space-y-4">
            <div>
              <label className="text-mono text-sm text-dungeon-200 block mb-1">Character Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
                placeholder="e.g. Aragorn"
                autoFocus
              />
            </div>

            <div className="border-t border-dungeon-400 pt-4">
              <p className="text-mono text-sm text-dungeon-200 mb-3 text-center">
                Points remaining: <span className="text-gold">{remaining}</span>
              </p>

              {STATS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between mb-2">
                  <span className="text-mono text-sm text-dungeon-200 w-32">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjust(key, -1)}
                      disabled={attributes[key] <= MIN}
                      className="w-8 h-8 bg-dungeon-700 text-dungeon-200 pixel-border hover:bg-dungeon-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-mono text-lg text-gold w-8 text-center">{attributes[key]}</span>
                    <button
                      type="button"
                      onClick={() => adjust(key, 1)}
                      disabled={attributes[key] >= MAX || remaining <= 0}
                      className="w-8 h-8 bg-dungeon-700 text-dungeon-200 pixel-border hover:bg-dungeon-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'CREATING...' : 'CREATE CHARACTER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
