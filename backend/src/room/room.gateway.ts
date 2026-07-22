import { UseGuards, UsePipes } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { GameState, NarrativeLanguage } from '../game/game.state';
import { PlayerService } from '../game/player.service';
import { AiService } from '../ai/ai.service';
import { AuthService } from '../auth/auth.service';
import { AuthWsGuard } from '../auth/auth.guard';
import { CampaignStore } from '../campaign/campaign.store';
import { getKitsForTheme } from '../data/theme-kits';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import {
  LobbyCreateSchema,
  LobbyCreateCharacterSchema,
  GameGetKitsSchema,
  LobbyJoinSchema,
  LobbyDeleteSavedSchema,
  LobbyResumeSchema,
  RoomLeaveSchema,
} from '../dto/schemas';

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
    private playerService: PlayerService,
    private authService: AuthService,
    private campaignStore: CampaignStore,
    private aiService: AiService,
  ) {}

  @SubscribeMessage('lobby:create')
  @UsePipes(new ZodValidationPipe(LobbyCreateSchema))
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { name, language } = data as { name: string; language?: string };
    const room = this.roomService.create(
      name,
      language as NarrativeLanguage,
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
  @UsePipes(new ZodValidationPipe(LobbyCreateCharacterSchema))
  async handleCreateCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, name, attributes, kitId } = data as {
      roomId: string;
      name: string;
      attributes: { strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number };
      kitId?: string;
    };

    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const gs = this.gameState.getRoom(roomId);
    const player = this.playerService.addPlayer(roomId, userId, name, attributes, kitId, gs?.language);
    const roomData = this.roomService.get(roomId);
    if (roomData && !roomData.creatorId) {
      roomData.creatorId = player.id;
    }
    const gameRoom = this.gameState.getRoom(roomId);
    if (gameRoom && !gameRoom.creatorId) {
      gameRoom.creatorId = player.id;
    }
    this.roomService.join(roomId, player.id, name);

    const gsForAi = this.gameState.getRoom(roomId);
    await this.aiService.onRoomReady(roomId, {
      roomId,
      campaignName: gsForAi?.campaignName || '',
      campaignTheme: gsForAi?.campaignTheme || '',
      language: gsForAi?.language || 'english',
      players: gsForAi?.players || [],
      scene: gsForAi?.scene || '',
      currentLocation: gsForAi?.currentLocation || null,
      history: gsForAi?.history || [],
      currentAction: null,
    });

    client.join(roomId);

    this.authService.registerPlayer(client.id, player.id, name, roomId);

    client.emit('player:registered', { playerId: player.id });

    const state = this.gameState.getRoom(roomId);
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

      this.server.to(roomId).emit('game:state', {
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

      this.server.to(roomId).emit('game:message', {
        type: 'system',
        content: `${name} joined the campaign.`,
      });
    }

    this.campaignStore.saveFromMemory(roomId);

    return { success: true, playerId: player.id, campaignStarted: !!(state && state.gameStarted) };
  }

  @SubscribeMessage('game:get_kits')
  @UsePipes(new ZodValidationPipe(GameGetKitsSchema))
  handleGetKits(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId } = data as { roomId: string };
    const state = this.gameState.getRoom(roomId);
    if (!state) return { kits: [] };

    const kits = getKitsForTheme(state.language);
    return { kits };
  }

  @SubscribeMessage('lobby:list')
  handleListRooms() {
    return this.roomService.list();
  }

  @SubscribeMessage('lobby:join')
  @UsePipes(new ZodValidationPipe(LobbyJoinSchema))
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId } = data as { roomId: string };

    const roomData = this.roomService.get(roomId);
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const existing = this.playerService.findPlayerByUserId(roomId, userId);
    const state = this.gameState.getRoom(roomId);
    const campaignStarted = !!(state && state.gameStarted);

    if (existing) {
      this.playerService.reactivatePlayer(roomId, existing.id);
      this.authService.registerPlayer(client.id, existing.id, existing.name, roomId);
      client.join(roomId);
      client.emit('player:registered', { playerId: existing.id });

      if (state) {
        client.to(roomId).emit('game:state', {
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
      roomId,
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
  @UsePipes(new ZodValidationPipe(LobbyDeleteSavedSchema))
  async handleDeleteSaved(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { campaignId } = data as { campaignId: string };

    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const saved = this.campaignStore.load(campaignId);
    if (!saved) return { success: false, error: 'Saved campaign not found' };

    if (saved.creatorUserId !== userId) {
      return { success: false, error: 'Only the campaign creator can delete.' };
    }

    if (this.roomService.get(campaignId)) {
      return { success: false, error: 'Campaign is currently active. Leave it first.' };
    }

    this.campaignStore.delete(campaignId);
    this.aiService.onRoomEmpty(campaignId);
    return { success: true };
  }

  @SubscribeMessage('lobby:resume')
  @UsePipes(new ZodValidationPipe(LobbyResumeSchema))
  async handleResumeCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { campaignId } = data as { campaignId: string };

    const userId = this.authService.getUserId(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    const saved = this.campaignStore.load(campaignId);
    if (!saved) return { success: false, error: 'Saved campaign not found' };

    if (saved.creatorUserId !== userId) {
      return { success: false, error: 'Only the campaign creator can resume.' };
    }

    if (this.roomService.get(campaignId)) {
      const creatorPlayer = this.playerService.findPlayerByUserId(campaignId, userId);
      if (!creatorPlayer) {
        return { success: false, error: 'Character not found in active campaign.' };
      }

      this.authService.registerPlayer(client.id, creatorPlayer.id, creatorPlayer.name, campaignId);
      client.join(campaignId);
      client.emit('player:registered', { playerId: creatorPlayer.id });
      this.playerService.reactivatePlayer(campaignId, creatorPlayer.id);

      const state = this.gameState.getRoom(campaignId);
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
        room: { id: campaignId, name: this.roomService.get(campaignId)!.name },
        playerId: creatorPlayer.id,
        campaignStarted: state?.gameStarted || false,
      };
    }

    this.campaignStore.restoreToMemory(campaignId);

    const restoredState = this.gameState.getRoom(campaignId);
    if (restoredState) {
      restoredState.gameStarted = false;
    }

    const savedCampaign = this.campaignStore.load(campaignId);
    if (!savedCampaign) return { success: false, error: 'Failed to load campaign' };
    const creatorPlayer = savedCampaign.players.find(p => p.userId === userId);
    if (!creatorPlayer) return { success: false, error: 'Creator character not found' };

    this.authService.registerPlayer(client.id, creatorPlayer.id, creatorPlayer.name, savedCampaign.campaignId);
    client.join(savedCampaign.campaignId);
    client.emit('player:registered', { playerId: creatorPlayer.id });

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
  @UsePipes(new ZodValidationPipe(RoomLeaveSchema))
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId } = data as { roomId: string; playerId: string };

    const roomData = this.roomService.get(roomId);
    if (!roomData) return { success: false, error: 'Room not found' };

    this.campaignStore.saveFromMemory(roomId);
    const isCreator = playerId === roomData.creatorId;

    if (isCreator) {
      this.server.to(roomId).emit('game:disband', { reason: 'Campaign ended.' });
      this.aiService.onRoomEmpty(roomId);

      const roomSockets = this.authService.getSocketsByRoomId(roomId);
      for (const sid of roomSockets) {
        this.authService.unregisterPlayer(sid);
      }

      this.gameState.removeRoom(roomId);
      this.roomService.remove(roomId);
      this.server.socketsLeave(roomId);
    } else {
      this.playerService.removePlayer(roomId, playerId);
      this.roomService.leave(roomId, playerId);

      this.authService.unregisterPlayer(client.id);
      client.leave(roomId);

      const state = this.gameState.getRoom(roomId);
      if (state) {
        if (state.players.length === 0) {
      this.aiService.onRoomEmpty(roomId);
          this.gameState.removeRoom(roomId);
          this.roomService.remove(roomId);
        } else {
          this.server.to(roomId).emit('game:state', {
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
