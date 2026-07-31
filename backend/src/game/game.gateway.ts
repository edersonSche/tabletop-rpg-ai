import { UseGuards, UsePipes } from '@nestjs/common';
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
import { GameService } from './game.service';
import { TickResult } from './game.state';
import { PlayerService } from './player.service';
import { MerchantService } from './merchant.service';
import { TradeService } from './trade.service';
import { ConditionEngine } from './condition.engine';
import { DiceService } from './dice.service';
import { TurnManager } from './turn.manager';
import { AIResponse } from '../dto/ai-response.dto';
import { AiService } from '../ai/ai.service';
import { AuthService } from '../auth/auth.service';
import { AuthWsGuard } from '../auth/auth.guard';
import { CampaignStore } from '../campaign/campaign.store';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import {
  RoomJoinSchema,
  GameActionSchema,
  GameRollSchema,
  GameStartSchema,
  GameTypingSchema,
  GameTypingStopSchema,
  AllocateAttributesSchema,
  EquipItemSchema,
  UnequipItemSchema,
  UseItemSchema,
  UseAntidoteSchema,
  GameStateSchema,
  InitiateTradeSchema,
  BuyItemSchema,
  SellItemSchema,
  EndTradeSchema,
} from '../dto/schemas';

@WebSocketGateway()
@UseGuards(AuthWsGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameService: GameService,
    private playerService: PlayerService,
    private merchantService: MerchantService,
    private tradeService: TradeService,
    private conditionEngine: ConditionEngine,
    private diceService: DiceService,
    private turnManager: TurnManager,
    private authService: AuthService,
    private campaignStore: CampaignStore,
    private aiService: AiService,
  ) {}

  // ─── Emission Helpers ───────────────────────────────────────────────

  private emitGameState(roomId: string): void {
    const state = this.gameService.getState(roomId);
    if (!state) return;
    this.server.to(roomId).emit('game:state', state);
  }

  private emitNarrationText(roomId: string, narration: string, next: AIResponse['next']): void {
    this.server.to(roomId).emit('game:narration', {
      narration,
      next,
      state: this.gameService.getState(roomId),
    });
  }

  private emitTradeUnlock(roomId: string): void {
    this.server.to(roomId).emit('game:trade_state', { locked: false });
  }

  private emitNarration(roomId: string, response: AIResponse, tickResults: TickResult[]): void {
    this.server.to(roomId).emit('game:narration', {
      narration: response.narration,
      next: response.next,
      state: this.gameService.getState(roomId),
    });

    const room = this.gameService.getRoomContext(roomId);
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
    const tradeData = this.gameService.getTradeEmitData(roomId);
    if (!tradeData) return;

    const roomSockets = this.authService.getSocketsByRoomId(roomId);
    for (const sid of roomSockets) {
      const conn = this.authService.getPlayerBySocket(sid);
      if (!conn) continue;
      const playerData = tradeData.players.find(p => p.playerId === conn.playerId);
      if (!playerData) continue;

      this.server.to(sid).emit('game:trade_state', {
        locked: true,
        merchants: this.merchantService.adjustMerchantPrices(tradeData.merchants, playerData.chaMod),
        tradeParticipants: tradeData.tradeParticipants,
        tradeDone: tradeData.tradeDone,
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

    if (this.gameService.isTradeLocked(roomId)) {
      const shouldUnlock = this.tradeService.removeFromTrade(roomId, playerId);
      if (shouldUnlock) {
        this.emitTradeUnlock(roomId);
      }
    }

    this.emitGameState(roomId);
    this.server.to(roomId).emit('game:message', {
      type: 'system',
      content: `${characterName} disconnected.`,
    });
    this.campaignStore.saveFromMemory(roomId);

    console.log(`Client disconnected: ${client.id}`);
  }

  // ─── Message Handlers ───────────────────────────────────────────────

  @SubscribeMessage('room:join')
  @UsePipes(new ZodValidationPipe(RoomJoinSchema))
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId } = data as { roomId: string };
    try {
      const userId = this.authService.getUserId(client.id);
      if (!userId) return { success: false, error: 'Not authenticated' };

      const existing = this.playerService.findPlayerByUserId(roomId, userId);
      if (!existing) {
        return { success: false, error: 'No character found. Create one first.' };
      }

      this.authService.registerPlayer(client.id, existing.id, existing.name, roomId);
      client.join(roomId);
      client.emit('player:registered', { playerId: existing.id });

      this.emitGameState(roomId);

      this.server.to(roomId).emit('game:message', {
        type: 'system',
        content: `${existing.name} joined the campaign.`,
      });

      return { success: true, playerId: existing.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:action')
  @UsePipes(new ZodValidationPipe(GameActionSchema))
  async handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, message } = data as { roomId: string; playerId: string; message: string };

    const actionPlayer = this.gameService.findPlayer(roomId, playerId);
    if (actionPlayer) {
      client.to(roomId).emit('game:player_action', {
        type: 'action',
        playerId,
        characterName: actionPlayer.name,
        message,
      });
    }
    this.server.to(roomId).emit('game:processing', { processing: true });
    try {
      const { response, tickResults } = await this.gameService.handleAction(roomId, playerId, message);
      this.campaignStore.saveFromMemory(roomId);
      this.emitNarration(roomId, response, tickResults);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:roll')
  @UsePipes(new ZodValidationPipe(GameRollSchema))
  async handleRoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, skill: reqSkill, dc: reqDc } = data as {
      roomId: string;
      playerId: string;
      skill?: string;
      dc?: number;
    };

    const rollPlayer = this.gameService.findPlayer(roomId, playerId);
    const turnCtx = this.gameService.getTurnContext(roomId);
    const skill = reqSkill || turnCtx?.turnSkill || 'dexterity';
    const dc = reqDc ?? turnCtx?.turnDc ?? 10;
    const modifier = rollPlayer ? this.conditionEngine.getPlayerModifier(rollPlayer, skill) : 0;
    const roll = this.diceService.rollDice(20);
    const total = roll + modifier;

    this.server.to(roomId).emit('game:player_action', {
      type: 'roll',
      playerId,
      characterName: rollPlayer?.name || 'Unknown',
      message: `Rolled ${roll} + modifier(${modifier}) = ${total} (DC ${dc})`,
    });

    this.server.to(roomId).emit('game:processing', { processing: true });
    try {
      const { response, tickResults } = await this.gameService.handleRoll(roomId, playerId, { roll, modifier, total, skill, dc });
      this.campaignStore.saveFromMemory(roomId);
      this.emitNarration(roomId, response, tickResults);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:start')
  @UsePipes(new ZodValidationPipe(GameStartSchema))
  async handleStartCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId } = data as { roomId: string };

    this.server.to(roomId).emit('game:processing', { processing: true });
    try {
      const aiCtx = this.gameService.getRoomAiContext(roomId);
      if (aiCtx) {
        await this.aiService.onRoomReady(roomId, {
          ...aiCtx,
          gamePhase: 'group_action',
          currentAction: null,
        });
      }

      const { response, tickResults } = await this.gameService.startCampaign(roomId);

      if (response.narration) {
        this.emitNarration(roomId, response, tickResults);
      } else {
        this.emitGameState(roomId);
      }

      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:typing')
  @UsePipes(new ZodValidationPipe(GameTypingSchema))
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, username } = data as { roomId: string; playerId: string; username: string };

    if (this.turnManager.isLocked(roomId)) return;

    const key = `${roomId}:${playerId}`;
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key));
    }

    this.typingTimers.set(key, setTimeout(() => {
      this.server.to(roomId).emit('game:typing_stop', { playerId });
      this.typingTimers.delete(key);
    }, 3000));

    client.to(roomId).emit('game:typing', {
      playerId,
      username,
    });
  }

  @SubscribeMessage('game:typing_stop')
  @UsePipes(new ZodValidationPipe(GameTypingStopSchema))
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId } = data as { roomId: string; playerId: string };

    const key = `${roomId}:${playerId}`;
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key));
      this.typingTimers.delete(key);
    }
    client.to(roomId).emit('game:typing_stop', { playerId });
  }

  @SubscribeMessage('game:allocate_attributes')
  @UsePipes(new ZodValidationPipe(AllocateAttributesSchema))
  async handleAllocateAttributes(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, allocations } = data as {
      roomId: string;
      playerId: string;
      allocations: Record<string, number>;
    };

    try {
      const result = this.gameService.allocateAttributes(roomId, playerId, allocations);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      this.emitGameState(roomId);
      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:equip')
  @UsePipes(new ZodValidationPipe(EquipItemSchema))
  async handleEquip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, itemId, slot } = data as {
      roomId: string;
      playerId: string;
      itemId: string;
      slot: 'body' | 'mainHand' | 'offHand';
    };

    try {
      const result = this.playerService.equipItem(roomId, playerId, itemId, slot);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      this.emitGameState(roomId);
      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:unequip')
  @UsePipes(new ZodValidationPipe(UnequipItemSchema))
  async handleUnequip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, slot } = data as {
      roomId: string;
      playerId: string;
      slot: 'body' | 'mainHand' | 'offHand';
    };

    try {
      const result = this.playerService.unequipItem(roomId, playerId, slot);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      this.emitGameState(roomId);
      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:use_item')
  @UsePipes(new ZodValidationPipe(UseItemSchema))
  async handleUseItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, itemId } = data as { roomId: string; playerId: string; itemId: string };

    try {
      const found = this.gameService.findPlayerWithItem(roomId, playerId, itemId);
      if (!found) {
        client.emit('game:error', { message: 'Player or item not found' });
        return { success: false, error: 'Player or item not found' };
      }
      const { player, item } = found;
      const itemName = item.name;

      const result = this.playerService.useItem(roomId, playerId, itemId);
      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      const parts: string[] = [`Used ${itemName}.`];
      if (result.hpChange > 0) {
        parts.push(`Healed ${result.hpChange} HP!`);
      } else if (result.hpChange < 0) {
        parts.push(`Took ${Math.abs(result.hpChange)} damage.`);
      }
      for (const ac of result.appliedConditions) {
        parts.push(`Applied ${ac.name} (${ac.duration} turn${ac.duration !== 1 ? 's' : ''}).`);
      }

      this.server.to(roomId).emit('game:player_action', {
        type: 'action',
        playerId,
        characterName: player.name,
        message: parts.join(' '),
      });

      this.emitGameState(roomId);
      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:use_antidote')
  @UsePipes(new ZodValidationPipe(UseAntidoteSchema))
  async handleUseAntidote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, itemId, targetConditionName } = data as {
      roomId: string;
      playerId: string;
      itemId: string;
      targetConditionName?: string;
    };

    try {
      const found = this.gameService.findPlayerWithItem(roomId, playerId, itemId);
      if (!found) {
        client.emit('game:error', { message: 'Player or item not found' });
        return { success: false, error: 'Player or item not found' };
      }
      const { player, item } = found;

      const result = this.playerService.useAntidote(player, item, targetConditionName);

      if (result.success) {
        this.playerService.removeItem(roomId, player.id, itemId);
        this.emitGameState(roomId);
        client.emit('game:antidote_result', result);
        this.server.to(roomId).emit('game:player_action', {
          type: 'action',
          playerId: player.id,
          characterName: player.name,
          message: `used ${item.name}`,
        });
        this.campaignStore.saveFromMemory(roomId);
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
  @UsePipes(new ZodValidationPipe(GameStateSchema))
  handleGetState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId } = data as { roomId: string };

    const room = this.gameService.getRoomContext(roomId);
    if (!room) return { error: 'Room not found' };
    return this.gameService.getState(roomId);
  }

  @SubscribeMessage('game:initiate_trade')
  @UsePipes(new ZodValidationPipe(InitiateTradeSchema))
  async handleInitiateTrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId } = data as { roomId: string; playerId: string };

    this.server.to(roomId).emit('game:processing', { processing: true });
    try {
      const response = await this.gameService.initiateTrade(roomId, playerId);

      if (response.narration) {
        this.emitNarrationText(roomId, response.narration, response.next);
      }

      if (response.merchantsReady) {
        this.emitTradeStateToAll(roomId);
      } else if (!response.narration) {
        client.emit('game:message', {
          type: 'system',
          content: 'No merchants available at this location.',
        });
      }

      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    } finally {
      this.server.to(roomId).emit('game:processing', { processing: false });
    }
  }

  @SubscribeMessage('game:buy_item')
  @UsePipes(new ZodValidationPipe(BuyItemSchema))
  async handleBuyItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, merchantId, merchantItemId, quantity } = data as {
      roomId: string;
      playerId: string;
      merchantId: string;
      merchantItemId: string;
      quantity: number;
    };

    try {
      if (this.turnManager.isLocked(roomId)) {
        client.emit('game:error', { message: 'AI is processing an action...' });
        return { success: false, error: 'AI is processing an action...' };
      }

      const result = this.merchantService.buyFromMerchant(
        roomId, playerId, merchantId,
        merchantItemId, quantity,
      );

      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      if (this.gameService.hasMerchants(roomId)) {
        this.emitTradeStateToAll(roomId);
        this.emitGameState(roomId);
      }

      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:sell_item')
  @UsePipes(new ZodValidationPipe(SellItemSchema))
  async handleSellItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId, merchantId, itemId, quantity } = data as {
      roomId: string;
      playerId: string;
      merchantId: string;
      itemId: string;
      quantity: number;
    };

    try {
      if (this.turnManager.isLocked(roomId)) {
        client.emit('game:error', { message: 'AI is processing an action...' });
        return { success: false, error: 'AI is processing an action...' };
      }

      const result = this.merchantService.sellToMerchant(
        roomId, playerId, merchantId,
        itemId, quantity,
      );

      if (!result.success) {
        client.emit('game:error', { message: result.error });
        return { success: false, error: result.error };
      }

      if (this.gameService.hasMerchants(roomId)) {
        this.emitTradeStateToAll(roomId);
        this.emitGameState(roomId);
      }

      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:end_trade')
  @UsePipes(new ZodValidationPipe(EndTradeSchema))
  async handleEndTrade(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { roomId, playerId } = data as { roomId: string; playerId: string };

    try {
      if (this.turnManager.isLocked(roomId)) {
        client.emit('game:error', { message: 'AI is processing an action...' });
        return { success: false, error: 'AI is processing an action...' };
      }

      if (!this.gameService.isTradeLocked(roomId)) {
        return { success: true };
      }

      if (!this.turnManager.acquire(roomId, playerId)) {
        client.emit('game:error', { message: 'AI is processing an action...' });
        return { success: false, error: 'AI is processing an action...' };
      }

      let allDone = false;
      try {
        allDone = this.tradeService.markDone(roomId, playerId);

        if (allDone) {
          this.tradeService.unlockTrade(roomId);
          this.emitTradeUnlock(roomId);
        }
      } finally {
        this.turnManager.release(roomId, playerId);
      }

      if (allDone) {
        if (this.gameService.hasMerchants(roomId)) {
          this.emitNarrationText(roomId, 'The party finishes their business with the local merchants.', { type: 'group_action' });
        }
      } else {
        this.emitTradeStateToAll(roomId);
      }

      this.campaignStore.saveFromMemory(roomId);
      return { success: true };
    } catch (error) {
      client.emit('game:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
}
