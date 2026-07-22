import { v4 as uuid } from 'uuid';
import { getLocalizedItem } from '../data/items.catalog';
import { getKitItemEntries } from '../data/theme-kits';

export type NarrativeLanguage = 'english' | 'portuguese' | 'spanish';

export type EffectTarget =
  | 'ac'
  | 'damage'
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'
  | 'maxHp';

export interface HpChange {
  formula: string;
  type: 'heal' | 'damage';
}

export interface Effect {
  type: 'immediate' | 'temporary' | 'permanent';
  duration?: number;
  statModifiers?: Array<{
    target: EffectTarget;
    value: number;
    operation: 'add' | 'override';
    dexCap?: number;
  }>;
  hpChange?: HpChange;
  origin: 'item' | 'condition' | 'narrative';
  originId?: string;
}

export interface Condition {
  id: string;
  name: string;
  description: string;
  effects?: Effect[];
  antidote?: {
    targetCondition: string;
    type: 'immediate' | 'temporary';
    duration?: number;
  };
  origin: 'item' | 'narrative';
  originId?: string;
}

export interface ActiveCondition {
  id: string;
  condition: {
    name: string;
    description: string;
    effects: Effect[];
    antidote?: Condition['antidote'];
    origin: 'item' | 'narrative';
    originId?: string;
  };
  appliedAt: number;
  remainingDurations: number[];
  isSuppressed: boolean;
  suppressRemaining?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'key_item' | 'misc';
  quantity: number;
  slot?: 'body' | 'hand' | 'two-handed';
  effects: Effect[];
  antidoteFor?: string;
}

export interface MerchantItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'key_item' | 'misc';
  slot?: 'body' | 'hand' | 'two-handed';
  effects: Effect[];
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  antidoteFor?: string;
}

export interface Merchant {
  id: string;
  name: string;
  type: string;
  greeting: string;
  coins: number;
  inventory: MerchantItem[];
}

export interface Player {
  id: string;
  userId: string;
  name: string;
  active: boolean;
  attributes: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  maxXp: number;
  pendingAttributePoints: number;
  inventory: InventoryItem[];
  coins: number;
  equipment: {
    body?: string;
    mainHand?: string;
    offHand?: string;
  };
  ac: number;
  activeConditions: ActiveCondition[];
}

export interface TickResult {
  playerId: string;
  playerName: string;
  hpChange: number;
  conditionsExpired: string[];
  dotDetails: Array<{
    conditionName: string;
    formula: string;
    type: 'heal' | 'damage';
    durationLeft: number;
  }>;
}

export interface UseItemResult {
  success: boolean;
  error?: string;
  hpChange: number;
  appliedConditions: Array<{ name: string; duration: number }>;
}

export interface UseAntidoteResult {
  success: boolean;
  error?: string;
  conditionRemoved?: string;
}

export interface ServiceActionResult {
  response: { narration: string; location?: string; merchants?: any[]; next: { type: string; target?: string; skill?: string; dc?: number } };
  tickResults: TickResult[];
}

export interface GameStateData {
  campaignId: string;
  campaignName: string;
  creatorId: string;
  language: NarrativeLanguage;
  campaignTheme: string;
  players: Player[];
  currentTurn: string | null;
  turnType: 'group_action' | 'call_player' | 'call_roll' | 'narration_only' | null;
  turnTarget: string | null;
  turnSkill?: string;
  turnDc?: number;
  currentLocation: string | null;
  scene: string;
  gameStarted: boolean;
  merchants?: Merchant[];
  merchantsLocation?: string;
  isTradeLocked: boolean;
  tradeParticipants: string[];
  tradeDone: string[];
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
  summary: string;
  lastSummarizedAt: number;
}

const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

const MAX_LEVEL = 20;
const MAX_ATTRIBUTE = 20;

export class GameState {
  private rooms: Map<string, GameStateData> = new Map();

