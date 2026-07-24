import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, Player, GameStateData, NarrativeLanguage, InventoryItem, Condition, UseItemResult, UseAntidoteResult } from './game.state';
import { ConditionEngine } from './condition.engine';
import { getLocalizedItem } from '../data/items.catalog';
import { getKitItemEntries } from '../data/theme-kits';

const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

@Injectable()
export class PlayerService {
  constructor(
    private gameState: GameState,
    private conditionEngine: ConditionEngine,
  ) {}

  addPlayer(
    roomId: string,
    userId: string,
    name: string,
    attributes?: Player['attributes'],
    kitId?: string,
    language?: NarrativeLanguage,
  ): Player {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const attrs = attributes ?? {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    };

    const conMod = Math.floor((attrs.constitution - 10) / 2);
    const maxHp = 10 + conMod;

    const dexMod = Math.floor((attrs.dexterity - 10) / 2);
    const ac = 10 + dexMod;

    const lang = language || room.language || 'english';

    const inventory: InventoryItem[] = [];
    let coins = 50;

    if (kitId) {
      const itemEntries = getKitItemEntries(kitId);
      for (const entry of itemEntries) {
        const localized = getLocalizedItem(entry.key, lang, entry.quantity);
        if (localized) {
          inventory.push({
            id: uuid(),
            ...localized,
          });
        }
      }
    }

    if (inventory.length === 0) {
      const dagger = getLocalizedItem('dagger', lang, 1);
      if (dagger) {
        inventory.push({ id: uuid(), ...dagger });
      }
      const potion = getLocalizedItem('healing_potion', lang, 2);
      if (potion) {
        inventory.push({ id: uuid(), ...potion });
      }
    }

    const player: Player = {
      id: uuid(),
      userId,
      name,
      active: true,
      attributes: attrs,
      hp: maxHp,
      maxHp,
      level: 1,
      xp: 0,
      maxXp: XP_THRESHOLDS[1] ?? 300,
      pendingAttributePoints: 0,
      inventory,
      coins,
      equipment: {},
      ac,
      activeConditions: [],
    };

    room.players.push(player);

    this.gameState.registerPlayer(roomId, userId, player.id);

    return player;
  }

  findPlayerByUserId(roomId: string, userId: string): Player | undefined {
    return this.gameState.findPlayerByUserId(roomId, userId);
  }

