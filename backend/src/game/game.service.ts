import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, Player, Merchant, MerchantItem, InventoryItem, TickResult, GameStateData, Condition, Effect } from './game.state';
import { ConditionEngine } from './condition.engine';
import { DiceService } from './dice.service';
import { LevelingService } from './leveling.service';
import { TurnManager } from './turn.manager';
import { AiService } from '../ai/ai.service';
import { isUnknownLocation } from '../utils/is-unknown-location';
import { TradeService } from './trade.service';
import { AIResponse, MerchantSeed, ConditionSeed, TradeInitResult } from '../dto/ai-response.dto';
import { GamePhase } from '../ai/ai.interface';

@Injectable()
export class GameService {
  constructor(
    private gameState: GameState,
    private conditionEngine: ConditionEngine,
    private diceService: DiceService,
    private levelingService: LevelingService,
    private turnManager: TurnManager,
    private aiService: AiService,
    private tradeService: TradeService,
  ) {}

  async handleAction(roomId: string, playerId: string, message: string): Promise<{ response: AIResponse; tickResults: TickResult[] }> {
    return this.processTurn(roomId, playerId, (player) => {
      this.gameState.addHistory(roomId, {
        role: 'player',
        playerId,
        content: message,
      });
      return { playerId, characterName: player?.name, action: message };
    });
  }

  async handleRoll(roomId: string, playerId: string, rollData?: { roll: number; modifier: number; total: number; skill: string; dc: number }): Promise<{ response: AIResponse; tickResults: TickResult[] }> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const skill = rollData?.skill ?? room.turnSkill ?? 'dexterity';
    const dc = rollData?.dc ?? room.turnDc ?? 10;
    const modifier = rollData?.modifier ?? this.conditionEngine.getPlayerModifier(player, skill);
    const roll = rollData?.roll ?? this.diceService.rollDice(20);
    const total = rollData?.total ?? roll + modifier;

