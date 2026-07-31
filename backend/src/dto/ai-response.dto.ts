import { z } from 'zod';

export const TurnTypeSchema = z.enum(['group_action', 'call_player', 'call_roll']);

export const ConditionEffectSchema = z.object({
  type: z.enum(['immediate', 'temporary', 'permanent']),
  duration: z.number().int().nonnegative().optional(),
  stat: z.string().optional(),
  statValue: z.number().optional(),
  statOperation: z.enum(['add', 'override']).optional(),
  dexCap: z.number().optional(),
  hpFormula: z.string().optional(),
  hpType: z.enum(['heal', 'damage']).optional(),
});

export const MerchantSeedItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  slot: z.string().optional(),
  baseBuyPrice: z.number(),
  baseSellPrice: z.number(),
  quantity: z.number(),
  effects: z.array(ConditionEffectSchema).max(5).optional(),
  antidoteFor: z.string().optional(),
});

export const ConditionSeedSchema = z.object({
  targetPlayerId: z.string(),
  name: z.string(),
  description: z.string(),
  effects: z.array(ConditionEffectSchema).max(5),
});

export const MerchantSeedSchema = z.object({
  name: z.string(),
  type: z.string(),
  greeting: z.string(),
  coins: z.number(),
  items: z.array(MerchantSeedItemSchema),
});

export const NextSchema = z.object({
  type: TurnTypeSchema,
  target: z.string().optional(),
  skill: z.string().optional(),
  dc: z.number().int().min(1).max(50).optional(),
});

export const AIResponseSchema = z.object({
  narration: z.string(),
  summary: z.string(),
  location: z.string().optional(),
  merchants: z.array(MerchantSeedSchema).optional(),
  conditions: z.array(ConditionSeedSchema).optional(),
  next: NextSchema,
});

export type TurnType = z.infer<typeof TurnTypeSchema>;
export type ConditionEffectSeed = z.infer<typeof ConditionEffectSchema>;
export type MerchantSeedItem = z.infer<typeof MerchantSeedItemSchema>;
export type ConditionSeed = z.infer<typeof ConditionSeedSchema>;
export type MerchantSeed = z.infer<typeof MerchantSeedSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;

export type TradeInitResult = AIResponse & { merchantsReady: boolean };
