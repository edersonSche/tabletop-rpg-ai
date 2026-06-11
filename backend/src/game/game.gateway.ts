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
import { GameActionDto } from '../dto/game-action.dto';
import { AIProvider } from '../ai/ai.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private playerSockets: Map<string, { socketId: string; playerId: string; roomId: string; username: string }> = new Map();
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameService: GameService,
    private gameState: GameState,
    private turnManager: TurnManager,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

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

        this.server.to(roomId).emit('game:state', this.gameService.getState(roomId));
        this.server.to(roomId).emit('game:message', {
          type: 'system',
          content: `${username} left the campaign.`,
        });
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerName: string },
  ) {
    try {
      const player = this.gameState.addPlayer(data.roomId, data.playerName);
      const room = this.gameState.getRoom(data.roomId);

      if (room && room.players.length === 1) {
        await this.aiProvider.onRoomReady?.(data.roomId);
      }

      client.join(data.roomId);

      const key = `${data.roomId}:${player.id}`;
      this.playerSockets.set(key, {
        socketId: client.id,
        playerId: player.id,
        roomId: data.roomId,
        username: data.playerName,
      });

      client.emit('player:registered', { playerId: player.id });

      this.server.to(data.roomId).emit('game:state', this.gameService.getState(data.roomId));
      this.server.to(data.roomId).emit('game:message', {
        type: 'system',
        content: `${data.playerName} joined the campaign.`,
      });

      return { success: true, playerId: player.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:action')
  async handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; message: string },
  ) {
    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const response = await this.gameService.handleAction(data.roomId, data.playerId, data.message);
      const room = this.gameState.getRoom(data.roomId);

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
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const response = await this.gameService.handleRoll(data.roomId, data.playerId);
      const room = this.gameState.getRoom(data.roomId);

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
      const response = await this.gameService.startCampaign(data.roomId);
      const room = this.gameState.getRoom(data.roomId);

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

  @SubscribeMessage('game:get_state')
  handleGetState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    return this.gameService.getState(data.roomId) || { error: 'Room not found' };
  }
}
