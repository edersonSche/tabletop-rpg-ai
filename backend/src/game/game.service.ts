import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, Player, Merchant, MerchantItem, InventoryItem, TickResult, GameStateData, Condition, Effect } from './game.state';
import { ConditionEngine } from './condition.engine';
import { DiceService } from './dice.service';
import { LevelingService } from './leveling.service';
import { TurnManager } from './turn.manager';
import { AiService } from '../ai/ai.service';
import { isUnknownLocation } from '../utils/is-unknown-location';
import { AIResponse, MerchantSeed, ConditionSeed } from '../dto/ai-response.dto';

const MAX_NARRATION_DEPTH = 5;
const SUMMARY_THRESHOLD = 50;

@Injectable()
export class GameService {
  private isSummarizing = new Set<string>();

  constructor(
    private gameState: GameState,
    private conditionEngine: ConditionEngine,
    private diceService: DiceService,
    private levelingService: LevelingService,
    private turnManager: TurnManager,
    private aiService: AiService,
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

    this.turnManager.lock(roomId);

    const player = room.players.find(p => p.id === playerId);

    try {
      const currentAction = buildAction(player);
      let response: AIResponse = { narration: '', next: { type: 'group_action' } };
      let allTickResults: TickResult[] = [];

      for (let depth = 0; depth <= MAX_NARRATION_DEPTH; depth++) {
        const currentRoom = this.gameState.getRoom(roomId);
        if (!currentRoom) throw new Error('Room deleted');

        response = await this.aiService.generate({
          roomId,
          campaignName: currentRoom.campaignName,
          campaignTheme: currentRoom.campaignTheme,
          language: currentRoom.language,
          players: currentRoom.players,
          scene: currentRoom.scene,
          currentLocation: currentRoom.currentLocation,
          history: currentRoom.history,
          summary: currentRoom.summary || undefined,
          currentAction: depth === 0 ? currentAction : null,
        });

        allTickResults = allTickResults.concat(this.processAiResponse(roomId, response));

        if (response.next?.type !== 'narration_only') break;
      }

      return { response, tickResults: allTickResults };
    } finally {
      this.turnManager.unlock(roomId);
      this.maybeSummarize(roomId).catch(() => {});
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
          next: {
            type: room.turnType || 'group_action',
            target: room.turnTarget || undefined,
          },
        },
        tickResults: [],
      };
    }

    this.turnManager.lock(roomId);

    try {
      let response: AIResponse = { narration: '', next: { type: 'group_action' } };
      let allTickResults: TickResult[] = [];

      for (let depth = 0; depth <= MAX_NARRATION_DEPTH; depth++) {
        const currentRoom = this.gameState.getRoom(roomId);
        if (!currentRoom) throw new Error('Room deleted');

        response = await this.aiService.generate({
          roomId,
          campaignName: currentRoom.campaignName,
          campaignTheme: currentRoom.campaignTheme,
          language: currentRoom.language,
          players: currentRoom.players,
          scene: currentRoom.history.length === 0 ? 'The adventure is about to begin.' : currentRoom.scene,
          currentLocation: currentRoom.currentLocation,
          history: currentRoom.history,
          summary: currentRoom.summary || undefined,
          currentAction: null,
        });

        currentRoom.gameStarted = true;

        allTickResults = allTickResults.concat(this.processAiResponse(roomId, response));

        if (response.next?.type !== 'narration_only') break;
      }

      return { response, tickResults: allTickResults };
    } finally {
      this.turnManager.unlock(roomId);
      this.maybeSummarize(roomId).catch(() => {});
    }
  }

  async initiateTrade(roomId: string, playerId: string): Promise<AIResponse> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    if (room.merchants && room.merchantsLocation == room.currentLocation) {
      return {
        narration: '',
        next: { type: 'group_action' },
      };
    }

    if (!room.currentLocation || isUnknownLocation(room.currentLocation)) {
      return {
        narration: '',
        next: { type: 'group_action' },
      };
    }

    this.turnManager.lock(roomId);

    try {
      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignTheme: room.campaignTheme,
        language: room.language,
        players: room.players,
        scene: room.scene,
        currentLocation: room.currentLocation,
        history: room.history,
        summary: room.summary || undefined,
        currentAction: {
          playerId,
          characterName: player.name,
          action: 'initiate_trade',
        },
      });

      if (response.merchants && response.merchants.length > 0) {
        const merchants = response.merchants.map((seed: MerchantSeed) => this.seedToMerchant(seed));
        room.merchants = merchants;
        room.merchantsLocation = room.currentLocation ?? undefined;
      }

      if (response.narration) {
        room.scene = this.buildSceneContext(response, room.currentLocation, room);
        this.gameState.addHistory(roomId, {
          role: 'assistant',
          content: response.narration,
        });
      }

      return response;
    } finally {
      this.turnManager.unlock(roomId);
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
      room.scene = this.buildSceneContext(response, room.currentLocation, room);
      this.gameState.addHistory(roomId, {
        role: 'assistant',
        content: response.narration,
      });
    }

    const tickResults = this.conditionEngine.tickEffects(room);
    return tickResults;
  }

  private extractSummary(narration: string, maxChars: number = 300): string {
    const sentences = narration.match(/[^.!?\n]+[.!?\n]+/g) || [narration];
    let summary = '';
    for (const s of sentences) {
      if ((summary + s).length > maxChars) break;
      summary += s;
    }
    return summary.trim();
  }

  private buildSceneContext(response: AIResponse, currentLocation: string | null, room: GameStateData): string {
    const summary = this.extractSummary(response.narration);
    const location = response.location || currentLocation || 'unknown';

    let nextDesc = 'The group awaits the next move.';
    if (response.next) {
      switch (response.next.type) {
        case 'call_player':
          nextDesc = `Waiting for ${response.next.target || 'a player'}.`;
          break;
        case 'call_roll':
          nextDesc = `Waiting for ${response.next.target || 'a player'} to roll ${response.next.skill || 'a skill'} (DC ${response.next.dc || 10}).`;
          break;
        case 'narration_only':
          nextDesc = 'The GM will narrate next.';
          break;
      }
    }

    const conditionsDesc = room.players
      .filter(p => p.active && p.activeConditions.length > 0)
      .map(p => {
        const conds = p.activeConditions
          .filter(ac => !ac.isSuppressed)
          .map(ac => {
            const parts = [ac.condition.name];
            const temps = ac.remainingDurations.filter(d => d > 0);
            if (temps.length > 0) {
              parts.push(`(${Math.min(...temps)} turns remaining)`);
            }
            return parts.join(' ');
          });
        return conds.length > 0 ? `${p.name}: ${conds.join(', ')}` : null;
      })
      .filter(Boolean)
      .join('; ');

    return `Scene: ${summary}\nLocation: ${location}\n${nextDesc}${conditionsDesc ? `\nActive Conditions: ${conditionsDesc}` : ''}`;
  }

  private validateAiResponseTarget(response: AIResponse, players: Player[]): void {
    if (response.next?.type === 'call_player' || response.next?.type === 'call_roll') {
      if (!response.next.target) {
        console.warn(`AI returned ${response.next.type} with no target. Coercing to group_action.`);
        response.next.type = 'group_action';
        response.next.target = undefined;
      } else {
        const playerExists = players.some(p => p.id === response.next.target);
        if (!playerExists) {
          const availableIds = players.map(p => `${p.name}:${p.id}`).join(', ');
          console.warn(`AI returned invalid target "${response.next.target}" — no player with that ID in room. Available: [${availableIds}]. Coercing to group_action.`);
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

  private async maybeSummarize(roomId: string): Promise<void> {
    const room = this.gameState.getRoom(roomId);
    if (!room || room.history.length < SUMMARY_THRESHOLD) return;
    if (this.isSummarizing.has(roomId)) return;

    this.isSummarizing.add(roomId);
    try {
      const currentRoom = this.gameState.getRoom(roomId);
      if (!currentRoom) return;

      const newEntries = currentRoom.history.slice(currentRoom.lastSummarizedAt)
        .map(h =>
          h.role === 'player' ? `[${h.playerId}] ${h.content}`
          : h.role === 'assistant' ? `GM: ${h.content}`
          : `[system] ${h.content}`
        );

      if (newEntries.length === 0) return;

      const summary = await this.aiService.summarizeHistory(
        newEntries,
        currentRoom.summary || undefined,
      );

      const roomAfter = this.gameState.getRoom(roomId);
      if (!roomAfter) return;

      roomAfter.summary = summary;
      roomAfter.lastSummarizedAt = roomAfter.history.length;
    } finally {
      this.isSummarizing.delete(roomId);
    }
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
      currentLocation: room.currentLocation,
      scene: room.scene,
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
      scene: room.scene,
      currentLocation: room.currentLocation,
      history: room.history,
    };
  }

  hasMerchantsAtLocation(roomId: string): boolean {
    const room = this.gameState.getRoom(roomId);
    if (!room || !room.merchants || room.merchants.length === 0) return false;
    return room.merchantsLocation === room.currentLocation;
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
