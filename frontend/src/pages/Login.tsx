import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo.png";

export function Login() {
  const { login, connected, error, setError } = useAuth();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || loading) return;
    setError(null);
    setLoading(true);
    await login(userId.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-starfield">
      <div className="absolute inset-0 bg-gradient-navy pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[300px]" src={logo} alt="Tabletop RPG AI" />
          <p className="font-pixel text-[8px] text-stone-600 mt-3 tracking-widest">
            ENTER THE REALM
          </p>
        </div>

        <div className="card-stone p-6">
          <h2 className="font-pixel text-[11px] text-gold-400 mb-5 text-center text-shadow-glow-gold">
            IDENTIFY YOURSELF
          </h2>

          {!connected && (
            <p className="font-pixel text-[8px] text-blood-500 text-center mb-4">
              DISCONNECTED FROM SERVER...
            </p>
          )}

          {error && (
            <p className="font-pixel text-[8px] text-blood-500 text-center mb-4">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="font-pixel text-[8px] text-stone-400 block mb-2 tracking-wider">
                ADVENTURER NAME
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input-field"
                placeholder="Enter your name..."
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!userId.trim() || loading || !connected}
              className="btn-primary w-full"
            >
              {!connected ? "DISCONNECTED" : loading ? "CONNECTING..." : "BEGIN ADVENTURE"}
            </button>
          </form>
        </div>

        <p className="font-pixel text-[6px] text-stone-700 text-center tracking-wider">
          TABLETOP RPG AI - WHERE AI MEETS ADVENTURE
        </p>
      </div>
    </div>
  );
}
