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
  language: string;
  players: Array<{
    id: string;
    name: string;
  }>;
  scene: string;
  currentLocation: string | null;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
  summary?: string;
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
  configure(config: AIConfig): void;
  generate(context: AIContext): Promise<AIResponse>;
  onRoomReady?(roomId: string, context: AIContext): Promise<void>;
  onRoomEmpty?(roomId: string): Promise<void>;
  summarize?(entries: string[], existingSummary?: string): Promise<string>;
}
