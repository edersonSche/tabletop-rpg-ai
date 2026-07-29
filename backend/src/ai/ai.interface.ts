import { AIResponse } from '../dto/ai-response.dto';

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export type GamePhase = 'group_action' | 'call_player' | 'call_roll' | 'trade';

export interface AIContext {
  roomId: string;
  campaignName: string;
  campaignTheme: string;
  language: string;
  players: Array<{
    id: string;
    name: string;
    level: number;
    activeConditions?: any[];
    attributes?: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
    hp?: number;
    maxHp?: number;
  }>;
  gamePhase: GamePhase;
  currentLocation: string | null;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
  summary: string;
  currentAction: {
    playerId?: string;
    characterName?: string;
    action?: string;
    rollResult?: number;
    skill?: string;
    dc?: number;
  } | null;
}

export interface AIProvider {
  validateConfig(config: AIConfig): void;
  generate(context: AIContext): Promise<AIResponse>;
  onRoomReady?(roomId: string, context: AIContext): Promise<void>;
  onRoomEmpty?(roomId: string): Promise<void>;
  destroy?(): Promise<void>;
}
