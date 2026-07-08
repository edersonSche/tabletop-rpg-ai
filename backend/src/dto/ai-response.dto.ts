export type TurnType = 'group_action' | 'call_player' | 'call_roll' | 'narration_only';

export interface MerchantSeedItem {
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'key_item' | 'misc';
  slot?: 'body' | 'hand' | 'two-handed';
  baseBuyPrice: number;
  baseSellPrice: number;
  quantity: number;
  modifiers?: Array<{ stat: string; value: number; operation: string; dexCap?: number }>;
  effects?: Array<{ type: string; formula: string }>;
}

export interface MerchantSeed {
  name: string;
  type: string;
  greeting: string;
  coins: number;
  items: MerchantSeedItem[];
}

export interface AIResponse {
  narration: string;
  location?: string;
  merchants?: MerchantSeed[];
  next: {
    type: TurnType;
    target?: string;
    skill?: string;
    dc?: number;
  };
}
