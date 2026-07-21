export type TurnType = 'group_action' | 'call_player' | 'call_roll' | 'narration_only';

export interface ConditionEffectSeed {
  type: 'immediate' | 'temporary' | 'permanent';
  duration?: number;
  stat?: string;
  statValue?: number;
  statOperation?: 'add' | 'override';
  dexCap?: number;
  hpFormula?: string;
  hpType?: 'heal' | 'damage';
}

export interface MerchantSeedItem {
  name: string;
  description: string;
  type: string;
  slot?: string;
  baseBuyPrice: number;
  baseSellPrice: number;
  quantity: number;
  effects?: ConditionEffectSeed[];
  antidoteFor?: string;
}

export interface ConditionSeed {
  targetPlayerId: string;
  name: string;
  description: string;
  effects: ConditionEffectSeed[];
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
  conditions?: ConditionSeed[];
  next: {
    type: TurnType;
    target?: string;
    skill?: string;
    dc?: number;
  };
}
