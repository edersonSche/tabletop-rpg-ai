export type TurnType = 'group_action' | 'call_player' | 'call_roll' | 'narration_only';

export interface MerchantSeedItem {
  name: string;
  description: string;
  type: string;
  slot?: string;
  baseBuyPrice: number;
  baseSellPrice: number;
  quantity: number;
  effects?: Array<{
    type: 'immediate' | 'temporary' | 'permanent';
    duration?: number;
    stat?: string;
    value?: number;
    operation?: string;
    dexCap?: number;
    hpFormula?: string;
    hpType?: 'heal' | 'damage';
  }>;
  antidoteFor?: string;
}

export interface ConditionSeed {
  name: string;
  description: string;
  effects?: Array<{
    type: 'immediate' | 'temporary' | 'permanent';
    duration?: number;
    stat?: string;
    value?: number;
    operation?: string;
    dexCap?: number;
    hpFormula?: string;
    hpType?: 'heal' | 'damage';
  }>;
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
