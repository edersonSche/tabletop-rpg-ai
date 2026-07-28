import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Card, PanelTitle, Button, ErrorText, TextField } from "../components/ui";
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
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-panel-950">
      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[300px]" src={logo} alt="Tabletop RPG AI" />
          <p className="font-pixel text-[10px] text-stone-600 mt-3 tracking-widest">
            ENTER THE REALM
          </p>
        </div>

        <Card padding="lg">
          <PanelTitle size="md" center className="mb-5">
            IDENTIFY YOURSELF
          </PanelTitle>

          {!connected && (
            <ErrorText>DISCONNECTED FROM SERVER...</ErrorText>
          )}

          {error && (
            <ErrorText>{error}</ErrorText>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <TextField
              label="ADVENTURER NAME"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your name..."
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              disabled={!userId.trim() || loading || !connected}
            >
              {!connected
                ? "DISCONNECTED"
                : loading
                  ? "CONNECTING..."
                  : "BEGIN ADVENTURE"}
            </Button>
          </form>
        </Card>

        <p className="font-pixel text-[8px] text-stone-700 text-center tracking-wider">
          TABLETOP RPG AI - WHERE AI MEETS ADVENTURE
        </p>
      </div>
    </div>
  );
}