  disconnectPlayer(roomId: string, playerId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.active = false;
    }
  }

  reactivatePlayer(roomId: string, playerId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.active = true;
    }
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;

    const removed = room.players.find(p => p.id === playerId);
    room.players = room.players.filter(p => p.id !== playerId);

    if (removed) {
      this.gameState.unregisterPlayer(roomId, removed.userId);
    }
  }

  addItem(roomId: string, playerId: string, item: Omit<InventoryItem, 'id'>): Player | undefined {
    const room = this.gameState.getRoom(roomId);
    if (!room) return undefined;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return undefined;

    const existing = player.inventory.find(i => i.name === item.name && i.type === item.type);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      player.inventory.push({ id: uuid(), ...item });
    }
    return player;
  }

  removeItem(roomId: string, playerId: string, itemId: string, quantity = 1): boolean {
    const room = this.gameState.getRoom(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const index = player.inventory.findIndex(i => i.id === itemId);
    if (index === -1) return false;

    const item = player.inventory[index];
    if (item.quantity <= quantity) {
      player.inventory.splice(index, 1);
    } else {
      item.quantity -= quantity;
    }
    return true;
  }

  equipItem(roomId: string, playerId: string, itemId: string, slot: 'body' | 'mainHand' | 'offHand'): { success: boolean; error?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const item = player.inventory.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found in inventory' };

    if (slot === 'body' && item.slot !== 'body') return { success: false, error: 'This item cannot be equipped on the body' };
    if (slot === 'mainHand' && item.slot !== 'hand' && item.slot !== 'two-handed') return { success: false, error: 'This item cannot be held in the main hand' };
    if (slot === 'offHand' && item.slot !== 'hand') return { success: false, error: 'This item cannot be held in the off hand' };

    const currentItemId = player.equipment[slot];
    if (currentItemId && currentItemId !== itemId) {
      this.unequipItem(roomId, playerId, slot);
    }

    if (item.slot === 'two-handed' && slot === 'mainHand') {
      player.equipment.offHand = undefined;
    }

    if (slot === 'offHand') {
      const mainHandItem = player.equipment.mainHand ? player.inventory.find(i => i.id === player.equipment.mainHand) : undefined;
      if (mainHandItem?.slot === 'two-handed') return { success: false, error: 'Cannot equip off-hand while wielding a two-handed weapon' };
    }

    if (slot === 'body') player.equipment.body = itemId;
    else if (slot === 'mainHand') player.equipment.mainHand = itemId;
    else if (slot === 'offHand') player.equipment.offHand = itemId;

    this.gameState.recomputePlayer(player);
    return { success: true };
  }

  unequipItem(roomId: string, playerId: string, slot: 'body' | 'mainHand' | 'offHand'): { success: boolean; error?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    if (slot === 'body') player.equipment.body = undefined;
    else if (slot === 'mainHand') player.equipment.mainHand = undefined;
    else if (slot === 'offHand') player.equipment.offHand = undefined;

    this.gameState.recomputePlayer(player);
    return { success: true };
  }

  addCoins(roomId: string, playerId: string, amount: number): boolean {
    const room = this.gameState.getRoom(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    player.coins += amount;
    return true;
  }

  removeCoins(roomId: string, playerId: string, amount: number): boolean {
    const room = this.gameState.getRoom(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.coins < amount) return false;
    player.coins -= amount;
    return true;
  }

  useItem(roomId: string, playerId: string, itemId: string): UseItemResult {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found', hpChange: 0, appliedConditions: [] };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found', hpChange: 0, appliedConditions: [] };

    const itemIndex = player.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return { success: false, error: 'Item not found', hpChange: 0, appliedConditions: [] };

    const item = player.inventory[itemIndex];
    if (!item.effects || item.effects.length === 0) {
      return { success: false, error: 'This item has no effects', hpChange: 0, appliedConditions: [] };
    }

    const result: UseItemResult = {
      success: true,
      hpChange: 0,
      appliedConditions: [],
    };

    for (const effect of item.effects) {
      switch (effect.type) {
        case 'immediate': {
          if (effect.hpChange) {
            const amount = this.conditionEngine.applyHpChange(player, effect.hpChange);
            result.hpChange += amount;
          }
          break;
        }

        case 'temporary': {
          const syntheticCondition: Condition = {
            id: uuid(),
            name: item.name,
            description: `Effect from ${item.name}`,
            effects: [effect],
            origin: 'item',
            originId: item.id,
          };
          this.conditionEngine.applyConditionToPlayer(player, syntheticCondition, room);
          result.appliedConditions.push({
            name: syntheticCondition.name,
            duration: effect.duration ?? 0,
          });
          break;
        }

        case 'permanent': {
          const fallbackEffect = { ...effect, type: 'temporary' as const, duration: 1 };
          const syntheticCondition: Condition = {
            id: uuid(),
            name: item.name,
            description: `Effect from ${item.name}`,
            effects: [fallbackEffect],
            origin: 'item',
            originId: item.id,
          };
          this.conditionEngine.applyConditionToPlayer(player, syntheticCondition, room);
          result.appliedConditions.push({
            name: syntheticCondition.name,
            duration: 1,
          });
          break;
        }
      }
    }

    if (item.quantity <= 1) {
      player.inventory.splice(itemIndex, 1);
    } else {
      item.quantity -= 1;
    }

    this.gameState.recomputePlayer(player);
    return result;
  }

  useAntidote(player: Player, antidoteItem: InventoryItem, targetConditionName?: string): UseAntidoteResult {
    const targetName = targetConditionName || antidoteItem.antidoteFor;
    if (!targetName) {
      return { success: false, error: 'This item is not an antidote' };
    }

    const activeCondition = player.activeConditions.find(
      ac => ac.condition.name === targetName && !ac.isSuppressed
    );
    if (!activeCondition) {
      return { success: false, error: `No active condition named "${targetName}" found` };
    }

    this.conditionEngine.removeConditionFromPlayer(player, activeCondition.id);
    return { success: true, conditionRemoved: targetName };
  }
}
