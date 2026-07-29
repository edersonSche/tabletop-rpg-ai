import { NarrativeLanguage } from '../game/game.state';

export interface SavedEffect {
  type: string;
  duration?: number;
  stat?: string;
  statValue?: number;
  statOperation?: string;
  dexCap?: number;
  hpFormula?: string;
  hpType?: string;
  origin: string;
  originId?: string;
}

export interface SavedPlayer {
  id: string;
  userId: string;
  name: string;
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
  inventory: Array<{
    id: string;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'shield' | 'potion' | 'scroll' | 'key_item' | 'misc';
    quantity: number;
    slot?: 'body' | 'hand' | 'two-handed';
    effects: SavedEffect[];
    antidoteFor?: string;
  }>;
  coins: number;
  equipment: {
    body?: string;
    mainHand?: string;
    offHand?: string;
  };
  activeConditions?: Array<{
    id: string;
    condition: {
      name: string;
      description: string;
      effects: SavedEffect[];
      antidote?: { targetCondition: string; type: string; duration?: number };
      origin: string;
      originId?: string;
    };
    appliedAt: number;
    remainingDurations: number[];
    isSuppressed: boolean;
    suppressRemaining?: number;
  }>;
}

export interface SavedHistoryEntry {
  role: 'player' | 'assistant' | 'system';
  playerId?: string;
  content: string;
}

export type SavedTurnType = 'group_action' | 'call_player' | 'call_roll' | null;

export interface SavedMerchantItem {
  id: string;
  name: string;
  description: string;
  type: string;
  slot?: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  effects: SavedEffect[];
  antidoteFor?: string;
}

export interface SavedMerchant {
  id: string;
  name: string;
  type: string;
  greeting: string;
  coins: number;
  inventory: SavedMerchantItem[];
}

export interface SavedCampaign {
  schemaVersion: number;
  campaignId: string;
  campaignName: string;
  creatorUserId: string;
  creatorPlayerId: string;
  language: NarrativeLanguage;
  campaignTheme: string;
  players: SavedPlayer[];
  currentTurn: string | null;
  turnType: SavedTurnType;
  turnTarget: string | null;
  turnSkill?: string;
  turnDc?: number;
  currentLocation: string | null;
  gameStarted: boolean;
  merchants?: SavedMerchant[];
  merchantsLocation?: string;
  isTradeLocked?: boolean;
  tradeParticipants?: string[];
  tradeDone?: string[];
  history: SavedHistoryEntry[];
  summary?: string;
  savedAt: string;
  status: 'active' | 'inactive';
}

export interface SavedCampaignInfo {
  campaignId: string;
  campaignName: string;
  playersCount: number;
  players: Array<{ id: string; name: string }>;
  lastSavedAt: string;
  hasStarted: boolean;
  isCreator: boolean;
}
