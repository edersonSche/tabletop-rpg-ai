export type NarrativeLanguage = 'english' | 'portuguese' | 'spanish';

export interface Player {
  id: string;
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
}

export type TurnType = 'group_action' | 'call_player' | 'call_roll' | 'narration_only';

export interface AIResponse {
  narration: string;
  location?: string;
  next: {
    type: TurnType;
    target?: string;
    skill?: string;
    dc?: number;
    options?: string[];
  };
}

export interface GameAction {
  playerId: string;
  message: string;
  type: 'action' | 'roll';
  rollResult?: number;
}

export interface GameNarration {
  narration: string;
  next: AIResponse['next'];
  state: GameState;
}

export interface GameState {
  campaignId: string;
  campaignName: string;
  creatorId: string;
  language: NarrativeLanguage;
  players: Player[];
  currentTurn: string | null;
  turnType: TurnType | null;
  turnTarget: string | null;
  currentLocation: string | null;
  scene: string;
  gameStarted: boolean;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
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

export interface TurnUpdate {
  currentTurn: string | null;
  type: TurnType | null;
  target: string | null;
  skill?: string;
  dc?: number;
}

export interface Room {
  id: string;
  name: string;
  players: Array<{ id: string; name: string }>;
  campaignStarted: boolean;
}
