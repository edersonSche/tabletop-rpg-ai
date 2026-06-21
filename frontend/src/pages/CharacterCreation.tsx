import { useState } from 'react';
import { Sword } from 'pixelarticons/react';
import { useSocket } from '../hooks/useSocket';

export function CharacterCreation() {
  const { createCharacter, player, error } = useSocket();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || loading || !player.roomId) return;
    setLoading(true);
    createCharacter(player.roomId, name.trim());
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

            <button
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
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
