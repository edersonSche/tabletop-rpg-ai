import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { RoomService } from './room.service';
import { GameState, NarrativeLanguage } from '../game/game.state';
import { AIProvider } from '../ai/ai.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RoomGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private playerSockets: Map<string, { socketId: string; playerId: string; roomId: string; username: string }> = new Map();

  constructor(
    private roomService: RoomService,
    private gameState: GameState,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  async handleDisconnect(client: Socket) {
    const entry = Array.from(this.playerSockets.entries()).find(([, v]) => v.socketId === client.id);
    if (entry) {
      const [key] = entry;
      const { roomId, playerId, username } = entry[1];

      this.gameState.removePlayer(roomId, playerId);
      this.playerSockets.delete(key);

      const room = this.gameState.getRoom(roomId);
      if (room) {
        if (room.players.length === 0) {
          await this.aiProvider.onRoomEmpty?.(roomId);
        }

        this.server.to(roomId).emit('game:state', {
          campaignId: room.campaignId,
          campaignName: room.campaignName,
          players: room.players,
          currentTurn: room.currentTurn,
          turnType: room.turnType,
          turnTarget: room.turnTarget,
          scene: room.scene,
        });
        this.server.to(roomId).emit('game:message', {
          type: 'system',
          content: `${username} left the campaign.`,
        });
      }
    }
  }

  @SubscribeMessage('lobby:create')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; playerName: string; language?: string },
  ) {
    const room = this.roomService.create(data.name, data.language as NarrativeLanguage);
    const player = this.gameState.addPlayer(room.id, data.playerName);

    await this.aiProvider.onRoomReady?.(room.id);

    client.join(room.id);

    const key = `${room.id}:${player.id}`;
    this.playerSockets.set(key, {
      socketId: client.id,
      playerId: player.id,
      roomId: room.id,
      username: data.playerName,
    });

    client.emit('player:registered', { playerId: player.id });

    return {
      success: true,
      room: {
        id: room.id,
        name: room.name,
        players: room.players,
      },
      playerId: player.id,
    };
  }

  @SubscribeMessage('lobby:list')
  handleListRooms() {
    return this.roomService.list();
  }

  @SubscribeMessage('lobby:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerName: string },
  ) {
    const roomData = this.roomService.get(data.roomId);
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const player = this.gameState.addPlayer(data.roomId, data.playerName);
    const state = this.gameState.getRoom(data.roomId);

    if (state && state.players.length === 1) {
      await this.aiProvider.onRoomReady?.(data.roomId);
    }

    client.join(data.roomId);

    this.roomService.join(data.roomId, player.id, data.playerName);

    const key = `${data.roomId}:${player.id}`;
    this.playerSockets.set(key, {
      socketId: client.id,
      playerId: player.id,
      roomId: data.roomId,
      username: data.playerName,
    });

    if (state) {
      this.server.to(data.roomId).emit('game:state', {
        campaignId: state.campaignId,
        campaignName: state.campaignName,
        players: state.players,
        currentTurn: state.currentTurn,
        turnType: state.turnType,
        turnTarget: state.turnTarget,
        scene: state.scene,
      });
    }

    client.emit('player:registered', { playerId: player.id });

    return {
      success: true,
      room: {
        id: roomData.id,
        name: roomData.name,
        players: roomData.players,
      },
      playerId: player.id,
    };
  }
}
