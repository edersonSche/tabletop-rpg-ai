import { useState } from "react";
import { useSocket } from "../hooks/useSocket";
import logo from "../assets/logo_text.png";

export function Login() {
  const { login } = useSocket();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || loading) return;
    setLoading(true);
    await login(userId.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dungeon-800 bg-noise flex items-center justify-center p-4 relative">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center">
          <img className="max-w-[350px]" src={logo} />
        </div>

        <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
          <h2 className="text-pixel text-gold text-lg mb-4 text-center">
            LOGIN
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-mono text-sm text-dungeon-100 block mb-1">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
                placeholder="Enter your user ID"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!userId.trim() || loading}
              className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "CONNECTING..." : "ENTER"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
