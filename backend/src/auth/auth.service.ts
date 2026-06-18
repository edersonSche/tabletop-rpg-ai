import { Injectable } from '@nestjs/common';

export interface PlayerConnection {
  playerId: string;
  characterName: string;
  roomId: string;
}

@Injectable()
export class AuthService {
  private activeUsers = new Map<string, string>();
  private socketUsers = new Map<string, string>();
  private playerBySocket = new Map<string, PlayerConnection>();
  private socketByPlayerId = new Map<string, string>();

  login(userId: string, socketId: string): boolean {
    if (this.activeUsers.has(userId)) {
      return false;
    }
    this.activeUsers.set(userId, socketId);
    this.socketUsers.set(socketId, userId);
    return true;
  }

  logout(socketId: string): void {
    const userId = this.socketUsers.get(socketId);
    if (userId) {
      this.activeUsers.delete(userId);
      this.socketUsers.delete(socketId);
    }
  }

  isAuthenticated(socketId: string): boolean {
    return this.socketUsers.has(socketId);
  }

  getUserId(socketId: string): string | undefined {
    return this.socketUsers.get(socketId);
  }

  registerPlayer(socketId: string, playerId: string, characterName: string, roomId: string): void {
    const prev = this.playerBySocket.get(socketId);
    if (prev) {
      this.socketByPlayerId.delete(prev.playerId);
    }
    this.playerBySocket.set(socketId, { playerId, characterName, roomId });
    this.socketByPlayerId.set(playerId, socketId);
  }

  unregisterPlayer(socketId: string): PlayerConnection | undefined {
    const conn = this.playerBySocket.get(socketId);
    if (conn) {
      this.playerBySocket.delete(socketId);
      this.socketByPlayerId.delete(conn.playerId);
    }
    return conn;
  }

  unregisterPlayerByPlayerId(playerId: string): void {
    const socketId = this.socketByPlayerId.get(playerId);
    if (socketId) {
      this.unregisterPlayer(socketId);
    }
  }

  getPlayerIdBySocket(socketId: string): string | undefined {
    return this.playerBySocket.get(socketId)?.playerId;
  }

  getSocketByPlayerId(playerId: string): string | undefined {
    return this.socketByPlayerId.get(playerId);
  }

  getPlayerBySocket(socketId: string): PlayerConnection | undefined {
    return this.playerBySocket.get(socketId);
  }

  getSocketsByRoomId(roomId: string): string[] {
    const sockets: string[] = [];
    for (const [socketId, conn] of this.playerBySocket) {
      if (conn.roomId === roomId) {
        sockets.push(socketId);
      }
    }
    return sockets;
  }
}
