import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useSocketContext } from './SocketContext';
import { usePlayerContext } from './PlayerContext';

interface InventoryContextValue {
  emitEquip: (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => void;
  emitUnequip: (slot: 'body' | 'mainHand' | 'offHand') => void;
  emitUseItem: (itemId: string) => void;
  emitUseAntidote: (itemId: string, targetConditionName?: string) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { emit } = useSocketContext();
  const { player } = usePlayerContext();

  const emitEquip = useCallback((itemId: string, slot: 'body' | 'mainHand' | 'offHand') => {
    if (!player.roomId || !player.playerId) return;
    emit('game:equip', {
      roomId: player.roomId,
      playerId: player.playerId,
      itemId,
      slot,
    });
  }, [player, emit]);

  const emitUnequip = useCallback((slot: 'body' | 'mainHand' | 'offHand') => {
    if (!player.roomId || !player.playerId) return;
    emit('game:unequip', {
      roomId: player.roomId,
      playerId: player.playerId,
      slot,
    });
  }, [player, emit]);

  const emitUseItem = useCallback((itemId: string) => {
    if (!player.roomId || !player.playerId) return;
    emit('game:use_item', {
      roomId: player.roomId,
      playerId: player.playerId,
      itemId,
    });
  }, [player, emit]);

  const emitUseAntidote = useCallback((itemId: string, targetConditionName?: string) => {
    if (!player.roomId || !player.playerId) return;
    emit('game:use_antidote', {
      roomId: player.roomId,
      playerId: player.playerId,
      itemId,
      targetConditionName,
    });
  }, [player, emit]);

  return (
    <InventoryContext.Provider value={{ emitEquip, emitUnequip, emitUseItem, emitUseAntidote }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryContext() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventoryContext must be used within InventoryProvider');
  return ctx;
}
