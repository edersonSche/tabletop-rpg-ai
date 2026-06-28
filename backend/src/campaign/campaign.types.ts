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
  players: SavedPlayer[];
  currentTurn: string | null;
  turnType: SavedTurnType;
  turnTarget: string | null;
  currentLocation: string | null;
  scene: string;
  gameStarted: boolean;
  history: SavedHistoryEntry[];
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
