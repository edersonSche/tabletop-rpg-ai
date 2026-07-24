import { Injectable } from '@nestjs/common';
import { GameState, Player } from './game.state';

const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

const MAX_LEVEL = 20;
const MAX_ATTRIBUTE = 20;

@Injectable()
export class LevelingService {
  constructor(private gameState: GameState) {}

  getXpForLevel(level: number): number {
    if (level <= 1) return XP_THRESHOLDS[1] ?? 300;
    if (level >= MAX_LEVEL) return 0;
    return XP_THRESHOLDS[level] ?? XP_THRESHOLDS[1];
  }

  awardXp(roomId: string, playerId: string, amount: number): { leveledUp: boolean; newLevel: number; gainedPoints: number } | null {
    const room = this.gameState.getRoom(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.level >= MAX_LEVEL) return null;

    player.xp += amount;
    let leveledUp = false;
    let gainedPoints = 0;

    while (player.xp >= player.maxXp && player.level < MAX_LEVEL) {
      player.level++;
      leveledUp = true;

      if (ASI_LEVELS.has(player.level)) {
        player.pendingAttributePoints += 2;
        gainedPoints += 2;
      }

      player.maxXp = this.getXpForLevel(player.level + 1);
    }

    return leveledUp ? { leveledUp, newLevel: player.level, gainedPoints } : { leveledUp: false, newLevel: player.level, gainedPoints: 0 };
  }

  allocateAttributes(
    roomId: string,
    playerId: string,
    allocations: Partial<Record<keyof Player['attributes'], number>>,
  ): { success: boolean; error?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const totalPoints = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
    if (totalPoints > player.pendingAttributePoints) {
      return { success: false, error: 'Not enough attribute points' };
    }

    for (const [attr, delta] of Object.entries(allocations)) {
      if (!delta) continue;
      const key = attr as keyof Player['attributes'];
      const current = player.attributes[key];
      if (current + delta > MAX_ATTRIBUTE) {
        return { success: false, error: `${attr} cannot exceed ${MAX_ATTRIBUTE}` };
      }
      player.attributes[key] += delta;
    }

    player.pendingAttributePoints -= totalPoints;

    return { success: true };
  }
}
