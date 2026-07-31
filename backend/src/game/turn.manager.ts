import { Injectable } from '@nestjs/common';
import { GameState, GameStateData } from './game.state';

@Injectable()
export class TurnManager {
  private locks: Map<string, string> = new Map();

  constructor(private gameState: GameState) {}

  isLocked(roomId: string): boolean {
    return this.locks.has(roomId);
  }

  acquire(roomId: string, ownerId: string): boolean {
    if (this.locks.has(roomId)) return false;
    this.locks.set(roomId, ownerId);
    return true;
  }

  release(roomId: string, ownerId: string): void {
    if (this.locks.get(roomId) === ownerId) {
      this.locks.delete(roomId);
    }
  }

  canPlayerAct(roomId: string, playerId: string): { allowed: boolean; reason?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { allowed: false, reason: 'Room not found' };

    if (room.isTradeLocked) {
      return { allowed: false, reason: 'Trade in progress' };
    }

    if (this.isLocked(roomId)) {
      return { allowed: false, reason: 'AI is processing an action...' };
    }

    if (!room.currentTurn) {
      return { allowed: true };
    }

    if (room.turnType === 'call_player' || room.turnType === 'call_roll') {
      if (room.turnTarget && room.turnTarget !== playerId) {
        return { allowed: false, reason: 'Not your turn' };
      }
    }

    return { allowed: true };
  }

  canInitiateTrade(roomId: string, playerId: string): { allowed: boolean; reason?: string } {
    const base = this.canPlayerAct(roomId, playerId);
    if (!base.allowed) return base;

    const room = this.gameState.getRoom(roomId);
    if (room && (room.turnType === 'call_player' || room.turnType === 'call_roll')) {
      return { allowed: false, reason: 'Waiting for a player to act...' };
    }

    return base;
  }

  processTurn(roomId: string, state: GameStateData, aiResponse: { next: { type: string; target?: string; skill?: string; dc?: number } }): void {
    state.currentTurn = aiResponse.next.target || null;
    state.turnType = aiResponse.next.type as any;
    state.turnTarget = aiResponse.next.target || null;
    if (aiResponse.next.type === 'call_roll') {
      state.turnSkill = aiResponse.next.skill;
      state.turnDc = aiResponse.next.dc;
    }
  }
}
