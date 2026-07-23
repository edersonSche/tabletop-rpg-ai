import { useState, useEffect, useMemo } from "react";
import { Logout } from "pixelarticons/react";
import { usePlayer } from "../hooks/usePlayer";
import { useGame } from "../hooks/useGame";
import type { CharacterKit } from "../types/game.types";
import logo from "../assets/logo.png";

type StatKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

const STATS: Array<{ key: StatKey; label: string }> = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
];

const MIN = 8;
const MAX = 15;
const POINTS = 27;
const DEFAULT = 8;

type Attributes = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

const COST: Record<number, number> = {
  8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 2,
};

function costToReach(value: number): number {
  let total = 0;
  for (let v = MIN; v < value; v++) {
    total += COST[v] ?? 0;
  }
  return total;
}

function defaultAttributes(): Attributes {
  return {
    strength: DEFAULT, dexterity: DEFAULT, constitution: DEFAULT,
    intelligence: DEFAULT, wisdom: DEFAULT, charisma: DEFAULT,
  };
}

function totalCost(attrs: Attributes): number {
  return (Object.values(attrs) as number[]).reduce(
    (sum, v) => sum + costToReach(v), 0,
  );
}

function getRecommendedKit(attributes: Attributes, kits: CharacterKit[]): string | null {
  const entries = Object.entries(attributes) as [string, number][];
  const sorted = entries
    .filter(([key]) => key !== "constitution")
    .sort(([, a], [, b]) => b - a);
  if (sorted.length === 0) return null;
  const topStat = sorted[0][0];
  for (const kit of kits) {
    if (kit.recommendedStats.includes(topStat)) return kit.id;
  }
  return kits[0]?.id || null;
}

export function CharacterCreation() {
  const { createCharacter, player, backToLobby, fetchKits } = usePlayer();
  const { gameState } = useGame();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState<Attributes>(defaultAttributes);
  const [kits, setKits] = useState<CharacterKit[]>([]);
  const [selectedKit, setSelectedKit] = useState<string | null>(null);
  const [kitsLoading, setKitsLoading] = useState(true);

  useEffect(() => {
    if (!player.roomId) return;
    setKitsLoading(true);
    fetchKits(player.roomId).then((fetched) => {
      setKits(fetched);
      setKitsLoading(false);
    });
  }, [player.roomId, fetchKits]);

  const recommendedKit = useMemo(
    () => getRecommendedKit(attributes, kits), [attributes, kits],
  );

  const remaining = POINTS - totalCost(attributes);
  const canSubmit = name.trim().length > 0 && remaining === 0 && !loading && selectedKit !== null;

  const adjust = (key: StatKey, delta: number) => {
    setAttributes((prev) => {
      const current = prev[key];
      const next = current + delta;
      if (next < MIN || next > MAX) return prev;
      if (delta > 0) {
        const costStep = COST[current];
        if (costStep === undefined) return prev;
        if (totalCost(prev) + costStep > POINTS) return prev;
      }
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !player.roomId) return;
    setLoading(true);
    try {
      await createCharacter(player.roomId, name.trim(), attributes, selectedKit!);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-8 relative bg-starfield">
      <div className="absolute inset-0 bg-gradient-navy pointer-events-none" />

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[280px]" src={logo} alt="Tabletop RPG AI" />
          <p className="font-pixel text-[8px] text-gold-500/70 mt-3 tracking-widest">
            FORGE YOUR HERO
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Name + Attributes */}
          <div className="card-stone p-5">
            <h2 className="font-pixel text-[10px] text-gold-400 mb-4 text-center text-shadow-glow-gold">
              NEW CHARACTER
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-pixel text-[7px] text-stone-400 block mb-2 tracking-wider">
                  HERO NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Name your hero..."
                  autoFocus
                />
              </div>

              <div className="divider-gold pt-4">
                <p className="font-pixel text-[8px] text-stone-400 mb-3 text-center">
                  POINTS: <span className="text-gold-400">{remaining}</span> / {POINTS}
                </p>

                <div className="space-y-1.5">
                  {STATS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between bg-navy-800 px-3 py-2 pixel-border">
                      <span className="font-pixel text-[8px] text-stone-400 w-10">{label}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => adjust(key, -1)}
                          disabled={attributes[key] <= MIN}
                          className="w-7 h-7 bg-navy-700 text-stone-400 pixel-border hover:bg-navy-600 hover:text-blood-500 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center font-pixel text-[10px]"
                        >
                          -
                        </button>
                        <span className="font-pixel text-[11px] text-gold-400 w-6 text-center font-bold">
                          {attributes[key]}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjust(key, 1)}
                          disabled={attributes[key] >= MAX || remaining < (COST[attributes[key]] ?? 0)}
                          className="w-7 h-7 bg-navy-700 text-stone-400 pixel-border hover:bg-navy-600 hover:text-cyan-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center font-pixel text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={!canSubmit} className="btn-gold w-full">
                {loading ? "FORGING..." : "CREATE HERO"}
              </button>
            </form>

            <div className="flex justify-center mt-4">
              <button
                onClick={backToLobby}
                className="font-pixel text-[7px] text-blood-600 hover:text-blood-500 transition-colors flex items-center gap-1"
              >
                <Logout width={12} height={12} />
                ABANDON
              </button>
            </div>
          </div>

          {/* Right column: Kit Selection */}
          <div className="card-stone p-5">
            <h2 className="font-pixel text-[10px] text-gold-400 mb-3 text-center text-shadow-glow-gold">
              STARTING KIT
            </h2>
            <p className="font-pixel text-[7px] text-stone-500 mb-4 text-center">
              CHOOSE YOUR GEAR
            </p>

            {kitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="font-pixel text-[8px] text-stone-500">
                  <span className="thinking-dot inline-block">.</span>
                  <span className="thinking-dot inline-block">.</span>
                  <span className="thinking-dot inline-block">.</span>
                </span>
              </div>
            ) : kits.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="font-pixel text-[8px] text-stone-500">NO KITS AVAILABLE</span>
              </div>
            ) : (
              <div className="space-y-2">
                {kits.map((kit) => {
                  const isRecommended = recommendedKit === kit.id;
                  const isSelected = selectedKit === kit.id;

                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => setSelectedKit(kit.id)}
                      className={`w-full text-left p-3 transition-all ${
                        isSelected
                          ? 'bg-navy-600 pixel-border-gold'
                          : 'bg-navy-800 pixel-border hover:bg-navy-700'
                      } ${isRecommended && !isSelected ? 'ring-1 ring-gold-500/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-pixel text-[8px] text-gold-400 truncate">
                            {kit.name}
                          </div>
                          <div className="font-pixel text-[6px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                            {kit.description}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {kit.items.map((item, idx) => (
                              <span
                                key={idx}
                                className="font-pixel text-[6px] bg-navy-900 text-stone-400 px-1.5 py-0.5 pixel-border-light"
                              >
                                {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isRecommended && (
                            <span className="font-pixel text-[6px] text-gold-400 bg-gold-500/10 px-2 py-0.5 border border-gold-500/20">
                              SUGGESTED
                            </span>
                          )}
                          <div
                            className={`w-4 h-4 border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-gold-400 bg-gold-500'
                                : 'border-stone-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 bg-navy-900" />}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
