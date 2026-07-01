import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, NarrativeLanguage } from '../game/game.state';

export interface RoomData {
  id: string;
  name: string;
  players: Array<{ id: string; name: string }>;
  creatorId: string;
}

@Injectable()
export class RoomService {
  private rooms: Map<string, RoomData> = new Map();

  constructor(private gameState: GameState) {}

  createWithId(id: string, name: string, players: Array<{ id: string; name: string }>, creatorId: string): RoomData {
    const room: RoomData = { id, name, players: [...players], creatorId };
    this.rooms.set(id, room);
    return room;
  }

  create(name: string, language: NarrativeLanguage = 'english', campaignTheme?: string): RoomData {
    const id = uuid().slice(0, 8);
    const room: RoomData = { id, name, players: [], creatorId: '' };
    this.rooms.set(id, room);
    this.gameState.createRoom(id, name, language, campaignTheme);
    return room;
  }

  join(roomId: string, playerId: string, characterName: string): RoomData | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (!room.players.find(p => p.id === playerId)) {
      room.players.push({ id: playerId, name: characterName });
    }
    return room;
  }

  leave(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== playerId);
  }

  list(): RoomData[] {
    return Array.from(this.rooms.values()).map(r => ({
      ...r,
      players: r.players,
    }));
  }

  get(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  remove(roomId: string): void {
    this.rooms.delete(roomId);
  }
}
