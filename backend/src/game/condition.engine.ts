import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, Player, GameStateData, Condition, Effect, HpChange, ActiveCondition, TickResult } from './game.state';
import { DiceService } from './dice.service';

@Injectable()
export class ConditionEngine {
  constructor(
    private gameState: GameState,
    private diceService: DiceService,
  ) {}

  applyHpChange(player: Player, hpChange: HpChange): number {
    const amount = this.diceService.rollDiceFormula(hpChange.formula);
    if (hpChange.type === 'damage') {
      player.hp = Math.max(0, player.hp - amount);
      return -amount;
    } else {
      player.hp = Math.min(player.maxHp, player.hp + amount);
      return amount;
    }
  }

  applyEffectToPlayer(player: Player, effect: Effect): void {
    if (effect.type === 'immediate') {
      if (effect.hpChange) this.applyHpChange(player, effect.hpChange);
      return;
    }
  }

  applyConditionToPlayer(
    player: Player,
    condition: Condition,
    room: GameStateData,
  ): ActiveCondition | null {
    if ((condition.effects || []).length > 5) {
      console.error(`Condition "${condition.name}" rejected: max 5 effects`);
      return null;
    }

    for (const ef of condition.effects || []) {
      if (ef.type === 'temporary' && (ef.duration === undefined || ef.duration === null)) {
        console.error(`Condition "${condition.name}" rejected: temporary effect without duration`);
        return null;
      }
      if (ef.type === 'immediate' && !ef.hpChange) {
        console.error(`Condition "${condition.name}" rejected: immediate effect without hpChange`);
        return null;
      }
      if (ef.duration !== undefined && ef.duration > 99) {
        ef.duration = 99;
      }
      if (ef.statModifiers) {
        for (const mod of ef.statModifiers) {
          mod.value = Math.max(-10, Math.min(10, mod.value));
        }
      }
    }

    const existing = player.activeConditions.find(
      ac => ac.condition.name === condition.name && ac.condition.origin === condition.origin
    );

    if (existing) {
      for (let i = 0; i < (condition.effects || []).length; i++) {
        const ce = (condition.effects || [])[i];
        if (ce.type === 'temporary') {
          const idx = existing.remainingDurations.findIndex(
            (_, ei) => existing.condition.effects[ei]?.type === 'temporary'
          );
          if (idx >= 0) {
            existing.remainingDurations[idx] += ce.duration!;
          }
        }
      }
      return existing;
    }

    const durations: number[] = (condition.effects || []).map(ef => {
      if (ef.type === 'immediate') return 0;
      if (ef.type === 'temporary') return ef.duration!;
      return -1;
    });

    const active: ActiveCondition = {
      id: uuid(),
      condition: { ...condition, effects: [...(condition.effects || [])] },
      appliedAt: room.history.length,
      remainingDurations: durations,
      isSuppressed: false,
    };

    for (const ef of condition.effects || []) {
      if (ef.type === 'immediate' && ef.hpChange) {
        this.applyHpChange(player, ef.hpChange);
      }
    }

    player.activeConditions.push(active);
    this.gameState.recomputePlayer(player);
    return active;
  }

  removeConditionFromPlayer(player: Player, conditionId: string): boolean {
    const idx = player.activeConditions.findIndex(ac => ac.id === conditionId);
    if (idx === -1) return false;
    player.activeConditions.splice(idx, 1);
    this.gameState.recomputePlayer(player);
    return true;
  }

  tickEffects(room: GameStateData): TickResult[] {
    const results: TickResult[] = [];

    for (const player of room.players) {
      if (!player.active) continue;
      const result: TickResult = {
        playerId: player.id,
        playerName: player.name,
        hpChange: 0,
        conditionsExpired: [],
        dotDetails: [],
      };

      const toRemove: string[] = [];

      for (const ac of player.activeConditions) {
        if (ac.isSuppressed) {
          if (ac.suppressRemaining !== undefined) {
            ac.suppressRemaining--;
            if (ac.suppressRemaining <= 0) {
              ac.isSuppressed = false;
              ac.suppressRemaining = undefined;
            }
          }
          continue;
        }

        let conditionExpired = true;
        let hasPermanent = false;

        for (let i = 0; i < ac.remainingDurations.length; i++) {
          const ef = ac.condition.effects[i];
          if (!ef) continue;

          if (ef.type === 'immediate') continue;

          if (ef.type === 'permanent') {
            hasPermanent = true;
            conditionExpired = false;
            if (ef.hpChange) {
              const amount = this.diceService.rollDiceFormula(ef.hpChange.formula);
              if (ef.hpChange.type === 'damage') {
                player.hp -= amount;
                result.hpChange -= amount;
              } else {
                player.hp = Math.min(player.maxHp, player.hp + amount);
                result.hpChange += amount;
              }
              result.dotDetails.push({
                conditionName: ac.condition.name,
                formula: ef.hpChange.formula,
                type: ef.hpChange.type,
                durationLeft: -1,
              });
            }
            continue;
          }

          if (ef.type === 'temporary') {
            ac.remainingDurations[i]--;
            if (ac.remainingDurations[i] > 0) conditionExpired = false;

            if (ef.hpChange && ac.remainingDurations[i] >= 0) {
              const amount = this.diceService.rollDiceFormula(ef.hpChange.formula);
              if (ef.hpChange.type === 'damage') {
                player.hp -= amount;
                result.hpChange -= amount;
              } else {
                player.hp = Math.min(player.maxHp, player.hp + amount);
                result.hpChange += amount;
              }
              result.dotDetails.push({
                conditionName: ac.condition.name,
                formula: ef.hpChange.formula,
                type: ef.hpChange.type,
                durationLeft: ac.remainingDurations[i],
              });
            }
          }
        }

        if (!hasPermanent && conditionExpired) {
          toRemove.push(ac.id);
          result.conditionsExpired.push(ac.condition.name);
        }
      }

      for (const id of toRemove) {
        this.removeConditionFromPlayer(player, id);
      }

      player.hp = Math.max(0, Math.min(player.maxHp, player.hp));
      this.gameState.recomputePlayer(player);
      results.push(result);
    }

    return results;
  }

  getPlayerModifier(player: Player, skill: string): number {
    const attrMap: Record<string, keyof Player['attributes']> = {
      strength: 'strength',
      dexterity: 'dexterity',
      constitution: 'constitution',
      intelligence: 'intelligence',
      wisdom: 'wisdom',
      charisma: 'charisma',
    };

    const attr = attrMap[skill.toLowerCase()];
    if (!attr) return 0;

    let value = player.attributes[attr];

    for (const ac of player.activeConditions) {
      if (ac.isSuppressed) continue;
      for (const ef of ac.condition.effects || []) {
        if (ef.type === 'immediate') continue;
        for (const mod of ef.statModifiers || []) {
          if (mod.target === skill) {
            if (mod.operation === 'override') value = mod.value;
            else value += mod.value;
          }
        }
      }
    }

    return Math.floor((value - 10) / 2);
  }
}
