import { AIResponse } from '../dto/ai-response.dto';

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AIContext {
  roomId: string;
  campaignName: string;
  campaignSetting: string;
  players: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    magic: number;
  }>;
  scene: string;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
  currentAction: {
    playerId?: string;
    playerName?: string;
    action?: string;
    rollResult?: number;
    skill?: string;
    dc?: number;
  } | null;
}

export interface AIProvider {
  configure(config: AIConfig): void;
  generate(context: AIContext): Promise<AIResponse>;
  onRoomReady?(roomId: string): Promise<void>;
  onRoomEmpty?(roomId: string): Promise<void>;
}
