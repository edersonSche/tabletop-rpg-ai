import { useState, useEffect, useMemo } from "react";
import { Logout, Box as BoxIcon } from "pixelarticons/react";
import { usePlayer } from "../hooks/usePlayer";
import { useGame } from "../hooks/useGame";
import type { CharacterKit } from "../types/game.types";
import { ITEM_TYPE_ICONS } from "../components/shared/constants";
import {
  Card,
  PanelTitle,
  Button,
  TextButton,
  ThinkingDots,
  Badge,
  EmptyState,
  IconButton,
  TextField,
} from "../components/ui";
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

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-8 relative bg-panel-950">
      <div className="w-full max-w-3xl space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[280px]" src={logo} alt="Tabletop RPG AI" />
          <p className="font-pixel text-xs text-gold-500/70 mt-3 tracking-widest">
            FORGE YOUR HERO
          </p>
        </div>

        <div className="flex gap-6">
          {/* Left column: Name + Attributes */}
          <Card padding="md">
            <PanelTitle size="sm" center className="mb-4">
              NEW CHARACTER
            </PanelTitle>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField
                label="HERO NAME"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your hero..."
                autoFocus
              />

              <div className="divider-gold pt-4">
                <p className="font-pixel text-xs text-stone-400 mb-3 text-center">
                  POINTS: <span className="text-gold-400">{remaining}</span> /{" "}
                  {POINTS}
                </p>

                <div className="space-y-1.5">
                  {STATS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800 px-3 py-2"
                    >
                      <span className="font-pixel text-xs text-stone-400 w-10">
                        {label}
                      </span>
                      <div className="flex items-center gap-3">
                        <IconButton
                          icon={<span className="font-pixel text-xs">-</span>}
                          onClick={() => adjust(key, -1)}
                          disabled={attributes[key] <= MIN}
                          variant="panel"
                        />
                        <span className="font-pixel text-sm text-gold-400 w-6 text-center font-bold">
                          {attributes[key]}
                        </span>
                        <IconButton
                          icon={<span className="font-pixel text-xs">+</span>}
                          onClick={() => adjust(key, 1)}
                          disabled={
                            attributes[key] >= MAX ||
                            remaining < (COST[attributes[key]] ?? 0)
                          }
                          variant="panel"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" fullWidth disabled={!canSubmit}>
                {loading ? "FORGING..." : "CREATE HERO"}
              </Button>
            </form>

            <div className="flex justify-center mt-4">
              <TextButton
                onClick={backToLobby}
                icon={<Logout width={12} height={12} />}
                color="blood"
                className="text-xs"
              >
                ABANDON
              </TextButton>
            </div>
          </Card>

          {/* Right column: Kit Selection */}
          <Card padding="md" className="flex-1">
            <PanelTitle size="sm" center className="mb-3">
              STARTING KIT
            </PanelTitle>
            <p className="font-pixel text-xs text-stone-500 mb-4 text-center">
              CHOOSE YOUR GEAR
            </p>

            {kitsLoading ? (
              <EmptyState message="" icon={<ThinkingDots />} />
            ) : kits.length === 0 ? (
              <EmptyState message="NO KITS AVAILABLE" />
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
                          ? "bg-panel-800 pixel-border-gold"
                          : "bg-zinc-900 border border-zinc-800 hover:bg-panel-800"
                      } ${isRecommended && !isSelected ? "ring-1 ring-gold-500/30" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-pixel text-xs text-gold-400">
                          {kit.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isRecommended && (
                            <Badge variant="suggested">SUGGESTED</Badge>
                          )}
                          <div
                            className={`w-4 h-4 border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-bronze-500 bg-bronze-500"
                                : "border-stone-600"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 bg-panel-950" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="font-pixel text-xs text-stone-500 mt-2 leading-relaxed">
                        {kit.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {kit.items.map((item, idx) => {
                          const Icon = ITEM_TYPE_ICONS[item.type] || BoxIcon;
                          return (
                            <Badge key={idx}>
                              <Icon
                                width={10}
                                height={10}
                                className="inline mr-1 -mt-0.5"
                              />
                              {item.name}
                              {item.quantity > 1 ? ` x${item.quantity}` : ""}
                            </Badge>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
