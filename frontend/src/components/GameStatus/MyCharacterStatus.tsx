import { Skull, Fire, Star, Close, Zap, CloudMoon, Lock, Moon, Circle } from 'pixelarticons/react';
import { Player, ActiveCondition } from '../../types/game.types';

const CONDITION_ICONS: Record<string, React.ComponentType<{ width?: number; height?: number; className?: string }>> = {
  Poisoned: Skull,
  Burning: Fire,
  Blessed: Star,
  Cursed: Close,
  Stunned: Zap,
  Frozen: CloudMoon,
  Paralyzed: Lock,
  Unconscious: Moon,
};

function ConditionIcon({ condition }: { condition: string }) {
  const Icon = CONDITION_ICONS[condition] || Circle;
  return <Icon width={12} height={12} className="text-dungeon-200" />;
}

function ConditionIndicators({ conditions }: { conditions: ActiveCondition[] }) {
  const active = conditions.filter(ac => !ac.isSuppressed);
  if (active.length === 0) return null;

  return (
    <div className="flex gap-1 mt-1">
      {active.map(ac => (
        <div
          key={ac.id}
          className="group relative w-5 h-5 bg-dungeon-900 rounded pixel-border flex items-center justify-center cursor-help"
          title={`${ac.condition.name} - ${ac.condition.description}`}
        >
          <ConditionIcon condition={ac.condition.name} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
            <div className="bg-dungeon-900 border border-gold/30 pixel-border p-2 whitespace-nowrap">
              <div className="text-mono text-[10px] text-blood">{ac.condition.name}</div>
              <div className="text-mono text-[10px] text-dungeon-100">{ac.condition.description}</div>
              {ac.remainingDurations.some(d => d > 0) && (
                <div className="text-mono text-[10px] text-dungeon-200 mt-1">
                  {Math.min(...ac.remainingDurations.filter(d => d > 0))} turns remaining
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MyCharacterStatusProps {
  player: Player;
}

export function MyCharacterStatus({ player }: MyCharacterStatusProps) {
  const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
  const xpPct = player.maxXp > 0 ? Math.round((player.xp / player.maxXp) * 100) : 0;

  return (
    <div className="p-3 pixel-border bg-dungeon-700">
      <div className="mb-2">
        <h3 className="text-mono text-sm text-magic font-bold">{player.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-mono text-[10px] text-dungeon-100">Level {player.level}</p>
          <span className="text-mono text-[10px] text-gold">{player.coins} coins</span>
        </div>
      </div>

      <div className="mb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-mono text-[10px] text-dungeon-100">HP</span>
          <span className="text-mono text-[10px] text-dungeon-100">{player.hp}/{player.maxHp}</span>
        </div>
        <div className="h-2 bg-dungeon-900 rounded-full overflow-hidden pixel-border-light">
          <div
            className="h-full bg-blood rounded-full transition-all"
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-mono text-[10px] text-dungeon-100">XP</span>
          <span className="text-mono text-[10px] text-dungeon-100">{player.xp}/{player.maxXp}</span>
        </div>
        <div className="h-2 bg-dungeon-900 rounded-full overflow-hidden pixel-border-light">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      <ConditionIndicators conditions={player.activeConditions || []} />
    </div>
  );
}
