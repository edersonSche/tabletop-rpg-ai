import { NarrativeLanguage } from '../game/game.state';

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
    type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'key_item' | 'misc';
    quantity: number;
    slot?: 'body' | 'hand' | 'two-handed';
    modifiers?: Array<{ stat: string; value: number; operation: 'add' | 'override'; dexCap?: number }>;
    effects?: Array<{ type: string; formula: string }>;
  }>;
  coins: number;
  equipment: {
    body?: string;
    mainHand?: string;
    offHand?: string;
  };
}

export interface SavedHistoryEntry {
  role: 'player' | 'assistant' | 'system';
  playerId?: string;
  content: string;
}

export type SavedTurnType = 'group_action' | 'call_player' | 'call_roll' | 'narration_only' | null;

export interface SavedCampaign {
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
  scene: string;
  gameStarted: boolean;
  history: SavedHistoryEntry[];
  summary?: string;
  lastSummarizedAt?: number;
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
