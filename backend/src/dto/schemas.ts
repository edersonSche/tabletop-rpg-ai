import { z } from 'zod';

const nonEmpty = z.string().min(1);

// ─── Auth ──────────────────────────────────────────────────────────────

export const AuthLoginSchema = z.object({
  userId: nonEmpty,
}).strict();

// ─── Lobby ─────────────────────────────────────────────────────────────

export const LobbyCreateSchema = z.object({
  name: nonEmpty,
  language: z.enum(['english', 'portuguese', 'spanish']).optional(),
}).strict();

const PlayerAttributesSchema = z.object({
  strength: z.number().int().min(8).max(15),
  dexterity: z.number().int().min(8).max(15),
  constitution: z.number().int().min(8).max(15),
  intelligence: z.number().int().min(8).max(15),
  wisdom: z.number().int().min(8).max(15),
  charisma: z.number().int().min(8).max(15),
});

export const LobbyCreateCharacterSchema = z.object({
  roomId: nonEmpty,
  name: z.string().min(1).max(50),
  attributes: PlayerAttributesSchema,
  kitId: z.string().optional(),
}).strict();

export const LobbyJoinSchema = z.object({
  roomId: nonEmpty,
}).strict();

export const LobbyDeleteSavedSchema = z.object({
  campaignId: nonEmpty,
}).strict();

export const LobbyResumeSchema = z.object({
  campaignId: nonEmpty,
}).strict();

// ─── Room ──────────────────────────────────────────────────────────────

export const RoomJoinSchema = z.object({
  roomId: nonEmpty,
}).strict();

export const RoomLeaveSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
}).strict();

// ─── Game ──────────────────────────────────────────────────────────────

export const GameGetKitsSchema = z.object({
  roomId: nonEmpty,
}).strict();

export const GameActionSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  message: z.string().min(1).max(5000),
}).strict();

export const GameRollSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  skill: z.string().optional(),
  dc: z.number().int().min(1).max(50).optional(),
}).strict();

export const GameStartSchema = z.object({
  roomId: nonEmpty,
}).strict();

export const GameTypingSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  username: nonEmpty,
}).strict();

export const GameTypingStopSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
}).strict();

export const AllocateAttributesSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  allocations: z.record(z.string(), z.number().int()),
}).strict();

export const EquipItemSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  itemId: nonEmpty,
  slot: z.enum(['body', 'mainHand', 'offHand']),
}).strict();

export const UnequipItemSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  slot: z.enum(['body', 'mainHand', 'offHand']),
}).strict();

export const UseItemSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  itemId: nonEmpty,
}).strict();

export const UseAntidoteSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  itemId: nonEmpty,
  targetConditionName: z.string().optional(),
}).strict();

export const GameStateSchema = z.object({
  roomId: nonEmpty,
}).strict();

// ─── Trade ─────────────────────────────────────────────────────────────

export const InitiateTradeSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
}).strict();

export const BuyItemSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  merchantId: nonEmpty,
  merchantItemId: nonEmpty,
  quantity: z.number().int().min(1).optional().default(1),
}).strict();

export const SellItemSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
  merchantId: nonEmpty,
  itemId: nonEmpty,
  quantity: z.number().int().min(1).optional().default(1),
}).strict();

export const EndTradeSchema = z.object({
  roomId: nonEmpty,
  playerId: nonEmpty,
}).strict();

// ─── Inferred types ────────────────────────────────────────────────────

export type AuthLoginData = z.infer<typeof AuthLoginSchema>;
export type LobbyCreateData = z.infer<typeof LobbyCreateSchema>;
export type LobbyCreateCharacterData = z.infer<typeof LobbyCreateCharacterSchema>;
export type LobbyJoinData = z.infer<typeof LobbyJoinSchema>;
export type LobbyDeleteSavedData = z.infer<typeof LobbyDeleteSavedSchema>;
export type LobbyResumeData = z.infer<typeof LobbyResumeSchema>;
export type RoomJoinData = z.infer<typeof RoomJoinSchema>;
export type RoomLeaveData = z.infer<typeof RoomLeaveSchema>;
export type GameGetKitsData = z.infer<typeof GameGetKitsSchema>;
export type GameActionData = z.infer<typeof GameActionSchema>;
export type GameRollData = z.infer<typeof GameRollSchema>;
export type GameStartData = z.infer<typeof GameStartSchema>;
export type GameTypingData = z.infer<typeof GameTypingSchema>;
export type GameTypingStopData = z.infer<typeof GameTypingStopSchema>;
export type AllocateAttributesData = z.infer<typeof AllocateAttributesSchema>;
export type EquipItemData = z.infer<typeof EquipItemSchema>;
export type UnequipItemData = z.infer<typeof UnequipItemSchema>;
export type UseItemData = z.infer<typeof UseItemSchema>;
export type UseAntidoteData = z.infer<typeof UseAntidoteSchema>;
export type GameStateData = z.infer<typeof GameStateSchema>;
export type InitiateTradeData = z.infer<typeof InitiateTradeSchema>;
export type BuyItemData = z.infer<typeof BuyItemSchema>;
export type SellItemData = z.infer<typeof SellItemSchema>;
export type EndTradeData = z.infer<typeof EndTradeSchema>;
