import { v4 as uuid } from 'uuid';

export interface Player {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
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
  players: Player[];
  currentTurn: string | null;
  turnType: 'group_action' | 'call_player' | 'call_roll' | 'narration_only' | null;
  turnTarget: string | null;
  scene: string;
  history: Array<{
    role: 'player' | 'assistant' | 'system';
    playerId?: string;
    content: string;
  }>;
  playerStates: Record<string, {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    magic: number;
  }>;
}

export class GameState {
  private rooms: Map<string, GameStateData> = new Map();

  createRoom(roomId: string, name: string): GameStateData {
    const state: GameStateData = {
      campaignId: roomId,
      campaignName: name,
      players: [],
      currentTurn: null,
      turnType: null,
      turnTarget: null,
      scene: '',
      history: [],
      playerStates: {},
    };
    this.rooms.set(roomId, state);
    return state;
  }

  getRoom(roomId: string): GameStateData | undefined {
    return this.rooms.get(roomId);
  }

  addPlayer(roomId: string, name: string): Player {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const player: Player = {
      id: uuid(),
      name,
      hp: 12,
      maxHp: 12,
      attack: 3,
      defense: 2,
      magic: 1,
      attributes: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    };

    room.players.push(player);
    room.playerStates[player.id] = {
      hp: player.hp,
      maxHp: player.maxHp,
      attack: player.attack,
      defense: player.defense,
      magic: player.magic,
    };

    return player;
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== playerId);
    delete room.playerStates[playerId];
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

  updatePlayerState(roomId: string, playerId: string, updates: Partial<GameStateData['playerStates'][string]>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.playerStates[playerId]) {
      Object.assign(room.playerStates[playerId], updates);
    }
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
