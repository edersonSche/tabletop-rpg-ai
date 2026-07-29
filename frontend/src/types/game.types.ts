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

export interface Message {
  type: 'system' | 'action' | 'narration' | 'roll';
  content: string;
  characterName?: string;
  timestamp: number;
}

export type TurnType = 'group_action' | 'call_player' | 'call_roll';

export interface AIResponse {
  narration: string;
  location?: string;
  next: {
    type: TurnType;
    target?: string;
    skill?: string;
    dc?: number;
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
  campaignTheme: string;
  players: Player[];
  currentTurn: string | null;
  turnType: TurnType | null;
  turnTarget: string | null;
  currentLocation: string | null;
  gameStarted: boolean;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
}

export interface MerchantItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'shield' | 'potion' | 'scroll' | 'key_item' | 'misc';
  slot?: 'body' | 'hand' | 'two-handed';
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  effects: Effect[];
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

export interface TradeState {
  locked: boolean;
  merchants?: Merchant[];
  tradeParticipants?: string[];
  tradeDone?: string[];
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

export interface ConditionTickPayload {
  players: Array<{
    id: string;
    hp: number;
    maxHp: number;
    ac: number;
    activeConditions: ActiveCondition[];
    tickResult: {
      playerName?: string;
      hpChange: number;
      conditionsExpired: string[];
      dotDetails: Array<{
        conditionName: string;
        formula: string;
        type: 'heal' | 'damage';
        durationLeft: number;
      }>;
    };
  }>;
}

export interface UseAntidoteResult {
  success: boolean;
  error?: string;
  conditionRemoved?: string;
}

export interface CharacterKit {
  id: string;
  name: string;
  description: string;
  recommendedStats: string[];
  items: Array<{ name: string; quantity: number }>;
}

export interface LoginResponse { success: boolean; error?: string }
export interface CreateRoomResponse { success: boolean; room: { id: string }; error?: string }
export interface CreateCharacterResponse { success: boolean; playerId: string; campaignStarted?: boolean; error?: string }
export interface JoinRoomResponse { success: boolean; needsCharacter?: boolean; room?: { id: string }; playerId?: string; campaignStarted?: boolean; error?: string }
export interface ResumeCampaignResponse { success: boolean; room: { id: string }; playerId: string; campaignStarted?: boolean; error?: string }
export interface ListSavedCampaignsResponse { campaigns?: SavedCampaignInfo[] }
export interface DeleteSavedCampaignResponse { success: boolean; error?: string }
export interface LeaveRoomResponse { success: boolean; error?: string }
export interface GetKitsResponse { kits?: CharacterKit[] }
export interface GetStateResponse { error?: string }
