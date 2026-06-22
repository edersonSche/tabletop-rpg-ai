import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { RoomService } from './room.service';
import { GameState, NarrativeLanguage, Player } from '../game/game.state';
import { AIProvider } from '../ai/ai.interface';
import { AuthService } from '../auth/auth.service';
import { AuthWsGuard } from '../auth/auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(AuthWsGuard)
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private roomService: RoomService,
    private gameState: GameState,
    private authService: AuthService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  @SubscribeMessage('lobby:create')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; language?: string },
  ) {
    const room = this.roomService.create(data.name, data.language as NarrativeLanguage);

    return {
      success: true,
      room: {
        id: room.id,
        name: room.name,
      },
    };
  }

  @SubscribeMessage('lobby:create_character')
  async handleCreateCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; name: string; attributes?: Player['attributes'] },
  ) {
    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const player = this.gameState.addPlayer(data.roomId, userId, data.name, data.attributes);
    const roomData = this.roomService.get(data.roomId);
    if (roomData && !roomData.creatorId) {
      roomData.creatorId = player.id;
    }
    const gameRoom = this.gameState.getRoom(data.roomId);
    if (gameRoom && !gameRoom.creatorId) {
      gameRoom.creatorId = player.id;
    }
    this.roomService.join(data.roomId, player.id, data.name);

    await this.aiProvider.onRoomReady?.(data.roomId);

    client.join(data.roomId);

    this.authService.registerPlayer(client.id, player.id, data.name, data.roomId);

    client.emit('player:registered', { playerId: player.id });

    const state = this.gameState.getRoom(data.roomId);
    if (state) {
      client.emit('game:state', {
        campaignId: state.campaignId,
        campaignName: state.campaignName,
        creatorId: state.creatorId,
        players: state.players.filter(p => p.active),
        currentTurn: state.currentTurn,
        turnType: state.turnType,
        turnTarget: state.turnTarget,
        currentLocation: state.currentLocation,
        scene: state.scene,
        history: state.history,
      });

      this.server.to(data.roomId).emit('game:state', {
        campaignId: state.campaignId,
        campaignName: state.campaignName,
        creatorId: state.creatorId,
        players: state.players.filter(p => p.active),
        currentTurn: state.currentTurn,
        turnType: state.turnType,
        turnTarget: state.turnTarget,
        scene: state.scene,
      });

      this.server.to(data.roomId).emit('game:message', {
        type: 'system',
        content: `${data.name} joined the campaign.`,
      });
    }

    return { success: true, playerId: player.id, campaignStarted: !!(state && state.scene) };
  }

  @SubscribeMessage('lobby:list')
  handleListRooms() {
    return this.roomService.list();
  }

  @SubscribeMessage('lobby:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const roomData = this.roomService.get(data.roomId);
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const existing = this.gameState.findPlayerByUserId(data.roomId, userId);
    const state = this.gameState.getRoom(data.roomId);
    const campaignStarted = !!(state && state.scene);

    if (existing) {
      this.gameState.reactivatePlayer(data.roomId, existing.id);
      this.authService.registerPlayer(client.id, existing.id, existing.name, data.roomId);
      client.join(data.roomId);
      client.emit('player:registered', { playerId: existing.id });

      if (state) {
        client.to(data.roomId).emit('game:state', {
          campaignId: state.campaignId,
          campaignName: state.campaignName,
          creatorId: state.creatorId,
          players: state.players.filter(p => p.active),
          currentTurn: state.currentTurn,
          turnType: state.turnType,
          turnTarget: state.turnTarget,
          scene: state.scene,
        });

        client.emit('game:state', {
          campaignId: state.campaignId,
          campaignName: state.campaignName,
          creatorId: state.creatorId,
          language: state.language,
          players: state.players.filter(p => p.active),
          currentTurn: state.currentTurn,
          turnType: state.turnType,
          turnTarget: state.turnTarget,
          currentLocation: state.currentLocation,
          scene: state.scene,
          history: state.history,
        });
      }

      return {
        success: true,
        needsCharacter: false,
        playerId: existing.id,
        name: existing.name,
        room: {
          id: roomData.id,
          name: roomData.name,
          players: roomData.players,
        },
        campaignStarted,
      };
    }

    return {
      success: true,
      needsCharacter: true,
      roomId: data.roomId,
      campaignName: roomData.name,
      campaignStarted,
    };
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    const roomData = this.roomService.get(data.roomId);
    if (!roomData) return { success: false, error: 'Room not found' };

    const isCreator = data.playerId === roomData.creatorId;

    if (isCreator) {
      this.server.to(data.roomId).emit('game:disband', { reason: 'Campaign ended.' });

      const roomSockets = this.authService.getSocketsByRoomId(data.roomId);
      for (const sid of roomSockets) {
        this.authService.unregisterPlayer(sid);
      }

      this.gameState.removeRoom(data.roomId);
      this.roomService.remove(data.roomId);
      this.server.socketsLeave(data.roomId);
    } else {
      this.gameState.removePlayer(data.roomId, data.playerId);
      this.roomService.leave(data.roomId, data.playerId);

      this.authService.unregisterPlayer(client.id);
      client.leave(data.roomId);

      const state = this.gameState.getRoom(data.roomId);
      if (state) {
        if (state.players.length === 0) {
          this.gameState.removeRoom(data.roomId);
          this.roomService.remove(data.roomId);
        } else {
          this.server.to(data.roomId).emit('game:state', {
            campaignId: state.campaignId,
            campaignName: state.campaignName,
            creatorId: state.creatorId,
            players: state.players.filter(p => p.active),
            currentTurn: state.currentTurn,
            turnType: state.turnType,
            turnTarget: state.turnTarget,
            scene: state.scene,
          });
        }
      }
    }

    return { success: true };
  }
}
