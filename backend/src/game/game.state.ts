import { v4 as uuid } from 'uuid';

export type NarrativeLanguage = 'english' | 'portuguese' | 'spanish';

export interface Player {
  id: string;
  userId: string;
  name: string;
  active: boolean;
  attributes: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

export interface GameStateData {
  campaignId: string;
  campaignName: string;
  creatorId: string;
  language: NarrativeLanguage;
  campaignTheme: string;
  players: Player[];
  currentTurn: string | null;
  turnType: 'group_action' | 'call_player' | 'call_roll' | 'narration_only' | null;
  turnTarget: string | null;
  turnSkill?: string;
  turnDc?: number;
  currentLocation: string | null;
  scene: string;
  gameStarted: boolean;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
  summary: string;
  lastSummarizedAt: number;
}

export class GameState {
  private rooms: Map<string, GameStateData> = new Map();

  restoreCampaign(data: {
    campaignId: string;
    campaignName: string;
    creatorId: string;
    language: NarrativeLanguage;
    campaignTheme: string;
    players: Player[];
    currentTurn: string | null;
    turnType: GameStateData['turnType'];
    turnTarget: string | null;
    turnSkill?: string;
    turnDc?: number;
    currentLocation: string | null;
    scene: string;
    gameStarted: boolean;
    history: GameStateData['history'];
    summary?: string;
    lastSummarizedAt?: number;
  }): GameStateData {
    const state: GameStateData = {
      ...data,
      campaignTheme: data.campaignTheme || 'A classic medieval fantasy world of magic, ancient ruins, warring kingdoms, and mythical creatures.',
      turnSkill: data.turnSkill,
      turnDc: data.turnDc,
      summary: data.summary || '',
      lastSummarizedAt: data.lastSummarizedAt || 0,
    };
    this.rooms.set(data.campaignId, state);

    for (const p of data.players) {
      const roomUserMap = this.playerByUserId.get(data.campaignId) || new Map();
      roomUserMap.set(p.userId, p.id);
      this.playerByUserId.set(data.campaignId, roomUserMap);
    }

    return state;
  }

  createRoom(roomId: string, name: string, language: NarrativeLanguage = 'english', campaignTheme = 'A classic medieval fantasy world of magic, ancient ruins, warring kingdoms, and mythical creatures.'): GameStateData {
    const state: GameStateData = {
      campaignId: roomId,
      campaignName: name,
      creatorId: '',
      language,
      campaignTheme,
      players: [],
      currentTurn: null,
      turnType: null,
      turnTarget: null,
      currentLocation: null,
      scene: '',
      gameStarted: false,
      history: [],
      summary: '',
      lastSummarizedAt: 0,
    };
    this.rooms.set(roomId, state);
    return state;
  }

  getRoom(roomId: string): GameStateData | undefined {
    return this.rooms.get(roomId);
  }

  private playerByUserId: Map<string, Map<string, string>> = new Map();

  addPlayer(roomId: string, userId: string, name: string, attributes?: Player['attributes']): Player {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const player: Player = {
      id: uuid(),
      userId,
      name,
      active: true,
      attributes: attributes ?? {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    };

    room.players.push(player);

    const roomUserMap = this.playerByUserId.get(roomId) || new Map();
    roomUserMap.set(userId, player.id);
    this.playerByUserId.set(roomId, roomUserMap);

    return player;
  }

  findPlayerByUserId(roomId: string, userId: string): Player | undefined {
    const roomUserMap = this.playerByUserId.get(roomId);
    if (!roomUserMap) return undefined;
    const playerId = roomUserMap.get(userId);
    if (!playerId) return undefined;
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return room.players.find(p => p.id === playerId);
  }

  disconnectPlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.active = false;
    }
  }

  reactivatePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.active = true;
    }
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const removed = room.players.find(p => p.id === playerId);
    room.players = room.players.filter(p => p.id !== playerId);

    if (removed) {
      const roomUserMap = this.playerByUserId.get(roomId);
      if (roomUserMap) {
        roomUserMap.delete(removed.userId);
      }
    }
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.playerByUserId.delete(roomId);
  }

  addHistory(roomId: string, entry: GameStateData['history'][0]): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.history.push(entry);
  }

  setTurn(roomId: string, turn: string | null, type: GameStateData['turnType'], target: string | null): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.currentTurn = turn;
    room.turnType = type;
    room.turnTarget = target;
  }

  getPlayerModifier(player: Player, skill: string): number {
    const attrMap: Record<string, keyof Player['attributes']> = {
      forca: 'strength',
      forç: 'strength',
      destreza: 'dexterity',
      constituição: 'constitution',
      constituicao: 'constitution',
      inteligência: 'intelligence',
      inteligencia: 'intelligence',
      sabedoria: 'wisdom',
      carisma: 'charisma',
    };

    const attr = attrMap[skill.toLowerCase()];
    if (!attr) return 0;

    const value = player.attributes[attr];
    return Math.floor((value - 10) / 2);
  }

  rollDice(sides: number = 20): number {
    return Math.floor(Math.random() * sides) + 1;
  }
}
