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
import { GameState, TickResult } from './game.state';
import { PlayerService } from './player.service';
import { MerchantService } from './merchant.service';
import { TradeService } from './trade.service';
import { ConditionEngine } from './condition.engine';
import { DiceService } from './dice.service';
import { TurnManager } from './turn.manager';
import { GameActionDto, UseItemDto, InitiateTradeDto, BuyItemDto, SellItemDto, EndTradeDto, UseAntidoteDto } from '../dto/game-action.dto';
import { AIResponse } from '../dto/ai-response.dto';
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
    private playerService: PlayerService,
    private merchantService: MerchantService,
    private tradeService: TradeService,
    private conditionEngine: ConditionEngine,
    private diceService: DiceService,
    private turnManager: TurnManager,
    private authService: AuthService,
    private campaignStore: CampaignStore,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  // ─── Emission Helpers ───────────────────────────────────────────────

  private emitGameState(roomId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;
    this.server.to(roomId).emit('game:state', {
      ...this.gameService.getState(roomId),
      creatorId: room.creatorId,
      history: room.history,
    });
  }

  private emitNarration(roomId: string, response: AIResponse, tickResults: TickResult[]): void {
    this.server.to(roomId).emit('game:narration', {
      narration: response.narration,
      next: response.next,
      state: this.gameService.getState(roomId),
    });

    const room = this.gameState.getRoom(roomId);
    if (!room) return;

    this.server.to(roomId).emit('game:turn', {
      currentTurn: room.currentTurn,
      type: room.turnType,
      target: room.turnTarget,
    });

    if (tickResults.length > 0) {
      this.server.to(roomId).emit('game:condition_tick', {
        players: room.players.filter(p => p.active).map(p => ({
          id: p.id,
          hp: p.hp,
          maxHp: p.maxHp,
          ac: p.ac,
          activeConditions: p.activeConditions,
          tickResult: tickResults.find(t => t.playerId === p.id) || {
            playerName: p.name, hpChange: 0, conditionsExpired: [], dotDetails: [],
          },
        })),
      });
    }
  }

  private emitTradeStateToAll(roomId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room || !room.merchants) return;

    const roomSockets = this.authService.getSocketsByRoomId(roomId);
    for (const sid of roomSockets) {
      const conn = this.authService.getPlayerBySocket(sid);
      if (!conn) continue;
      const player = room.players.find(p => p.id === conn.playerId);
      if (!player) continue;

      const chaMod = Math.floor((player.attributes.charisma - 10) / 2);
      this.server.to(sid).emit('game:trade_state', {
        locked: true,
        merchants: this.merchantService.adjustMerchantPrices(room.merchants!, chaMod),
        tradeParticipants: room.tradeParticipants,
        tradeDone: room.tradeDone,
      });
    }
  }

  // ─── Connection Lifecycle ───────────────────────────────────────────

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const playerConn = this.authService.unregisterPlayer(client.id);
    if (!playerConn) return;

    const { roomId, playerId, characterName } = playerConn;

    this.playerService.disconnectPlayer(roomId, playerId);

    const room = this.gameState.getRoom(roomId);
    if (room) {
      if (room.isTradeLocked) {
        const shouldUnlock = this.tradeService.removeFromTrade(roomId, playerId);
        if (shouldUnlock) {
          this.server.to(roomId).emit('game:trade_state', { locked: false });
        }
      }

      this.emitGameState(roomId);
      this.server.to(roomId).emit('game:message', {
        type: 'system',
        content: `${characterName} disconnected.`,
      });
      this.campaignStore.saveFromMemory(roomId);
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  // ─── Message Handlers ───────────────────────────────────────────────

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = this.authService.getUserId(client.id);
      if (!userId) return { success: false, error: 'Not authenticated' };

      const existing = this.playerService.findPlayerByUserId(data.roomId, userId);
      if (!existing) {
        return { success: false, error: 'No character found. Create one first.' };
      }

      this.authService.registerPlayer(client.id, existing.id, existing.name, data.roomId);
      client.join(data.roomId);
      client.emit('player:registered', { playerId: existing.id });

      this.emitGameState(data.roomId);

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
      const { response, tickResults } = await this.gameService.handleAction(data.roomId, data.playerId, data.message);
      this.campaignStore.saveFromMemory(data.roomId);
      this.emitNarration(data.roomId, response, tickResults);
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
    const modifier = rollPlayer ? this.conditionEngine.getPlayerModifier(rollPlayer, skill) : 0;
    const roll = this.diceService.rollDice(20);
    const total = roll + modifier;

    this.server.to(data.roomId).emit('game:player_action', {
      type: 'roll',
      playerId: data.playerId,
      characterName: rollPlayer?.name || 'Unknown',
      message: `Rolled ${roll} + modifier(${modifier}) = ${total} (DC ${dc})`,
    });

    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const { response, tickResults } = await this.gameService.handleRoll(data.roomId, data.playerId, { roll, modifier, total, skill, dc });
      this.campaignStore.saveFromMemory(data.roomId);
      this.emitNarration(data.roomId, response, tickResults);
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

      const { response, tickResults } = await this.gameService.startCampaign(data.roomId);

      if (response.narration) {
        this.emitNarration(data.roomId, response, tickResults);
      } else {
        this.emitGameState(data.roomId);
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

      this.emitGameState(data.roomId);
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
      const result = this.playerService.equipItem(data.roomId, data.playerId, data.itemId, data.slot);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      this.emitGameState(data.roomId);
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
      const result = this.playerService.unequipItem(data.roomId, data.playerId, data.slot);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      this.emitGameState(data.roomId);
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

      const result = this.playerService.useItem(data.roomId, data.playerId, data.itemId);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      if (player) {
        const parts: string[] = [`Used ${itemName}.`];
        if (result.hpChange > 0) {
          parts.push(`Healed ${result.hpChange} HP!`);
        } else if (result.hpChange < 0) {
          parts.push(`Took ${Math.abs(result.hpChange)} damage.`);
        }
        for (const ac of result.appliedConditions) {
          parts.push(`Applied ${ac.name} (${ac.duration} turn${ac.duration !== 1 ? 's' : ''}).`);
        }

        this.server.to(data.roomId).emit('game:player_action', {
          type: 'action',
          playerId: data.playerId,
          characterName: player.name,
          message: parts.join(' '),
        });
      }

      this.emitGameState(data.roomId);
      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:use_antidote')
  async handleUseAntidote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UseAntidoteDto,
  ) {
    try {
      const player = this.playerService.findPlayerByUserId(data.roomId, client.data.userId);
      if (!player) {
        client.emit('game:error', { message: 'Player not found' });
        return { success: false, error: 'Player not found' };
      }

      const item = player.inventory.find(i => i.id === data.itemId);
      if (!item) {
        client.emit('game:error', { message: 'Item not found in inventory' });
        return { success: false, error: 'Item not found' };
      }

      const result = this.playerService.useAntidote(player, item, data.targetConditionName);

      if (result.success) {
        this.playerService.removeItem(data.roomId, player.id, data.itemId);
        this.emitGameState(data.roomId);
        client.emit('game:antidote_result', result);
        this.server.to(data.roomId).emit('game:player_action', {
          type: 'action',
          playerId: player.id,
          characterName: player.name,
          message: `used ${item.name}`,
        });
        this.campaignStore.saveFromMemory(data.roomId);
      } else {
        client.emit('game:error', { message: result.error });
      }

      return { success: result.success };
    } catch (err) {
      client.emit('game:error', { message: err.message });
      return { success: false, error: err.message };
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

  @SubscribeMessage('game:initiate_trade')
  async handleInitiateTrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: InitiateTradeDto,
  ) {
    const room = this.gameState.getRoom(data.roomId);

    if (room && room.merchants && room.merchants.length > 0 && room.merchantsLocation == room.currentLocation) {
      this.tradeService.lockTrade(data.roomId);
      this.emitTradeStateToAll(data.roomId);
      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    }

    if (!room || isUnknownLocation(room.currentLocation)) {
      client.emit('game:message', {
        type: 'system',
        content: "You don't know where you are. There are no merchants here.",
      });
      return { success: true };
    }

    this.server.to(data.roomId).emit('game:processing', { processing: true });
    try {
      const response = await this.gameService.initiateTrade(data.roomId, data.playerId);
      const updatedRoom = this.gameState.getRoom(data.roomId);

      if (response.narration) {
        this.server.to(data.roomId).emit('game:narration', {
          narration: response.narration,
          next: response.next,
          state: this.gameService.getState(data.roomId),
        });
      }

      if (updatedRoom && updatedRoom.merchants && updatedRoom.merchants.length > 0) {
        this.tradeService.lockTrade(data.roomId);
        this.emitTradeStateToAll(data.roomId);
      } else {
        client.emit('game:message', {
          type: 'system',
          content: 'No merchants available at this location.',
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

  @SubscribeMessage('game:buy_item')
  async handleBuyItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: BuyItemDto,
  ) {
    try {
      const result = this.merchantService.buyFromMerchant(
        data.roomId, data.playerId, data.merchantId,
        data.merchantItemId, data.quantity || 1,
      );

      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const room = this.gameState.getRoom(data.roomId);
      if (room && room.merchants) {
        this.emitTradeStateToAll(data.roomId);
        this.emitGameState(data.roomId);
      }

      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:sell_item')
  async handleSellItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SellItemDto,
  ) {
    try {
      const result = this.merchantService.sellToMerchant(
        data.roomId, data.playerId, data.merchantId,
        data.itemId, data.quantity || 1,
      );

      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const room = this.gameState.getRoom(data.roomId);
      if (room && room.merchants) {
        this.emitTradeStateToAll(data.roomId);
        this.emitGameState(data.roomId);
      }

      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:end_trade')
  async handleEndTrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EndTradeDto,
  ) {
    try {
      const allDone = this.tradeService.markDone(data.roomId, data.playerId);

      if (allDone) {
        this.tradeService.unlockTrade(data.roomId);
        this.server.to(data.roomId).emit('game:trade_state', { locked: false });

        const room = this.gameState.getRoom(data.roomId);
        if (room?.merchants) {
          this.server.to(data.roomId).emit('game:narration', {
            narration: 'The party finishes their business with the local merchants.',
            next: { type: 'group_action' },
            state: this.gameService.getState(data.roomId),
          });
        }
      } else {
        this.emitTradeStateToAll(data.roomId);
      }

      this.campaignStore.saveFromMemory(data.roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
}

function isUnknownLocation(location: string | null | undefined): boolean {
  if (!location) return true;
  const normalized = location.toLowerCase().trim();
  return normalized === 'unknown location' || normalized === 'local desconhecido';
}
