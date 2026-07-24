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
  type: 'weapon' | 'armor' | 'shield' | 'potion' | 'scroll' | 'key_item' | 'misc';
  quantity: number;
  slot?: 'body' | 'hand' | 'two-handed';
  effects: Effect[];
  antidoteFor?: string;
}

export interface MerchantItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'shield' | 'potion' | 'scroll' | 'key_item' | 'misc';
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

export class GameState {
  private rooms: Map<string, GameStateData> = new Map();
  private playerByUserId: Map<string, Map<string, string>> = new Map();

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

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.playerByUserId.delete(roomId);
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

  registerPlayer(roomId: string, userId: string, playerId: string): void {
    const roomUserMap = this.playerByUserId.get(roomId) || new Map();
    roomUserMap.set(userId, playerId);
    this.playerByUserId.set(roomId, roomUserMap);
  }

  unregisterPlayer(roomId: string, userId: string): void {
    const roomUserMap = this.playerByUserId.get(roomId);
    if (roomUserMap) {
      roomUserMap.delete(userId);
    }
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
}
