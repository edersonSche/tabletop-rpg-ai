import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { GameState, Player, Effect, EffectTarget, InventoryItem } from '../game/game.state';
import { RoomService } from '../room/room.service';
import { SavedCampaign, SavedCampaignInfo, SavedPlayer, SavedEffect } from './campaign.types';

@Injectable()
export class CampaignStore implements OnModuleInit, OnModuleDestroy {
  private dataDir: string;
  private campaigns: Map<string, SavedCampaign> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private pendingSaves = new Set<string>();

  constructor(
    private gameState: GameState,
    private roomService: RoomService,
  ) {
    this.dataDir = path.resolve(process.cwd(), 'data', 'campaigns');
  }

  async onModuleInit(): Promise<void> {
    await this.loadFromDisk();
  }

  onModuleDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    for (const campaignId of this.campaigns.keys()) {
      this.pendingSaves.add(campaignId);
    }
    this.flushPending();
  }

  private serializeEffect(ef: Effect): SavedEffect {
    return {
      type: ef.type,
      duration: ef.duration,
      stat: ef.statModifiers?.[0]?.target,
      statValue: ef.statModifiers?.[0]?.value,
      statOperation: ef.statModifiers?.[0]?.operation,
      dexCap: ef.statModifiers?.[0]?.dexCap,
      hpFormula: ef.hpChange?.formula,
      hpType: ef.hpChange?.type,
      origin: ef.origin,
      originId: ef.originId,
    };
  }

  private serializePlayer(player: Player): SavedPlayer {
    return {
      id: player.id,
      userId: player.userId,
      name: player.name,
      attributes: { ...player.attributes },
      hp: player.hp,
      maxHp: player.maxHp,
      level: player.level,
      xp: player.xp,
      maxXp: player.maxXp,
      pendingAttributePoints: player.pendingAttributePoints,
      inventory: player.inventory.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        quantity: item.quantity,
        slot: item.slot,
        effects: (item.effects || []).map(ef => this.serializeEffect(ef)),
        antidoteFor: item.antidoteFor,
      })),
      coins: player.coins,
      equipment: { ...player.equipment },
      activeConditions: player.activeConditions?.map(ac => ({
        id: ac.id,
        condition: {
          name: ac.condition.name,
          description: ac.condition.description,
          effects: (ac.condition.effects || []).map(ef => this.serializeEffect(ef)),
          antidote: ac.condition.antidote ? {
            targetCondition: ac.condition.antidote.targetCondition,
            type: ac.condition.antidote.type,
            duration: ac.condition.antidote.duration,
          } : undefined,
          origin: ac.condition.origin,
          originId: ac.condition.originId,
        },
        appliedAt: ac.appliedAt,
        remainingDurations: [...ac.remainingDurations],
        isSuppressed: ac.isSuppressed,
        suppressRemaining: ac.suppressRemaining,
      })),
    };
  }

  private deserializeEffect(ef: SavedEffect): Effect {
    return {
      type: ef.type as 'immediate' | 'temporary' | 'permanent',
      duration: ef.duration,
      statModifiers: ef.stat ? [{
        target: ef.stat as EffectTarget,
        value: ef.statValue ?? 0,
        operation: (ef.statOperation as 'add' | 'override') || 'add',
        dexCap: ef.dexCap,
      }] : undefined,
      hpChange: ef.hpFormula ? {
        formula: ef.hpFormula,
        type: (ef.hpType as 'heal' | 'damage') || 'damage',
      } : undefined,
      origin: ef.origin as 'item' | 'condition' | 'narrative',
      originId: ef.originId,
    };
  }

  snapshotFromMemory(campaignId: string): SavedCampaign | null {
    const state = this.gameState.getRoom(campaignId);
    const room = this.roomService.get(campaignId);
    if (!state || !room) return null;

    const existing = this.campaigns.get(campaignId);
    const creatorPlayer = state.players.find(p => p.id === state.creatorId);

    return {
      schemaVersion: 2,
      campaignId,
      campaignName: state.campaignName,
      creatorUserId: creatorPlayer?.userId || existing?.creatorUserId || '',
      creatorPlayerId: state.creatorId,
      language: state.language,
      campaignTheme: state.campaignTheme,
      players: state.players.map(p => this.serializePlayer(p)),
      currentTurn: state.currentTurn,
      turnType: state.turnType,
      turnTarget: state.turnTarget,
      turnSkill: state.turnSkill,
      turnDc: state.turnDc,
      currentLocation: state.currentLocation,
      scene: state.scene,
      gameStarted: state.gameStarted,
      history: state.history.map(h => ({ ...h })),
      merchants: state.merchants ? state.merchants.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        greeting: m.greeting,
        coins: m.coins,
        inventory: m.inventory.map(i => ({
          id: i.id,
          name: i.name,
          description: i.description,
          type: i.type,
          slot: i.slot,
          buyPrice: i.buyPrice,
          sellPrice: i.sellPrice,
          quantity: i.quantity,
          effects: (i.effects || []).map(ef => this.serializeEffect(ef)),
          antidoteFor: i.antidoteFor,
        })),
      })) : undefined,
      merchantsLocation: state.merchantsLocation,
      isTradeLocked: state.isTradeLocked,
      tradeParticipants: state.tradeParticipants,
      tradeDone: state.tradeDone,
      summary: state.summary || undefined,
      lastSummarizedAt: state.lastSummarizedAt || undefined,
      savedAt: new Date().toISOString(),
      status: 'inactive',
    };
  }

  private async loadFromDisk(): Promise<void> {
    try {
      await fsp.mkdir(this.dataDir, { recursive: true });
      const files = await fsp.readdir(this.dataDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const campaignId = file.slice(0, -5);
        const raw = await fsp.readFile(path.join(this.dataDir, file), 'utf-8');
        this.campaigns.set(campaignId, JSON.parse(raw) as SavedCampaign);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to load campaigns:', err.message);
      }
    }
  }

  saveFromMemory(campaignId: string): void {
    const state = this.gameState.getRoom(campaignId);
    if (!state || !state.gameStarted) return;
    const snapshot = this.snapshotFromMemory(campaignId);
    if (!snapshot) return;
    this.campaigns.set(campaignId, snapshot);
    this.scheduleWrite(campaignId);
  }

  private scheduleWrite(campaignId: string): void {
    this.pendingSaves.add(campaignId);
    if (this.saveTimer) return;

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flushPending();
    }, 1000);
  }

  private flushPending(): void {
    try {
      for (const campaignId of this.pendingSaves) {
        this.writeCampaignFile(campaignId);
      }
      this.pendingSaves.clear();
    } catch (err) {
      console.error('Failed to save campaigns:', err.message);
    }
  }

  private writeCampaignFile(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;
    const filePath = path.join(this.dataDir, `${campaignId}.json`);
    const tmpPath = filePath + '.tmp';
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(campaign, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
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

  private deserializePlayerToInventoryItem(i: SavedPlayer['inventory'][0]): InventoryItem {
    return {
      id: i.id,
      name: i.name,
      description: i.description,
      type: i.type as InventoryItem['type'],
      quantity: i.quantity,
      slot: i.slot as InventoryItem['slot'],
      effects: (i.effects || []).map(ef => this.deserializeEffect(ef)),
      antidoteFor: i.antidoteFor,
    };
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
      players: saved.players.map(p => {
        const dexMod = Math.floor(((p.attributes?.dexterity ?? 10) - 10) / 2);
        const baseAc = 10 + dexMod;
        return {
          id: p.id,
          userId: p.userId,
          name: p.name,
          active: true,
          attributes: { ...p.attributes },
          hp: p.hp ?? (10 + Math.floor(((p.attributes?.constitution ?? 10) - 10) / 2)),
          maxHp: p.maxHp ?? (10 + Math.floor(((p.attributes?.constitution ?? 10) - 10) / 2)),
          level: p.level ?? 1,
          xp: p.xp ?? 0,
          maxXp: p.maxXp ?? 0,
          pendingAttributePoints: p.pendingAttributePoints ?? 0,
          inventory: (p.inventory || []).map(i => this.deserializePlayerToInventoryItem(i)),
          coins: p.coins ?? 0,
          equipment: { body: p.equipment?.body, mainHand: p.equipment?.mainHand, offHand: p.equipment?.offHand },
          ac: baseAc,
          activeConditions: (p.activeConditions || []).map(ac => ({
            id: ac.id,
            condition: {
              name: ac.condition.name,
              description: ac.condition.description,
              effects: (ac.condition.effects || []).map(ef => this.deserializeEffect(ef)),
              antidote: ac.condition.antidote ? {
                targetCondition: ac.condition.antidote.targetCondition,
                type: ac.condition.antidote.type as 'immediate' | 'temporary',
                duration: ac.condition.antidote.duration,
              } : undefined,
              origin: ac.condition.origin as 'item' | 'narrative',
              originId: ac.condition.originId,
            },
            appliedAt: ac.appliedAt,
            remainingDurations: ac.remainingDurations,
            isSuppressed: ac.isSuppressed ?? false,
            suppressRemaining: ac.suppressRemaining,
          })),
        };
      }),
      currentTurn: saved.currentTurn,
      turnType: saved.turnType as any,
      turnTarget: saved.turnTarget,
      turnSkill: saved.turnSkill,
      turnDc: saved.turnDc,
      currentLocation: saved.currentLocation,
      scene: saved.scene,
      gameStarted: saved.gameStarted ?? false,
      merchants: saved.merchants ? saved.merchants.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        greeting: m.greeting,
        coins: m.coins,
          inventory: m.inventory.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description,
            type: i.type as any,
            slot: i.slot as any,
            buyPrice: i.buyPrice,
            sellPrice: i.sellPrice,
            quantity: i.quantity,
            effects: (i.effects || []).map(ef => this.deserializeEffect(ef)),
            antidoteFor: i.antidoteFor,
          })),
      })) : undefined,
      merchantsLocation: saved.merchantsLocation,
      isTradeLocked: saved.isTradeLocked,
      tradeParticipants: saved.tradeParticipants,
      tradeDone: saved.tradeDone,
      history: [...saved.history],
      summary: saved.summary,
      lastSummarizedAt: saved.lastSummarizedAt,
    });

    return true;
  }

  delete(campaignId: string): void {
    this.campaigns.delete(campaignId);
    this.pendingSaves.delete(campaignId);
    const filePath = path.join(this.dataDir, `${campaignId}.json`);
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to delete campaign file:', err.message);
      }
    }
  }
}