    return this.processTurn(roomId, playerId, () => ({
      playerId,
      characterName: player.name,
      action: `Rolled ${roll} + modifier(${modifier}) = ${total} (DC ${dc})`,
      rollResult: total,
      skill,
      dc,
    }));
  }

  private async processTurn(
    roomId: string,
    playerId: string,
    buildAction: (player: Player | undefined) => object | null,
  ): Promise<{ response: AIResponse; tickResults: TickResult[] }> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const check = this.turnManager.canPlayerAct(roomId, playerId);
    if (!check.allowed) throw new Error(check.reason);

    if (!this.turnManager.acquire(roomId, playerId)) {
      throw new Error('AI is processing an action...');
    }

    const player = room.players.find(p => p.id === playerId);

    try {
      const currentAction = buildAction(player);

      const gamePhase: GamePhase = room.turnType === 'call_player' ? 'call_player'
        : room.turnType === 'call_roll' ? 'call_roll'
        : 'group_action';

      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignTheme: room.campaignTheme,
        language: room.language,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
          activeConditions: p.activeConditions,
          attributes: p.attributes,
          hp: p.hp,
          maxHp: p.maxHp,
        })),
        gamePhase,
        currentLocation: room.currentLocation,
        history: room.history,
        summary: room.summary,
        currentAction: currentAction as any,
      });

      const tickResults = this.processAiResponse(roomId, response);

      return { response, tickResults };
    } finally {
      this.turnManager.release(roomId, playerId);
    }
  }

  async startCampaign(roomId: string): Promise<{ response: AIResponse; tickResults: TickResult[] }> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (room.history.length > 0) {
      room.gameStarted = true;
      return {
        response: {
          narration: '',
          summary: room.summary,
          next: {
            type: room.turnType || 'group_action',
            target: room.turnTarget || undefined,
          },
        },
        tickResults: [],
      };
    }

    if (!this.turnManager.acquire(roomId, 'start')) {
      throw new Error('AI is processing an action...');
    }

    try {
      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignTheme: room.campaignTheme,
        language: room.language,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
          activeConditions: p.activeConditions,
          attributes: p.attributes,
          hp: p.hp,
          maxHp: p.maxHp,
        })),
        gamePhase: 'group_action',
        currentLocation: room.currentLocation,
        history: room.history,
        summary: room.summary || 'The adventure is about to begin.',
        currentAction: null,
      });

      room.gameStarted = true;

      const tickResults = this.processAiResponse(roomId, response);

      return { response, tickResults };
    } finally {
      this.turnManager.release(roomId, 'start');
    }
  }

  async initiateTrade(roomId: string, playerId: string): Promise<TradeInitResult> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const check = this.turnManager.canInitiateTrade(roomId, playerId);
    if (!check.allowed) throw new Error(check.reason);

    if (!this.turnManager.acquire(roomId, playerId)) {
      throw new Error('AI is processing an action...');
    }

    try {
      if (room.merchants && room.merchantsLocation == room.currentLocation) {
        this.tradeService.lockTrade(roomId);
        return {
          narration: '',
          summary: room.summary,
          next: { type: 'group_action' },
          merchantsReady: true,
        };
      }

      if (!room.currentLocation || isUnknownLocation(room.currentLocation)) {
        return {
          narration: '',
          summary: room.summary,
          next: { type: 'group_action' },
          merchantsReady: false,
        };
      }

      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignTheme: room.campaignTheme,
        language: room.language,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
          attributes: p.attributes,
          hp: p.hp,
          maxHp: p.maxHp,
        })),
        gamePhase: 'trade',
        currentLocation: room.currentLocation,
        history: room.history,
        summary: room.summary,
        currentAction: {
          playerId,
          characterName: player.name,
          action: 'initiate_trade',
        },
      });

      const merchantsReady = !!(response.merchants && response.merchants.length > 0);

      if (merchantsReady && response.merchants) {
        const merchants = response.merchants.map((seed: MerchantSeed) => this.seedToMerchant(seed));
        room.merchants = merchants;
        room.merchantsLocation = room.currentLocation ?? undefined;
      }

      if (response.narration) {
        this.gameState.addHistory(roomId, {
          role: 'assistant',
          content: response.narration,
        });
        room.summary = response.summary || room.summary;
      }

      if (merchantsReady) {
        this.tradeService.lockTrade(roomId);
      }

      return { ...response, merchantsReady };
    } finally {
      this.turnManager.release(roomId, playerId);
    }
  }

  private seedToMerchant(seed: MerchantSeed): Merchant {
    return {
      id: uuid(),
      name: seed.name,
      type: seed.type || 'general_goods',
      greeting: seed.greeting || '',
      coins: seed.coins || 50,
      inventory: (seed.items || []).map(item => ({
        id: uuid(),
        name: item.name,
        description: item.description || '',
        type: item.type as MerchantItem['type'],
        slot: item.slot as MerchantItem['slot'],
        effects: item.effects ? item.effects.map(e => ({
          type: e.type,
          duration: e.duration,
          statModifiers: e.stat ? [{ target: e.stat as any, value: e.statValue ?? 0, operation: (e.statOperation as 'add' | 'override') ?? 'add', dexCap: e.dexCap }] : undefined,
          hpChange: e.hpFormula ? { formula: e.hpFormula, type: e.hpType ?? 'heal' } : undefined,
          origin: 'item',
        })) : [],
        buyPrice: item.baseBuyPrice,
        sellPrice: item.baseSellPrice,
        quantity: item.quantity,
        antidoteFor: item.antidoteFor,
      })),
    };
  }

  private processAiResponse(roomId: string, response: AIResponse): TickResult[] {
    const room = this.gameState.getRoom(roomId);
    if (!room) return [];

    this.validateAiResponseTarget(response, room.players);

    if (response.conditions && response.conditions.length > 0) {
      this.processConditions(room, response.conditions);
    }

    if (response.location) {
      room.currentLocation = response.location;
      room.merchants = undefined;
      room.merchantsLocation = undefined;
    }

    this.turnManager.processTurn(roomId, room, response);

    if (response.narration) {
      this.gameState.addHistory(roomId, {
        role: 'assistant',
        content: response.narration,
      });
    }

    room.summary = response.summary || room.summary;

    const tickResults = this.conditionEngine.tickEffects(room);
    return tickResults;
  }

  private validateAiResponseTarget(response: AIResponse, players: Player[]): void {
    if (response.next?.type === 'call_player' || response.next?.type === 'call_roll') {
      if (!response.next.target) {
        console.warn(`AI returned ${response.next.type} with no target. Coercing to group_action.`);
        response.next.type = 'group_action';
        response.next.target = undefined;
      } else {
        const targetPlayer = players.find(p => p.id === response.next.target);
        if (!targetPlayer) {
          const availableIds = players.map(p => `${p.name}:${p.id}`).join(', ');
          console.warn(`AI returned invalid target "${response.next.target}" — no player with that ID in room. Available: [${availableIds}]. Coercing to group_action.`);
          response.next.type = 'group_action';
          response.next.target = undefined;
        } else if (!targetPlayer.active) {
          console.warn(`AI returned target "${response.next.target}" (${targetPlayer.name}) which is disconnected. Coercing to group_action.`);
          response.next.type = 'group_action';
          response.next.target = undefined;
        }
      }
    }

    if (response.conditions) {
      for (const cond of response.conditions) {
        const playerExists = players.some(p => p.id === cond.targetPlayerId);
        if (!playerExists) {
          console.warn(`AI condition "${cond.name}" targets invalid player "${cond.targetPlayerId}". Skipping condition.`);
        }
      }
    }
  }

  private processConditions(room: GameStateData, conditions: ConditionSeed[]): void {
    for (const seed of conditions) {
      const targetPlayer = room.players.find(p => p.id === seed.targetPlayerId);
      if (!targetPlayer) {
        console.warn(`AI condition target "${seed.targetPlayerId}" not found in room. Skipping.`);
        continue;
      }
      if (!targetPlayer.active) {
        console.warn(`AI condition target "${seed.targetPlayerId}" (${targetPlayer.name}) is disconnected. Skipping.`);
        continue;
      }

      if (seed.effects.length > 5) {
        console.warn(`Condition "${seed.name}" has ${seed.effects.length} effects (max 5). Truncating.`);
        seed.effects = seed.effects.slice(0, 5);
      }

      const validEffects: Effect[] = [];
      for (const ef of seed.effects) {
        const effect = this.seedToEffect(ef, targetPlayer);
        if (effect) validEffects.push(effect);
      }

      if (validEffects.length === 0) {
        console.warn(`Condition "${seed.name}" has no valid effects. Skipping.`);
        continue;
      }

      const condition: Condition = {
        id: uuid(),
        name: seed.name,
        description: seed.description,
        effects: validEffects,
        origin: 'narrative',
      };

      this.conditionEngine.applyConditionToPlayer(targetPlayer, condition, room);

      this.gameState.addHistory(room.campaignId, {
        role: 'system',
        content: `Condition applied: ${seed.name} → ${targetPlayer.name}`,
      });
    }
  }

  private seedToEffect(seed: ConditionSeed['effects'][0], _player: Player): Effect | null {
    if (seed.type === 'immediate' && !seed.hpFormula) return null;
    if (seed.type === 'temporary' && !seed.duration) return null;

    const duration = seed.duration ? Math.min(seed.duration, 99) : undefined;
    const statValue = seed.statValue !== undefined
      ? Math.max(-10, Math.min(10, seed.statValue))
      : undefined;

    const effect: Effect = {
      type: seed.type,
      origin: 'narrative',
    };

    if (duration !== undefined && seed.type === 'temporary') {
      effect.duration = duration;
    }

    if (seed.stat && seed.statValue !== undefined) {
      effect.statModifiers = [{
        target: seed.stat as any,
        value: statValue ?? 0,
        operation: (seed.statOperation as 'add' | 'override') || 'add',
        dexCap: seed.dexCap,
      }];
    }

    if (seed.hpFormula) {
      effect.hpChange = {
        formula: seed.hpFormula,
        type: (seed.hpType as 'heal' | 'damage') || 'damage',
      };
    }

    return effect;
  }

  getState(roomId: string) {
    const room = this.gameState.getRoom(roomId);
    if (!room) return null;

    return {
      campaignId: room.campaignId,
      campaignName: room.campaignName,
      language: room.language,
      campaignTheme: room.campaignTheme,
      players: room.players.filter(p => p.active),
      currentTurn: room.currentTurn,
      turnType: room.turnType,
      turnTarget: room.turnTarget,
      turnSkill: room.turnSkill,
      turnDc: room.turnDc,
      currentLocation: room.currentLocation,
      gameStarted: room.gameStarted,
      creatorId: room.creatorId,
      history: room.history,
    };
  }

  getRoomContext(roomId: string): GameStateData | null {
    return this.gameState.getRoom(roomId) || null;
  }

  findPlayer(roomId: string, playerId: string): Player | null {
    const room = this.gameState.getRoom(roomId);
    if (!room) return null;
    return room.players.find(p => p.id === playerId) || null;
  }

  findPlayerWithItem(roomId: string, playerId: string, itemId: string): { player: Player; item: InventoryItem } | null {
    const player = this.findPlayer(roomId, playerId);
    if (!player) return null;
    const item = player.inventory.find(i => i.id === itemId);
    if (!item) return null;
    return { player, item };
  }

  getTurnContext(roomId: string): { turnSkill: string; turnDc: number } | null {
    const room = this.gameState.getRoom(roomId);
    if (!room) return null;
    return { turnSkill: room.turnSkill || 'dexterity', turnDc: room.turnDc ?? 10 };
  }

  getTradeEmitData(roomId: string): { merchants: Merchant[]; tradeParticipants: string[]; tradeDone: string[]; players: Array<{ playerId: string; chaMod: number }> } | null {
    const room = this.gameState.getRoom(roomId);
    if (!room || !room.merchants) return null;
    return {
      merchants: room.merchants,
      tradeParticipants: room.tradeParticipants,
      tradeDone: room.tradeDone,
      players: room.players.filter(p => p.active).map(p => ({
        playerId: p.id,
        chaMod: Math.floor((p.attributes.charisma - 10) / 2),
      })),
    };
  }

  getRoomAiContext(roomId: string) {
    const room = this.gameState.getRoom(roomId);
    if (!room) return null;
    return {
      roomId,
      campaignName: room.campaignName,
      campaignTheme: room.campaignTheme,
      language: room.language,
      players: room.players,
      currentLocation: room.currentLocation,
      history: room.history,
      summary: room.summary,
    };
  }

  hasMerchants(roomId: string): boolean {
    const room = this.gameState.getRoom(roomId);
    return !!(room && room.merchants && room.merchants.length > 0);
  }

  isTradeLocked(roomId: string): boolean {
    const room = this.gameState.getRoom(roomId);
    return !!room?.isTradeLocked;
  }

  setCreatorId(roomId: string, playerId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (room && !room.creatorId) {
      room.creatorId = playerId;
    }
  }

  setGameStarted(roomId: string, value: boolean): void {
    const room = this.gameState.getRoom(roomId);
    if (room) {
      room.gameStarted = value;
    }
  }

  allocateAttributes(
    roomId: string,
    playerId: string,
    allocations: Partial<Record<keyof Player['attributes'], number>>,
  ) {
    return this.levelingService.allocateAttributes(roomId, playerId, allocations);
  }
}
