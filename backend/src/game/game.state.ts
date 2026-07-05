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
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  maxXp: number;
  pendingAttributePoints: number;
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

const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

const MAX_LEVEL = 20;
const MAX_ATTRIBUTE = 20;

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

    const attrs = attributes ?? {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    };

    const conMod = Math.floor((attrs.constitution - 10) / 2);
    const maxHp = 10 + conMod;

    const player: Player = {
      id: uuid(),
      userId,
      name,
      active: true,
      attributes: attrs,
      hp: maxHp,
      maxHp,
      level: 1,
      xp: 0,
      maxXp: XP_THRESHOLDS[1] ?? 300,
      pendingAttributePoints: 0,
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

  getXpForLevel(level: number): number {
    if (level <= 1) return XP_THRESHOLDS[1] ?? 300;
    if (level >= MAX_LEVEL) return 0;
    return XP_THRESHOLDS[level] ?? XP_THRESHOLDS[1];
  }

  awardXp(roomId: string, playerId: string, amount: number): { leveledUp: boolean; newLevel: number; gainedPoints: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.level >= MAX_LEVEL) return null;

    player.xp += amount;
    let leveledUp = false;
    let gainedPoints = 0;
    const finalLevel = player.level;

    while (player.xp >= player.maxXp && player.level < MAX_LEVEL) {
      player.level++;
      leveledUp = true;

      if (ASI_LEVELS.has(player.level)) {
        player.pendingAttributePoints += 2;
        gainedPoints += 2;
      }

      player.maxXp = this.getXpForLevel(player.level + 1);
    }

    return leveledUp ? { leveledUp, newLevel: player.level, gainedPoints } : { leveledUp: false, newLevel: player.level, gainedPoints: 0 };
  }

  allocateAttributes(
    roomId: string,
    playerId: string,
    allocations: Partial<Record<keyof Player['attributes'], number>>,
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const totalPoints = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
    if (totalPoints > player.pendingAttributePoints) {
      return { success: false, error: 'Not enough attribute points' };
    }

    for (const [attr, delta] of Object.entries(allocations)) {
      if (!delta) continue;
      const key = attr as keyof Player['attributes'];
      const current = player.attributes[key];
      if (current + delta > MAX_ATTRIBUTE) {
        return { success: false, error: `${attr} cannot exceed ${MAX_ATTRIBUTE}` };
      }
      player.attributes[key] += delta;
    }

    player.pendingAttributePoints -= totalPoints;

    return { success: true };
  }
}
