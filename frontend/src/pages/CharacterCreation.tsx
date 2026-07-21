import { useState, useEffect, useMemo } from "react";
import { Logout } from "pixelarticons/react";
import { useSocket } from "../hooks/useSocket";
import type { CharacterKit } from "../types/game.types";
import logo from "../assets/logo_text.png";

type StatKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

const STATS: Array<{ key: StatKey; label: string }> = [
  { key: "strength", label: "STRENGTH" },
  { key: "dexterity", label: "DEXTERITY" },
  { key: "constitution", label: "CONSTITUTION" },
  { key: "intelligence", label: "INTELLIGENCE" },
  { key: "wisdom", label: "WISDOM" },
  { key: "charisma", label: "CHARISMA" },
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
  8: 1,
  9: 1,
  10: 1,
  11: 1,
  12: 1,
  13: 2,
  14: 2,
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
    strength: DEFAULT,
    dexterity: DEFAULT,
    constitution: DEFAULT,
    intelligence: DEFAULT,
    wisdom: DEFAULT,
    charisma: DEFAULT,
  };
}

function totalCost(attrs: Attributes): number {
  return (Object.values(attrs) as number[]).reduce(
    (sum, v) => sum + costToReach(v),
    0,
  );
}

function getRecommendedKit(
  attributes: Attributes,
  kits: CharacterKit[],
): string | null {
  const entries = Object.entries(attributes) as [string, number][];
  const sorted = entries
    .filter(([key]) => key !== "constitution")
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) return null;
  const topStat = sorted[0][0];

  for (const kit of kits) {
    if (kit.recommendedStats.includes(topStat)) {
      return kit.id;
    }
  }

  return kits[0]?.id || null;
}

export function CharacterCreation() {
  const { createCharacter, player, backToLobby, fetchKits, gameState } =
    useSocket();
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
    () => getRecommendedKit(attributes, kits),
    [attributes, kits],
  );

  const remaining = POINTS - totalCost(attributes);
  const canSubmit =
    name.trim().length > 0 &&
    remaining === 0 &&
    !loading &&
    selectedKit !== null;

  const adjust = (key: StatKey, delta: number) => {
    setAttributes((prev) => {
      const current = prev[key];
      const next = current + delta;
      if (next < MIN || next > MAX) return prev;
      if (delta > 0) {
        const costStep = COST[current];
        if (costStep === undefined) return prev;
        const spent = totalCost(prev);
        if (spent + costStep > POINTS) return prev;
      }
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !player.roomId) return;
    setLoading(true);
    try {
      await createCharacter(
        player.roomId,
        name.trim(),
        attributes,
        selectedKit!,
      );
    } catch {
      setLoading(false);
    }
  };

  const handleKitSelect = (kitId: string) => {
    setSelectedKit(kitId);
  };

  return (
    <div className="min-h-screen bg-dungeon-800 bg-noise flex items-start justify-center p-4 pt-8 relative">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center">
          <img className="max-w-[350px]" src={logo} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Name + Attributes */}
          <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
            <h2 className="text-pixel text-gold text-lg mb-4 text-center">
              NEW CHARACTER
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-mono text-sm text-dungeon-100 block mb-1">
                  Character Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
                  placeholder="e.g. Aragorn"
                  autoFocus
                />
              </div>

              <div className="border-t border-dungeon-400 pt-4">
                <p className="text-mono text-sm text-dungeon-100 mb-3 text-center">
                  Points remaining:{" "}
                  <span className="text-gold">{remaining}</span>
                </p>

                {STATS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between mb-2"
                  >
                    <span className="text-mono text-sm text-dungeon-100 w-32">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(key, -1)}
                        disabled={attributes[key] <= MIN}
                        className="w-8 h-8 bg-dungeon-700 text-dungeon-100 pixel-border hover:bg-dungeon-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                      >
                        −
                      </button>
                      <span className="text-mono text-lg text-gold w-8 text-center">
                        {attributes[key]}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjust(key, 1)}
                        disabled={
                          attributes[key] >= MAX ||
                          remaining < (COST[attributes[key]] ?? 0)
                        }
                        className="w-8 h-8 bg-dungeon-700 text-dungeon-100 pixel-border hover:bg-dungeon-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "CREATING..." : "CREATE CHARACTER"}
              </button>
            </form>

            <div className="flex justify-center mt-4">
              <button
                onClick={backToLobby}
                className="text-mono text-sm text-blood hover:text-blood/80 transition-colors flex items-center gap-1"
              >
                <Logout width={14} height={14} />
                Back
              </button>
            </div>
          </div>

          {/* Right column: Kit Selection */}
          <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
            <h2 className="text-pixel text-gold text-lg mb-4 text-center">
              STARTING KIT
            </h2>
            <p className="text-mono text-xs text-dungeon-100 mb-4 text-center">
              Choose your starting equipment. Your highest attribute suggests a
              kit.
            </p>

            {kitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-mono text-dungeon-100">
                  Loading kits...
                </span>
              </div>
            ) : kits.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-mono text-dungeon-100">
                  No kits available
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {kits.map((kit) => {
                  const isRecommended = recommendedKit === kit.id;
                  const isSelected = selectedKit === kit.id;

                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => handleKitSelect(kit.id)}
                      className={`w-full text-left p-3 pixel-border transition-all ${
                        isSelected
                          ? "bg-dungeon-600 border-gold"
                          : "bg-dungeon-700 border-dungeon-400 hover:bg-dungeon-600"
                      } ${isRecommended ? "ring-1 ring-gold/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-mono text-sm text-gold font-bold truncate">
                            {kit.name}
                          </div>
                          <div className="text-mono text-xs text-dungeon-100 mt-1 line-clamp-2">
                            {kit.description}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {kit.items.map((item, idx) => (
                              <span
                                key={idx}
                                className="text-mono text-xs bg-dungeon-800 text-dungeon-100 px-2 py-0.5"
                              >
                                {item.name}
                                {item.quantity > 1 ? ` (${item.quantity})` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isRecommended && (
                            <span className="text-mono text-xs text-gold bg-gold/20 px-2 py-0.5 border border-gold/30">
                              RECOMMENDED
                            </span>
                          )}
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-gold bg-gold"
                                : "border-dungeon-100"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-dungeon-900" />
                            )}
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
