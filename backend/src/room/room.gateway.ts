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
import { CampaignStore } from '../campaign/campaign.store';

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
    private campaignStore: CampaignStore,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  @SubscribeMessage('lobby:create')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; language?: string; campaignTheme?: string },
  ) {
    const room = this.roomService.create(
      data.name,
      data.language as NarrativeLanguage,
      data.campaignTheme,
    );

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

    const gs = this.gameState.getRoom(data.roomId);
    await this.aiProvider.onRoomReady?.(data.roomId, {
      roomId: data.roomId,
      campaignName: gs?.campaignName || '',
      campaignTheme: gs?.campaignTheme || '',

      language: gs?.language || 'english',
      players: gs?.players || [],
      scene: gs?.scene || '',
      currentLocation: gs?.currentLocation || null,
      history: gs?.history || [],
      currentAction: null,
    });

    client.join(data.roomId);

    this.authService.registerPlayer(client.id, player.id, data.name, data.roomId);

    client.emit('player:registered', { playerId: player.id });

    const state = this.gameState.getRoom(data.roomId);
    if (state) {
      client.emit('game:state', {
        campaignId: state.campaignId,
        campaignName: state.campaignName,
        campaignTheme: state.campaignTheme,
  
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
        campaignTheme: state.campaignTheme,
  
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

    this.campaignStore.saveFromMemory(data.roomId);

    return { success: true, playerId: player.id, campaignStarted: !!(state && state.gameStarted) };
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
    const campaignStarted = !!(state && state.gameStarted);

    if (existing) {
      this.gameState.reactivatePlayer(data.roomId, existing.id);
      this.authService.registerPlayer(client.id, existing.id, existing.name, data.roomId);
      client.join(data.roomId);
      client.emit('player:registered', { playerId: existing.id });

      if (state) {
        client.to(data.roomId).emit('game:state', {
          campaignId: state.campaignId,
          campaignName: state.campaignName,
          campaignTheme: state.campaignTheme,
    
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
          campaignTheme: state.campaignTheme,
    
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

  @SubscribeMessage('lobby:list_saved')
  async handleListSaved(
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authService.getUserId(client.id);
    if (!userId) return { campaigns: [] };
    return { campaigns: this.campaignStore.listSavedByUserId(userId) };
  }

  @SubscribeMessage('lobby:delete_saved')
  async handleDeleteSaved(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { campaignId: string },
  ) {
    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const saved = this.campaignStore.load(data.campaignId);
    if (!saved) return { success: false, error: 'Saved campaign not found' };

    if (saved.creatorUserId !== userId) {
      return { success: false, error: 'Only the campaign creator can delete.' };
    }

    if (this.roomService.get(data.campaignId)) {
      return { success: false, error: 'Campaign is currently active. Leave it first.' };
    }

    this.campaignStore.delete(data.campaignId);
    this.aiProvider.onRoomEmpty?.(data.campaignId);
    return { success: true };
  }

  @SubscribeMessage('lobby:resume')
  async handleResumeCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { campaignId: string },
  ) {
    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const saved = this.campaignStore.load(data.campaignId);
    if (!saved) return { success: false, error: 'Saved campaign not found' };

    if (saved.creatorUserId !== userId) {
      return { success: false, error: 'Only the campaign creator can resume.' };
    }

    if (this.roomService.get(data.campaignId)) {
      const creatorPlayer = this.gameState.findPlayerByUserId(data.campaignId, userId);
      if (!creatorPlayer) {
        return { success: false, error: 'Character not found in active campaign.' };
      }

      this.authService.registerPlayer(client.id, creatorPlayer.id, creatorPlayer.name, data.campaignId);
      client.join(data.campaignId);
      client.emit('player:registered', { playerId: creatorPlayer.id });
      this.gameState.reactivatePlayer(data.campaignId, creatorPlayer.id);

      const state = this.gameState.getRoom(data.campaignId);
      if (state) {
        client.emit('game:state', {
          campaignId: state.campaignId,
          campaignName: state.campaignName,
          campaignTheme: state.campaignTheme,
    
          creatorId: state.creatorId,
          language: state.language,
          players: state.players.filter(p => p.active),
          currentTurn: state.currentTurn,
          turnType: state.turnType,
          turnTarget: state.turnTarget,
          currentLocation: state.currentLocation,
          scene: state.scene,
          gameStarted: state.gameStarted,
          history: state.history,
        });
      }

      return {
        success: true,
        room: { id: data.campaignId, name: this.roomService.get(data.campaignId)!.name },
        playerId: creatorPlayer.id,
        campaignStarted: state?.gameStarted || false,
      };
    }

    this.campaignStore.restoreToMemory(data.campaignId);

    const restoredState = this.gameState.getRoom(data.campaignId);
    if (restoredState) {
      restoredState.gameStarted = false;
    }

    const savedCampaign = this.campaignStore.load(data.campaignId);
    if (!savedCampaign) return { success: false, error: 'Failed to load campaign' };
    const creatorPlayer = savedCampaign.players.find(p => p.userId === userId);
    if (!creatorPlayer) return { success: false, error: 'Creator character not found' };

    this.authService.registerPlayer(client.id, creatorPlayer.id, creatorPlayer.name, savedCampaign.campaignId);
    client.join(savedCampaign.campaignId);
    client.emit('player:registered', { playerId: creatorPlayer.id });

    const restoredStateForAi = this.gameState.getRoom(savedCampaign.campaignId);
    await this.aiProvider.onRoomReady?.(savedCampaign.campaignId, {
      roomId: savedCampaign.campaignId,
      campaignName: savedCampaign.campaignName,
      campaignTheme: restoredStateForAi?.campaignTheme || savedCampaign.campaignTheme || '',

      language: savedCampaign.language,
      players: savedCampaign.players,
      scene: savedCampaign.scene,
      currentLocation: savedCampaign.currentLocation,
      history: savedCampaign.history,
      currentAction: null,
    });

    const state = this.gameState.getRoom(savedCampaign.campaignId);
    if (state) {
      const gameStateData = {
        campaignId: state.campaignId,
        campaignName: state.campaignName,
        campaignTheme: state.campaignTheme,
  
        creatorId: state.creatorId,
        language: state.language,
        players: state.players.filter(p => p.active),
        currentTurn: state.currentTurn,
        turnType: state.turnType,
        turnTarget: state.turnTarget,
        currentLocation: state.currentLocation,
        scene: state.scene,
        gameStarted: state.gameStarted,
        history: state.history,
      };
      client.emit('game:state', gameStateData);
    }

    return {
      success: true,
      room: { id: savedCampaign.campaignId, name: savedCampaign.campaignName },
      playerId: creatorPlayer.id,
      campaignStarted: false,
    };
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    const roomData = this.roomService.get(data.roomId);
    if (!roomData) return { success: false, error: 'Room not found' };

    this.campaignStore.saveFromMemory(data.roomId);
    const isCreator = data.playerId === roomData.creatorId;

    if (isCreator) {
      this.server.to(data.roomId).emit('game:disband', { reason: 'Campaign ended.' });
      this.aiProvider.onRoomEmpty?.(data.roomId);

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
          this.aiProvider.onRoomEmpty?.(data.roomId);
          this.gameState.removeRoom(data.roomId);
          this.roomService.remove(data.roomId);
        } else {
          this.server.to(data.roomId).emit('game:state', {
            campaignId: state.campaignId,
            campaignName: state.campaignName,
            campaignTheme: state.campaignTheme,
      
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
