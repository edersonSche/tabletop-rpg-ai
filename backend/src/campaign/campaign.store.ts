import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { GameState, GameStateData } from '../game/game.state';
import { RoomService, RoomData } from '../room/room.service';
import { SavedCampaign, SavedCampaignInfo } from './campaign.types';

@Injectable()
export class CampaignStore {
  private filePath: string;
  private campaigns: Map<string, SavedCampaign> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private pendingSaves = new Set<string>();

  constructor(
    private gameState: GameState,
    private roomService: RoomService,
  ) {
    this.filePath = path.resolve(process.cwd(), 'data', 'campaigns.json');
    this.loadFromDisk();
  }

  snapshotFromMemory(campaignId: string): SavedCampaign | null {
    const state = this.gameState.getRoom(campaignId);
    const room = this.roomService.get(campaignId);
    if (!state || !room) return null;

    const existing = this.campaigns.get(campaignId);
    const creatorPlayer = state.players.find(p => p.id === state.creatorId);

    return {
      campaignId,
      campaignName: state.campaignName,
      creatorUserId: creatorPlayer?.userId || existing?.creatorUserId || '',
      creatorPlayerId: state.creatorId,
      language: state.language,
      campaignTheme: state.campaignTheme,
      players: state.players.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        attributes: { ...p.attributes },
      })),
      currentTurn: state.currentTurn,
      turnType: state.turnType,
      turnTarget: state.turnTarget,
      turnSkill: state.turnSkill,
      turnDc: state.turnDc,
      currentLocation: state.currentLocation,
      scene: state.scene,
      gameStarted: state.gameStarted,
      history: state.history.map(h => ({ ...h })),
      summary: state.summary || undefined,
      lastSummarizedAt: state.lastSummarizedAt || undefined,
      savedAt: new Date().toISOString(),
      status: 'inactive',
    };
  }

  saveFromMemory(campaignId: string): void {
    const state = this.gameState.getRoom(campaignId);
    if (!state || !state.gameStarted) return;
    const snapshot = this.snapshotFromMemory(campaignId);
    if (!snapshot) return;
    this.campaigns.set(campaignId, snapshot);
    this.scheduleWrite();
  }

  load(campaignId: string): SavedCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  listSavedByUserId(userId: string): SavedCampaignInfo[] {
    const result: SavedCampaignInfo[] = [];

    for (const campaign of this.campaigns.values()) {
      if (campaign.status !== 'inactive') continue;
      const isCreator = campaign.creatorUserId === userId;
      const hasChar = campaign.players.some(p => p.userId === userId);
      if (!isCreator && !hasChar) continue;

      result.push({
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        playersCount: campaign.players.length,
        players: campaign.players.map(p => ({ id: p.id, name: p.name })),
        lastSavedAt: campaign.savedAt,
        hasStarted: !!campaign.scene && campaign.history.length > 0,
        isCreator,
      });
    }

    return result.sort((a, b) =>
      new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime()
    );
  }

  restoreToMemory(campaignId: string): boolean {
    const saved = this.campaigns.get(campaignId);
    if (!saved) return false;

    this.roomService.createWithId(
      campaignId,
      saved.campaignName,
      saved.players.map(p => ({ id: p.id, name: p.name })),
      saved.creatorPlayerId,
    );

    this.gameState.restoreCampaign({
      campaignId,
      campaignName: saved.campaignName,
      creatorId: saved.creatorPlayerId,
      language: saved.language,
      campaignTheme: saved.campaignTheme,
      players: saved.players.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        active: true,
        attributes: { ...p.attributes },
      })),
      currentTurn: saved.currentTurn,
      turnType: saved.turnType as any,
      turnTarget: saved.turnTarget,
      turnSkill: saved.turnSkill,
      turnDc: saved.turnDc,
      currentLocation: saved.currentLocation,
      scene: saved.scene,
      gameStarted: saved.gameStarted ?? false,
      history: [...saved.history],
      summary: saved.summary,
      lastSummarizedAt: saved.lastSummarizedAt,
    });

    return true;
  }

  delete(campaignId: string): void {
    this.campaigns.delete(campaignId);
    this.scheduleWrite();
  }

  private loadFromDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, '{}', 'utf-8');
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw);
      for (const [key, val] of Object.entries(data)) {
        this.campaigns.set(key, val as SavedCampaign);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err.message);
    }
  }

  private scheduleWrite(): void {
    this.pendingSaves.add('campaigns');
    if (this.saveTimer) return;

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.writeToDisk();
    }, 1000);
  }

  private writeToDisk(): void {
    try {
      const obj: Record<string, SavedCampaign> = {};
      for (const [key, val] of this.campaigns) {
        obj[key] = val;
      }
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
      this.pendingSaves.clear();
    } catch (err) {
      console.error('Failed to save campaigns:', err.message);
    }
  }
}
