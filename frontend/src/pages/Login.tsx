import { useState } from 'react';
import { Sword } from 'pixelarticons/react';
import { useSocket } from '../hooks/useSocket';

export function Login() {
  const { login, error } = useSocket();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim() || loading) return;
    setLoading(true);
    await login(userId.trim());
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
          <p className="text-mono text-dungeon-300 text-lg">AI Game Master · Endless adventures</p>
        </div>

        {error && (
          <div className="text-mono text-sm text-blood bg-blood/10 border border-blood/30 p-3 pixel-border text-center mb-4">
            {error}
          </div>
        )}

        <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
          <h2 className="text-pixel text-gold text-lg mb-4 text-center">LOGIN</h2>

          <div className="space-y-4">
            <div>
              <label className="text-mono text-sm text-dungeon-200 block mb-1">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
                placeholder="Enter your user ID"
                autoFocus
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={!userId.trim() || loading}
              className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'CONNECTING...' : 'ENTER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
