import { Injectable } from '@nestjs/common';
import { GameState, Player } from './game.state';
import { TurnManager } from './turn.manager';
import { AiService } from '../ai/ai.service';
import { AIResponse } from '../dto/ai-response.dto';

@Injectable()
export class GameService {
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
      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignSetting: 'A medieval fantasy world of dark forests, dangerous dungeons, and warring kingdoms.',
        language: room.language,
        players: room.players,
        scene: room.scene,
        currentLocation: room.currentLocation,
        history: room.history,
        currentAction: {
          playerId,
          characterName: player?.name,
          action: message,
        },
      });

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

      return response;
    } finally {
      this.turnManager.unlock(roomId);
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

    const skill = rollData?.skill ?? (room.turnTarget === playerId ? (room.turnType === 'call_roll' ? 'destreza' : 'destreza') : 'destreza');
    const dc = rollData?.dc ?? 10;

    const modifier = rollData?.modifier ?? this.gameState.getPlayerModifier(player, skill);
    const roll = rollData?.roll ?? this.gameState.rollDice(20);
    const total = rollData?.total ?? roll + modifier;

    try {
      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignSetting: 'A medieval fantasy world of dark forests, dangerous dungeons, and warring kingdoms.',
        language: room.language,
        players: room.players,
        scene: room.scene,
        currentLocation: room.currentLocation,
        history: room.history,
        currentAction: {
          playerId,
          characterName: player.name,
          action: `Rolou ${roll} + modificador(${modifier}) = ${total} (DC ${dc})`,
          rollResult: total,
          skill,
          dc,
        },
      });

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

      return response;
    } finally {
      this.turnManager.unlock(roomId);
    }
  }

  async startCampaign(roomId: string): Promise<AIResponse> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    this.turnManager.lock(roomId);

    try {
      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignSetting: 'A medieval fantasy world of dark forests, dangerous dungeons, and warring kingdoms.',
        language: room.language,
        players: room.players,
        scene: 'The adventure is about to begin.',
        currentLocation: room.currentLocation,
        history: [],
        currentAction: null,
      });

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

      return response;
    } finally {
      this.turnManager.unlock(roomId);
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
    };
  }
}
