import { Injectable } from '@nestjs/common';
import { GameState, GameStateData } from './game.state';

@Injectable()
export class TurnManager {
  private locks: Map<string, boolean> = new Map();
  private queues: Map<string, { playerId: string; message: string }[]> = new Map();

  constructor(private gameState: GameState) {}

  isLocked(roomId: string): boolean {
    return this.locks.get(roomId) || false;
  }

  lock(roomId: string): void {
    this.locks.set(roomId, true);
  }

  unlock(roomId: string): void {
    this.locks.set(roomId, false);
  }

  canPlayerAct(roomId: string, playerId: string): { allowed: boolean; reason?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { allowed: false, reason: 'Room not found' };

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

  processTurn(roomId: string, state: GameStateData, aiResponse: { next: { type: string; target?: string; skill?: string; dc?: number } }): void {
    state.currentTurn = aiResponse.next.type === 'narration_only' ? null : (aiResponse.next.target || state.currentTurn);
    state.turnType = aiResponse.next.type as any;
    state.turnTarget = aiResponse.next.target || null;
  }
}
