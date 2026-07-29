import { Circle } from 'pixelarticons/react';
import { Player, ActiveCondition } from '../../types/game.types';
import { CONDITION_ICONS } from '../shared/constants';
import { ProgressBar } from '../ui';

function ConditionIcon({ condition }: { condition: string }) {
  const Icon = CONDITION_ICONS[condition] || Circle;
  return <Icon width={10} height={10} className="text-stone-400" />;
}

function ConditionIndicators({ conditions }: { conditions: ActiveCondition[] }) {
  const active = conditions.filter(ac => !ac.isSuppressed);
  if (active.length === 0) return null;

  return (
    <div className="flex gap-1 mt-1.5">
      {active.map(ac => (
        <div
          key={ac.id}
          className="group relative w-5 h-5 bg-zinc-900 border border-zinc-800 flex items-center justify-center cursor-help"
          title={`${ac.condition.name} - ${ac.condition.description}`}
        >
          <ConditionIcon condition={ac.condition.name} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
            <div className="bg-panel-900 pixel-border-ornate p-2 whitespace-nowrap">
              <div className="font-pixel text-xs text-blood-500">{ac.condition.name}</div>
              <div className="font-pixel text-xs text-stone-400 mt-0.5">{ac.condition.description}</div>
              {ac.remainingDurations.some(d => d > 0) && (
                <div className="font-pixel text-xs text-stone-600 mt-1">
                  {Math.min(...ac.remainingDurations.filter(d => d > 0))} turns left
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
    <div className="p-3 pixel-border-ornate bg-panel-900">
      <div className="mb-2.5">
        <h3 className="font-pixel text-xs text-cyan-400 text-shadow-glow-cyan truncate">{player.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="font-pixel text-xs text-stone-500">LVL {player.level}</p>
          <span className="font-pixel text-xs text-gold-500">{player.coins}g</span>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-pixel text-xs text-stone-500">HP</span>
          <span className="font-pixel text-xs text-stone-400">{player.hp}/{player.maxHp}</span>
        </div>
        <ProgressBar value={player.hp} max={player.maxHp} color="hp" size="md" />
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-pixel text-xs text-stone-500">XP</span>
          <span className="font-pixel text-xs text-stone-400">{player.xp}/{player.maxXp}</span>
        </div>
        <ProgressBar value={player.xp} max={player.maxXp} color="xp" size="md" />
      </div>

      <ConditionIndicators conditions={player.activeConditions || []} />
    </div>
  );
}
