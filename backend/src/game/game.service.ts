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
        players: room.players,
        scene: room.scene,
        currentLocation: room.currentLocation,
        history: room.history,
        currentAction: {
          playerId,
          playerName: player?.name,
          action: message,
        },
      });

      this.validateAiResponseTarget(response, room.players);

      if (response.location) {
        room.currentLocation = response.location;
      }

      this.turnManager.processTurn(roomId, room, response);

      if (response.narration) {
        room.scene = response.narration.slice(0, 200);
        this.gameState.addHistory(roomId, {
          role: 'assistant',
          content: JSON.stringify(response),
        });
      }

      return response;
    } finally {
      this.turnManager.unlock(roomId);
    }
  }

  async handleRoll(roomId: string, playerId: string): Promise<AIResponse> {
    const room = this.gameState.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const check = this.turnManager.canPlayerAct(roomId, playerId);
    if (!check.allowed) throw new Error(check.reason);

    this.turnManager.lock(roomId);

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const skill = room.turnTarget === playerId ? (room.turnType === 'call_roll' ? 'destreza' : 'destreza') : 'destreza';
    const dc = 10;

    const modifier = this.gameState.getPlayerModifier(player, skill);
    const roll = this.gameState.rollDice(20);
    const total = roll + modifier;

    try {
      const response = await this.aiService.generate({
        roomId,
        campaignName: room.campaignName,
        campaignSetting: 'A medieval fantasy world of dark forests, dangerous dungeons, and warring kingdoms.',
        players: room.players,
        scene: room.scene,
        currentLocation: room.currentLocation,
        history: room.history,
        currentAction: {
          playerId,
          playerName: player.name,
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
        room.scene = response.narration.slice(0, 200);
        this.gameState.addHistory(roomId, {
          role: 'assistant',
          content: JSON.stringify(response),
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
        room.scene = response.narration.slice(0, 200);
        this.gameState.addHistory(roomId, {
          role: 'assistant',
          content: JSON.stringify(response),
        });
      }

      return response;
    } finally {
      this.turnManager.unlock(roomId);
    }
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
      players: room.players,
      currentTurn: room.currentTurn,
      turnType: room.turnType,
      turnTarget: room.turnTarget,
      currentLocation: room.currentLocation,
      scene: room.scene,
    };
  }
}
