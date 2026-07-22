import { Injectable } from '@nestjs/common';
import { GameState } from './game.state';

@Injectable()
export class TradeService {
  constructor(private gameState: GameState) {}

  lockTrade(roomId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;
    room.isTradeLocked = true;
    room.tradeParticipants = room.players.filter(p => p.active).map(p => p.id);
    room.tradeDone = [];
  }

  unlockTrade(roomId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;
    room.isTradeLocked = false;
    room.tradeParticipants = [];
    room.tradeDone = [];
  }

  markDone(roomId: string, playerId: string): boolean {
    const room = this.gameState.getRoom(roomId);
    if (!room) return false;
    if (!room.tradeDone.includes(playerId)) {
      room.tradeDone.push(playerId);
    }
    return room.tradeParticipants.length > 0 &&
      room.tradeDone.length >= room.tradeParticipants.length;
  }

  removeFromTrade(roomId: string, playerId: string): boolean {
    const room = this.gameState.getRoom(roomId);
    if (!room || !room.isTradeLocked) return false;
    room.tradeParticipants = room.tradeParticipants.filter(id => id !== playerId);
    room.tradeDone = room.tradeDone.filter(id => id !== playerId);
    const shouldUnlock = room.tradeParticipants.length === 0 ||
      room.tradeDone.length >= room.tradeParticipants.length;
    if (shouldUnlock) {
      this.unlockTrade(roomId);
    }
    return shouldUnlock;
  }
}
