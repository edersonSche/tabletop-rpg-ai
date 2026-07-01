import { Injectable } from '@nestjs/common';
import { GameState, Player } from './game.state';
import { TurnManager } from './turn.manager';
import { AiService } from '../ai/ai.service';
import { AIResponse } from '../dto/ai-response.dto';

export const CAMPAIGN_SETTING = 'A medieval fantasy world of dark forests, dangerous dungeons, and warring kingdoms.';
const MAX_NARRATION_DEPTH = 5;
const SUMMARY_THRESHOLD = 50;

@Injectable()
export class GameService {
  readonly campaignSetting = CAMPAIGN_SETTING;
  private isSummarizing = new Set<string>();

  constructor(
    private gameState: GameState,
    private turnManager: TurnManager,
    private aiService: AiService,
  ) {}

  async handleAction(roomId: string, playerId: string, message: string): Promise<AIResponse> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const check = this.turnManager.canPlayerAct(roomId, playerId);
    if (!check.allowed) throw new Error(check.reason);

    this.turnManager.lock(roomId);

    const player = room.players.find(p => p.id === playerId);

    this.gameState.addHistory(roomId, {
      role: 'player',
      playerId,
      content: message,
    });

    try {
      let response: AIResponse = { narration: '', next: { type: 'group_action' } };

      for (let depth = 0; depth <= MAX_NARRATION_DEPTH; depth++) {
        const currentRoom = this.gameState.getRoom(roomId);
        if (!currentRoom) throw new Error('Room deleted');

        response = await this.aiService.generate({
          roomId,
          campaignName: currentRoom.campaignName,
          campaignSetting: this.campaignSetting,
          language: currentRoom.language,
          players: currentRoom.players,
          scene: currentRoom.scene,
          currentLocation: currentRoom.currentLocation,
          history: currentRoom.history,
          summary: currentRoom.summary || undefined,
          currentAction: depth === 0
            ? { playerId, characterName: player?.name, action: message }
            : null,
        });

        this.processAiResponse(roomId, response);

        if (response.next?.type !== 'narration_only') break;
      }

      return response;
    } finally {
      this.turnManager.unlock(roomId);
      this.maybeSummarize(roomId).catch(() => {});
    }
  }

  async handleRoll(roomId: string, playerId: string, rollData?: { roll: number; modifier: number; total: number; skill: string; dc: number }): Promise<AIResponse> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const check = this.turnManager.canPlayerAct(roomId, playerId);
    if (!check.allowed) throw new Error(check.reason);

    this.turnManager.lock(roomId);

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const skill = rollData?.skill ?? room.turnSkill ?? 'destreza';
    const dc = rollData?.dc ?? room.turnDc ?? 10;

    const modifier = rollData?.modifier ?? this.gameState.getPlayerModifier(player, skill);
    const roll = rollData?.roll ?? this.gameState.rollDice(20);
    const total = rollData?.total ?? roll + modifier;

    try {
      let response: AIResponse = { narration: '', next: { type: 'group_action' } };

      for (let depth = 0; depth <= MAX_NARRATION_DEPTH; depth++) {
        const currentRoom = this.gameState.getRoom(roomId);
        if (!currentRoom) throw new Error('Room deleted');

        response = await this.aiService.generate({
          roomId,
          campaignName: currentRoom.campaignName,
          campaignSetting: this.campaignSetting,
          language: currentRoom.language,
          players: currentRoom.players,
          scene: currentRoom.scene,
          currentLocation: currentRoom.currentLocation,
          history: currentRoom.history,
          summary: currentRoom.summary || undefined,
          currentAction: depth === 0
            ? {
                playerId,
                characterName: player.name,
                action: `Rolou ${roll} + modificador(${modifier}) = ${total} (DC ${dc})`,
                rollResult: total,
                skill,
                dc,
              }
            : null,
        });

        this.processAiResponse(roomId, response);

        if (response.next?.type !== 'narration_only') break;
      }

      return response;
    } finally {
      this.turnManager.unlock(roomId);
      this.maybeSummarize(roomId).catch(() => {});
    }
  }

  async startCampaign(roomId: string): Promise<AIResponse> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (room.history.length > 0) {
      room.gameStarted = true;
      return {
        narration: '',
        next: {
          type: room.turnType || 'group_action',
          target: room.turnTarget || undefined,
        },
      };
    }

    this.turnManager.lock(roomId);

    try {
      let response: AIResponse = { narration: '', next: { type: 'group_action' } };

      for (let depth = 0; depth <= MAX_NARRATION_DEPTH; depth++) {
        const currentRoom = this.gameState.getRoom(roomId);
        if (!currentRoom) throw new Error('Room deleted');

        response = await this.aiService.generate({
          roomId,
          campaignName: currentRoom.campaignName,
          campaignSetting: this.campaignSetting,
          language: currentRoom.language,
          players: currentRoom.players,
          scene: currentRoom.history.length === 0 ? 'The adventure is about to begin.' : currentRoom.scene,
          currentLocation: currentRoom.currentLocation,
          history: currentRoom.history,
          summary: currentRoom.summary || undefined,
          currentAction: null,
        });

        currentRoom.gameStarted = true;

        this.processAiResponse(roomId, response);

        if (response.next?.type !== 'narration_only') break;
      }

      return response;
    } finally {
      this.turnManager.unlock(roomId);
      this.maybeSummarize(roomId).catch(() => {});
    }
  }

  private processAiResponse(roomId: string, response: AIResponse): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;

    this.validateAiResponseTarget(response, room.players);

    if (response.location) {
      room.currentLocation = response.location;
    }

    this.turnManager.processTurn(roomId, room, response);

    if (response.narration) {
      room.scene = this.buildSceneContext(response, room.currentLocation);
      this.gameState.addHistory(roomId, {
        role: 'assistant',
        content: response.narration,
      });
    }
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

  private buildSceneContext(response: AIResponse, currentLocation: string | null): string {
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

    return `Scene: ${summary}\nLocation: ${location}\n${nextDesc}`;
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
      players: room.players.filter(p => p.active),
      currentTurn: room.currentTurn,
      turnType: room.turnType,
      turnTarget: room.turnTarget,
      currentLocation: room.currentLocation,
      scene: room.scene,
      gameStarted: room.gameStarted,
    };
  }
}
