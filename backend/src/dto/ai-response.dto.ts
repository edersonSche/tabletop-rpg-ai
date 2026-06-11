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