  restoreCampaign(data: {
    campaignId: string;
    campaignName: string;
    creatorId: string;
    language: NarrativeLanguage;
    campaignTheme: string;
    players: Player[];
    currentTurn: string | null;
    turnType: GameStateData['turnType'];
    turnTarget: string | null;
    turnSkill?: string;
    turnDc?: number;
    currentLocation: string | null;
    scene: string;
    gameStarted: boolean;
    merchants?: Merchant[];
    merchantsLocation?: string;
    isTradeLocked?: boolean;
    tradeParticipants?: string[];
    tradeDone?: string[];
    history: GameStateData['history'];
    summary?: string;
    lastSummarizedAt?: number;
  }): GameStateData {
    const state: GameStateData = {
      ...data,
      campaignTheme: data.campaignTheme || 'A classic medieval fantasy world of magic, ancient ruins, warring kingdoms, and mythical creatures.',
      turnSkill: data.turnSkill,
      turnDc: data.turnDc,
      summary: data.summary || '',
      lastSummarizedAt: data.lastSummarizedAt || 0,
      merchants: data.merchants,
      merchantsLocation: data.merchantsLocation,
      isTradeLocked: data.isTradeLocked ?? false,
      tradeParticipants: data.tradeParticipants ?? [],
      tradeDone: data.tradeDone ?? [],
    };
    this.rooms.set(data.campaignId, state);

    for (const p of state.players) {
      p.ac = this.computeAc(data.campaignId, p.id);
    }

    for (const p of data.players) {
      const roomUserMap = this.playerByUserId.get(data.campaignId) || new Map();
      roomUserMap.set(p.userId, p.id);
      this.playerByUserId.set(data.campaignId, roomUserMap);
    }

    return state;
  }

  createRoom(roomId: string, name: string, language: NarrativeLanguage = 'english'): GameStateData {
    const campaignTheme = 'A classic medieval fantasy world of magic, ancient ruins, warring kingdoms, and mythical creatures.';
    const state: GameStateData = {
      campaignId: roomId,
      campaignName: name,
      creatorId: '',
      language,
      campaignTheme,
      players: [],
      currentTurn: null,
      turnType: null,
      turnTarget: null,
      currentLocation: null,
      scene: '',
      gameStarted: false,
      merchants: undefined,
      merchantsLocation: undefined,
      isTradeLocked: false,
      tradeParticipants: [],
      tradeDone: [],
      history: [],
      summary: '',
      lastSummarizedAt: 0,
    };
    this.rooms.set(roomId, state);
    return state;
  }

  getRoom(roomId: string): GameStateData | undefined {
    return this.rooms.get(roomId);
  }

  private playerByUserId: Map<string, Map<string, string>> = new Map();

  addPlayer(
    roomId: string,
    userId: string,
    name: string,
    attributes?: Player['attributes'],
    kitId?: string,
    language?: NarrativeLanguage,
  ): Player {
    const room = this.rooms.get(roomId);
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

    const roomUserMap = this.playerByUserId.get(roomId) || new Map();
    roomUserMap.set(userId, player.id);
    this.playerByUserId.set(roomId, roomUserMap);

    return player;
  }



  findPlayerByUserId(roomId: string, userId: string): Player | undefined {
    const roomUserMap = this.playerByUserId.get(roomId);
    if (!roomUserMap) return undefined;
    const playerId = roomUserMap.get(userId);
    if (!playerId) return undefined;
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return room.players.find(p => p.id === playerId);
  }

  disconnectPlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.active = false;
    }
  }

  reactivatePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.active = true;
    }
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const removed = room.players.find(p => p.id === playerId);
    room.players = room.players.filter(p => p.id !== playerId);

    if (removed) {
      const roomUserMap = this.playerByUserId.get(roomId);
      if (roomUserMap) {
        roomUserMap.delete(removed.userId);
      }
    }
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.playerByUserId.delete(roomId);
  }

  addItem(roomId: string, playerId: string, item: Omit<InventoryItem, 'id'>): Player | undefined {
    const room = this.rooms.get(roomId);
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
    const room = this.rooms.get(roomId);
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
    const room = this.rooms.get(roomId);
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

    this.recomputePlayer(player);
    return { success: true };
  }

  unequipItem(roomId: string, playerId: string, slot: 'body' | 'mainHand' | 'offHand'): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    if (slot === 'body') player.equipment.body = undefined;
    else if (slot === 'mainHand') player.equipment.mainHand = undefined;
    else if (slot === 'offHand') player.equipment.offHand = undefined;

    this.recomputePlayer(player);
    return { success: true };
  }

  addCoins(roomId: string, playerId: string, amount: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    player.coins += amount;
    return true;
  }

  removeCoins(roomId: string, playerId: string, amount: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.coins < amount) return false;
    player.coins -= amount;
    return true;
  }

  addHistory(roomId: string, entry: GameStateData['history'][0]): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.history.push(entry);
  }

  setTurn(roomId: string, turn: string | null, type: GameStateData['turnType'], target: string | null): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.currentTurn = turn;
    room.turnType = type;
    room.turnTarget = target;
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

  rollDice(sides: number = 20): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  rollDiceFormula(formula: string): number {
    const diceMatch = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (diceMatch) {
      const diceCount = parseInt(diceMatch[1], 10);
      const diceFaces = parseInt(diceMatch[2], 10);
      const modifier = diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;

      let total = modifier;
      for (let i = 0; i < diceCount; i++) {
        total += Math.floor(Math.random() * diceFaces) + 1;
      }
      return Math.max(0, total);
    }

    const fixed = parseInt(formula, 10);
    if (!isNaN(fixed)) return Math.max(0, fixed);
    return 0;
  }

  private applyHpChange(player: Player, hpChange: HpChange): number {
    const amount = this.rollDiceFormula(hpChange.formula);
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
    this.recomputePlayer(player);
    return active;
  }

  removeConditionFromPlayer(player: Player, conditionId: string): boolean {
    const idx = player.activeConditions.findIndex(ac => ac.id === conditionId);
    if (idx === -1) return false;
    player.activeConditions.splice(idx, 1);
    this.recomputePlayer(player);
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
              const amount = this.rollDiceFormula(ef.hpChange.formula);
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
              const amount = this.rollDiceFormula(ef.hpChange.formula);
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
      this.recomputePlayer(player);
      results.push(result);
    }

    return results;
  }

  recomputePlayer(player: Player): void {
    const dexMod = Math.floor((player.attributes.dexterity - 10) / 2);
    let baseAc = 10;
    let dexCap: number | null = null;
    let bonusAc = 0;

    const slots = ['body', 'mainHand', 'offHand'] as const;
    for (const slot of slots) {
      const itemId = player.equipment[slot];
      if (!itemId) continue;
      const item = player.inventory.find(i => i.id === itemId);
      if (!item?.effects) continue;
      for (const effect of item.effects) {
        if (!effect.statModifiers) continue;
        for (const mod of effect.statModifiers) {
          if (mod.target !== 'ac') continue;
          if (mod.operation === 'override') {
            baseAc = mod.value;
            if (mod.dexCap !== undefined) dexCap = mod.dexCap;
          } else {
            bonusAc += mod.value;
          }
        }
      }
    }

    for (const ac of player.activeConditions) {
      if (ac.isSuppressed) continue;
      for (const ef of ac.condition.effects || []) {
        if (ef.type === 'immediate') continue;
        for (const mod of ef.statModifiers || []) {
          if (mod.target === 'ac') {
            if (mod.operation === 'override') {
              baseAc = mod.value;
              if (mod.dexCap !== undefined) dexCap = mod.dexCap;
            } else {
              bonusAc += mod.value;
            }
          }
        }
      }
    }

    const dexContrib = dexCap !== null ? Math.min(dexMod, dexCap) : dexMod;
    player.ac = baseAc + dexContrib + bonusAc;
  }

  computeAc(roomId: string, playerId: string): number {
    const room = this.rooms.get(roomId);
    if (!room) return 10;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return 10;
    this.recomputePlayer(player);
    return player.ac;
  }

  useItem(roomId: string, playerId: string, itemId: string): UseItemResult {
    const room = this.rooms.get(roomId);
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
            const amount = this.applyHpChange(player, effect.hpChange);
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
          this.applyConditionToPlayer(player, syntheticCondition, room);
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
          this.applyConditionToPlayer(player, syntheticCondition, room);
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

    this.recomputePlayer(player);
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

    this.removeConditionFromPlayer(player, activeCondition.id);
    return { success: true, conditionRemoved: targetName };
  }

  adjustMerchantPrices(merchants: Merchant[], chaMod: number): Merchant[] {
    return merchants.map(m => ({
      ...m,
      inventory: m.inventory.map(item => ({
        ...item,
        buyPrice: Math.max(1, Math.round(item.buyPrice * (1 - chaMod * 0.05))),
        sellPrice: Math.max(1, Math.round(item.sellPrice * (0.5 + chaMod * 0.05))),
      })),
    }));
  }

  getMerchant(roomId: string, merchantId: string): Merchant | undefined {
    const room = this.rooms.get(roomId);
    if (!room?.merchants) return undefined;
    return room.merchants.find(m => m.id === merchantId);
  }

  buyFromMerchant(
    roomId: string, playerId: string, merchantId: string,
    merchantItemId: string, quantity = 1,
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    const merchant = room.merchants?.find(m => m.id === merchantId);
    if (!merchant) return { success: false, error: 'Merchant not found' };

    const merchantItem = merchant.inventory.find(i => i.id === merchantItemId);
    if (!merchantItem) return { success: false, error: 'Item not found in merchant inventory' };
    if (merchantItem.quantity < quantity) return { success: false, error: 'Not enough stock' };

    const chaMod = Math.floor((player.attributes.charisma - 10) / 2);
    const adjustedPrice = Math.max(1, Math.round(merchantItem.buyPrice * (1 - chaMod * 0.05)));
    const totalCost = adjustedPrice * quantity;

    if (player.coins < totalCost) return { success: false, error: 'Not enough coins' };

    player.coins -= totalCost;
    merchant.coins += totalCost;

    const existing = player.inventory.find(i => i.name === merchantItem.name && i.type === merchantItem.type);
    if (existing) {
      existing.quantity += quantity;
    } else {
      player.inventory.push({
        id: uuid(),
        name: merchantItem.name,
        description: merchantItem.description,
        type: merchantItem.type,
        quantity,
        slot: merchantItem.slot,
        effects: merchantItem.effects ? JSON.parse(JSON.stringify(merchantItem.effects)) : [],
      });
    }

    merchantItem.quantity -= quantity;
    if (merchantItem.quantity <= 0) {
      merchant.inventory = merchant.inventory.filter(i => i.id !== merchantItemId);
    }

    return { success: true };
  }

  private getDefaultSellPrice(type: string): number {
    const prices: Record<string, number> = {
      weapon: 15,
      armor: 20,
      potion: 10,
      scroll: 15,
      key_item: 50,
      misc: 5,
    };
    return prices[type] ?? 5;
  }

  private getMerchantSellPrice(merchant: Merchant, itemName: string, itemType: string, chaMod: number): number {
    const stocked = merchant.inventory.find(i => i.name === itemName && i.type === itemType);
    const basePrice = stocked ? stocked.sellPrice : this.getDefaultSellPrice(itemType);
    return Math.max(1, Math.round(basePrice * (0.5 + chaMod * 0.05)));
  }

  sellToMerchant(
    roomId: string, playerId: string, merchantId: string,
    itemId: string, quantity = 1,
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    const merchant = room.merchants?.find(m => m.id === merchantId);
    if (!merchant) return { success: false, error: 'Merchant not found' };

    const itemIndex = player.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return { success: false, error: 'Item not found in inventory' };

    const item = player.inventory[itemIndex];
    if (item.quantity < quantity) return { success: false, error: 'Not enough quantity' };

    const chaMod = Math.floor((player.attributes.charisma - 10) / 2);
    const unitPrice = this.getMerchantSellPrice(merchant, item.name, item.type, chaMod);
    const totalValue = unitPrice * quantity;

    if (merchant.coins < totalValue) return { success: false, error: 'Merchant does not have enough coins' };

    merchant.coins -= totalValue;
    player.coins += totalValue;

    if (item.quantity <= quantity) {
      player.inventory.splice(itemIndex, 1);
    } else {
      item.quantity -= quantity;
    }

    const merchantExisting = merchant.inventory.find(i => i.name === item.name && i.type === item.type);
    if (merchantExisting) {
      merchantExisting.quantity += quantity;
    } else {
      merchant.inventory.push({
        id: uuid(),
        name: item.name,
        description: item.description,
        type: item.type,
        quantity,
        slot: item.slot,
        effects: item.effects ? JSON.parse(JSON.stringify(item.effects)) : [],
        buyPrice: Math.round(unitPrice * 2),
        sellPrice: unitPrice,
      });
    }

    return { success: true };
  }

  clearMerchants(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.merchants = undefined;
    room.merchantsLocation = undefined;
  }

  getXpForLevel(level: number): number {
    if (level <= 1) return XP_THRESHOLDS[1] ?? 300;
    if (level >= MAX_LEVEL) return 0;
    return XP_THRESHOLDS[level] ?? XP_THRESHOLDS[1];
  }

  awardXp(roomId: string, playerId: string, amount: number): { leveledUp: boolean; newLevel: number; gainedPoints: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.level >= MAX_LEVEL) return null;

    player.xp += amount;
    let leveledUp = false;
    let gainedPoints = 0;
    const finalLevel = player.level;

    while (player.xp >= player.maxXp && player.level < MAX_LEVEL) {
      player.level++;
      leveledUp = true;

      if (ASI_LEVELS.has(player.level)) {
        player.pendingAttributePoints += 2;
        gainedPoints += 2;
      }

      player.maxXp = this.getXpForLevel(player.level + 1);
    }

    return leveledUp ? { leveledUp, newLevel: player.level, gainedPoints } : { leveledUp: false, newLevel: player.level, gainedPoints: 0 };
  }

  allocateAttributes(
    roomId: string,
    playerId: string,
    allocations: Partial<Record<keyof Player['attributes'], number>>,
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const totalPoints = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
    if (totalPoints > player.pendingAttributePoints) {
      return { success: false, error: 'Not enough attribute points' };
    }

    for (const [attr, delta] of Object.entries(allocations)) {
      if (!delta) continue;
      const key = attr as keyof Player['attributes'];
      const current = player.attributes[key];
      if (current + delta > MAX_ATTRIBUTE) {
        return { success: false, error: `${attr} cannot exceed ${MAX_ATTRIBUTE}` };
      }
      player.attributes[key] += delta;
    }

    player.pendingAttributePoints -= totalPoints;

    return { success: true };
  }
}
