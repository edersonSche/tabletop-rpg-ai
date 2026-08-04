import { emit } from './socket';
import { usePlayerStore } from './playerStore';

type Slot = 'body' | 'mainHand' | 'offHand';

export function emitEquip(itemId: string, slot: Slot): void {
  const { roomId, playerId } = usePlayerStore.getState().player;
  if (!roomId || !playerId) return;
  emit('game:equip', { roomId, playerId, itemId, slot });
}

export function emitUnequip(slot: Slot): void {
  const { roomId, playerId } = usePlayerStore.getState().player;
  if (!roomId || !playerId) return;
  emit('game:unequip', { roomId, playerId, slot });
}

export function emitUseItem(itemId: string): void {
  const { roomId, playerId } = usePlayerStore.getState().player;
  if (!roomId || !playerId) return;
  emit('game:use_item', { roomId, playerId, itemId });
}

export function emitUseAntidote(itemId: string, targetConditionName?: string): void {
  const { roomId, playerId } = usePlayerStore.getState().player;
  if (!roomId || !playerId) return;
  emit('game:use_antidote', { roomId, playerId, itemId, targetConditionName });
}
