import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { GameService } from './game.service';
import { GameState } from './game.state';
import { TurnManager } from './turn.manager';
import { GameActionDto, UseItemDto } from '../dto/game-action.dto';
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
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameService: GameService,
    private gameState: GameState,
    private turnManager: TurnManager,
    private authService: AuthService,
    private campaignStore: CampaignStore,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const playerConn = this.authService.unregisterPlayer(client.id);
    if (!playerConn) return;

    const { roomId, playerId, characterName } = playerConn;

    this.gameState.disconnectPlayer(roomId, playerId);

    const room = this.gameState.getRoom(roomId);
    if (room) {
      this.server.to(roomId).emit('game:state', this.gameService.getState(roomId));
      this.server.to(roomId).emit('game:message', {
        type: 'system',
        content: `${characterName} disconnected.`,
      });
      this.campaignStore.saveFromMemory(roomId);
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = this.authService.getUserId(client.id);
      if (!userId) return { success: false, error: 'Not authenticated' };

      const existing = this.gameState.findPlayerByUserId(data.roomId, userId);
      if (!existing) {
        return { success: false, error: 'No character found. Create one first.' };
      }

      this.authService.registerPlayer(client.id, existing.id, existing.name, data.roomId);
      client.join(data.roomId);
      client.emit('player:registered', { playerId: existing.id });

      const joinedRoom = this.gameState.getRoom(data.roomId);
      if (joinedRoom) {
        client.emit('game:state', {
          ...this.gameService.getState(data.roomId),
          creatorId: joinedRoom.creatorId,
          history: joinedRoom.history,
        });
      }

      client.to(data.roomId).emit('game:state', this.gameService.getState(data.roomId));
      this.server.to(data.roomId).emit('game:message', {
        type: 'system',
        content: `${existing.name} joined the campaign.`,
      });

      return { success: true, playerId: existing.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:action')
  async handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; message: string },
  ) {
    const actionRoom = this.gameState.getRoom(data.roomId);
    const actionPlayer = actionRoom?.players.find(p => p.id === data.playerId);
    if (actionPlayer) {
      client.to(data.roomId).emit('game:player_action', {
        type: 'action',
        playerId: data.playerId,
        characterName: actionPlayer.name,
        message: data.message,
      });
    }
    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const response = await this.gameService.handleAction(data.roomId, data.playerId, data.message);
      const room = this.gameState.getRoom(data.roomId);

      this.campaignStore.saveFromMemory(data.roomId);

      this.server.to(data.roomId).emit('game:narration', {
        narration: response.narration,
        next: response.next,
        state: this.gameService.getState(data.roomId),
      });

      if (room) {
        this.server.to(data.roomId).emit('game:turn', {
          currentTurn: room.currentTurn,
          type: room.turnType,
          target: room.turnTarget,
        });
      }

      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(data.roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:roll')
  async handleRoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; skill?: string; dc?: number },
  ) {
    const rollRoom = this.gameState.getRoom(data.roomId);
    const rollPlayer = rollRoom?.players.find(p => p.id === data.playerId);
    const skill = data.skill || rollRoom?.turnSkill || 'dexterity';
    const dc = data.dc ?? rollRoom?.turnDc ?? 10;
    const modifier = rollPlayer ? this.gameState.getPlayerModifier(rollPlayer, skill) : 0;
    const roll = this.gameState.rollDice(20);
    const total = roll + modifier;

    this.server.to(data.roomId).emit('game:player_action', {
      type: 'roll',
      playerId: data.playerId,
      characterName: rollPlayer?.name || 'Unknown',
      message: `Rolled ${roll} + modifier(${modifier}) = ${total} (DC ${dc})`,
    });

    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const response = await this.gameService.handleRoll(data.roomId, data.playerId, { roll, modifier, total, skill, dc });
      const room = this.gameState.getRoom(data.roomId);

      this.campaignStore.saveFromMemory(data.roomId);

      this.server.to(data.roomId).emit('game:narration', {
        narration: response.narration,
        next: response.next,
        state: this.gameService.getState(data.roomId),
      });

      if (room) {
        this.server.to(data.roomId).emit('game:turn', {
          currentTurn: room.currentTurn,
          type: room.turnType,
          target: room.turnTarget,
        });
      }

      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(data.roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:start')
  async handleStartCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const room = this.gameState.getRoom(data.roomId);
      if (room) {
        await this.aiProvider.onRoomReady?.(data.roomId, {
          roomId: data.roomId,
          campaignName: room.campaignName,
          campaignTheme: room.campaignTheme,
          language: room.language,
          players: room.players,
          scene: room.scene,
          currentLocation: room.currentLocation,
          history: room.history,
          currentAction: null,
        });
      }

      const response = await this.gameService.startCampaign(data.roomId);

      if (response.narration) {
        this.server.to(data.roomId).emit('game:narration', {
          narration: response.narration,
          next: response.next,
          state: this.gameService.getState(data.roomId),
        });
      } else {
        this.server.to(data.roomId).emit('game:state', {
          ...this.gameService.getState(data.roomId),
          creatorId: room?.creatorId,
          history: room?.history,
        });
      }

      if (room) {
        this.server.to(data.roomId).emit('game:turn', {
          currentTurn: room.currentTurn,
          type: room.turnType,
          target: room.turnTarget,
        });
      }

      this.campaignStore.saveFromMemory(data.roomId);

      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(data.roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; username: string },
  ) {
    if (this.turnManager.isLocked(data.roomId)) return;

    const key = `${data.roomId}:${data.playerId}`;

    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key));
    }

    this.typingTimers.set(key, setTimeout(() => {
      this.server.to(data.roomId).emit('game:typing_stop', { playerId: data.playerId });
      this.typingTimers.delete(key);
    }, 3000));

    client.to(data.roomId).emit('game:typing', {
      playerId: data.playerId,
      username: data.username,
    });
  }

  @SubscribeMessage('game:typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    const key = `${data.roomId}:${data.playerId}`;
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key));
      this.typingTimers.delete(key);
    }
    client.to(data.roomId).emit('game:typing_stop', { playerId: data.playerId });
  }

  @SubscribeMessage('game:allocate_attributes')
  async handleAllocateAttributes(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; allocations: Record<string, number> },
  ) {
    try {
      const result = this.gameService.allocateAttributes(data.roomId, data.playerId, data.allocations);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const room = this.gameState.getRoom(data.roomId);
      if (room) {
        this.server.to(data.roomId).emit('game:state', {
          ...this.gameService.getState(data.roomId),
          creatorId: room.creatorId,
          history: room.history,
        });
      }

      this.campaignStore.saveFromMemory(data.roomId);

      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:equip')
  async handleEquip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; itemId: string; slot: 'body' | 'mainHand' | 'offHand' },
  ) {
    try {
      const result = this.gameState.equipItem(data.roomId, data.playerId, data.itemId, data.slot);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const player = this.gameState.getRoom(data.roomId)?.players.find(p => p.id === data.playerId);
      if (player) {
        player.ac = this.gameState.computeAc(data.roomId, data.playerId);
      }

      const room = this.gameState.getRoom(data.roomId);
      if (room) {
        this.server.to(data.roomId).emit('game:state', {
          ...this.gameService.getState(data.roomId),
          creatorId: room.creatorId,
          history: room.history,
        });
      }

      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:unequip')
  async handleUnequip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; slot: 'body' | 'mainHand' | 'offHand' },
  ) {
    try {
      const result = this.gameState.unequipItem(data.roomId, data.playerId, data.slot);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const player = this.gameState.getRoom(data.roomId)?.players.find(p => p.id === data.playerId);
      if (player) {
        player.ac = this.gameState.computeAc(data.roomId, data.playerId);
      }

      const room = this.gameState.getRoom(data.roomId);
      if (room) {
        this.server.to(data.roomId).emit('game:state', {
          ...this.gameService.getState(data.roomId),
          creatorId: room.creatorId,
          history: room.history,
        });
      }

      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:use_item')
  async handleUseItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UseItemDto,
  ) {
    try {
      const room = this.gameState.getRoom(data.roomId);
      const player = room?.players.find(p => p.id === data.playerId);
      if (!player) {
        client.emit('game:error', { message: 'Player not found' });
        return { success: false, error: 'Player not found' };
      }

      const item = player.inventory.find(i => i.id === data.itemId);
      if (!item) {
        client.emit('game:error', { message: 'Item not found' });
        return { success: false, error: 'Item not found' };
      }

      const itemName = item.name;

      const result = this.gameState.useItem(data.roomId, data.playerId, data.itemId);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const msg = result.healed && result.healed > 0
        ? `Used ${itemName} and healed ${result.healed} HP!`
        : `Used ${itemName}.`;

      this.server.to(data.roomId).emit('game:player_action', {
        type: 'action',
        playerId: data.playerId,
        characterName: player.name,
        message: msg,
      });

      player.ac = this.gameState.computeAc(data.roomId, data.playerId);

      const currentRoom = this.gameState.getRoom(data.roomId);
      if (currentRoom) {
        this.server.to(data.roomId).emit('game:state', {
          ...this.gameService.getState(data.roomId),
          creatorId: currentRoom.creatorId,
          history: currentRoom.history,
        });
      }

      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:get_state')
  handleGetState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const room = this.gameState.getRoom(data.roomId);
    if (!room) return { error: 'Room not found' };
    return {
      ...this.gameService.getState(data.roomId),
      creatorId: room.creatorId,
      history: room.history,
    };
  }
}
