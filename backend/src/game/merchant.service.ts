import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, Merchant } from './game.state';

@Injectable()
export class MerchantService {
  constructor(private gameState: GameState) {}

  adjustMerchantPrices(merchants: Merchant[], chaMod: number): Merchant[] {
    return merchants.map(m => ({
      ...m,
      inventory: m.inventory.map(item => ({
        ...item,
        buyPrice: Math.max(1, Math.round(item.buyPrice * (1 - chaMod * 0.05))),
        sellPrice: Math.max(1, Math.round(item.sellPrice * (0.5 + chaMod * 0.05))),
      })),
    }));
  }

  getMerchant(roomId: string, merchantId: string): Merchant | undefined {
    const room = this.gameState.getRoom(roomId);
    if (!room?.merchants) return undefined;
    return room.merchants.find(m => m.id === merchantId);
  }

  buyFromMerchant(
    roomId: string, playerId: string, merchantId: string,
    merchantItemId: string, quantity = 1,
  ): { success: boolean; error?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    const merchant = room.merchants?.find(m => m.id === merchantId);
    if (!merchant) return { success: false, error: 'Merchant not found' };

    const merchantItem = merchant.inventory.find(i => i.id === merchantItemId);
    if (!merchantItem) return { success: false, error: 'Item not found in merchant inventory' };
    if (merchantItem.quantity < quantity) return { success: false, error: 'Not enough stock' };

    const chaMod = Math.floor((player.attributes.charisma - 10) / 2);
    const adjustedPrice = Math.max(1, Math.round(merchantItem.buyPrice * (1 - chaMod * 0.05)));
    const totalCost = adjustedPrice * quantity;

    if (player.coins < totalCost) return { success: false, error: 'Not enough coins' };

    player.coins -= totalCost;
    merchant.coins += totalCost;

    const existing = player.inventory.find(i => i.name === merchantItem.name && i.type === merchantItem.type);
    if (existing) {
      existing.quantity += quantity;
    } else {
      player.inventory.push({
        id: uuid(),
        name: merchantItem.name,
        description: merchantItem.description,
        type: merchantItem.type,
        quantity,
        slot: merchantItem.slot,
        effects: merchantItem.effects ? JSON.parse(JSON.stringify(merchantItem.effects)) : [],
      });
    }

    merchantItem.quantity -= quantity;
    if (merchantItem.quantity <= 0) {
      merchant.inventory = merchant.inventory.filter(i => i.id !== merchantItemId);
    }

    return { success: true };
  }

  private getDefaultSellPrice(type: string): number {
    const prices: Record<string, number> = {
      weapon: 15,
      armor: 20,
      potion: 10,
      scroll: 15,
      key_item: 50,
      misc: 5,
    };
    return prices[type] ?? 5;
  }

  private getMerchantSellPrice(merchant: Merchant, itemName: string, itemType: string, chaMod: number): number {
    const stocked = merchant.inventory.find(i => i.name === itemName && i.type === itemType);
    const basePrice = stocked ? stocked.sellPrice : this.getDefaultSellPrice(itemType);
    return Math.max(1, Math.round(basePrice * (0.5 + chaMod * 0.05)));
  }

  sellToMerchant(
    roomId: string, playerId: string, merchantId: string,
    itemId: string, quantity = 1,
  ): { success: boolean; error?: string } {
    const room = this.gameState.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    const merchant = room.merchants?.find(m => m.id === merchantId);
    if (!merchant) return { success: false, error: 'Merchant not found' };

    const itemIndex = player.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return { success: false, error: 'Item not found in inventory' };

    const item = player.inventory[itemIndex];
    if (item.quantity < quantity) return { success: false, error: 'Not enough quantity' };

    const chaMod = Math.floor((player.attributes.charisma - 10) / 2);
    const unitPrice = this.getMerchantSellPrice(merchant, item.name, item.type, chaMod);
    const totalValue = unitPrice * quantity;

    if (merchant.coins < totalValue) return { success: false, error: 'Merchant does not have enough coins' };

    merchant.coins -= totalValue;
    player.coins += totalValue;

    if (item.quantity <= quantity) {
      player.inventory.splice(itemIndex, 1);
    } else {
      item.quantity -= quantity;
    }

    const merchantExisting = merchant.inventory.find(i => i.name === item.name && i.type === item.type);
    if (merchantExisting) {
      merchantExisting.quantity += quantity;
    } else {
      merchant.inventory.push({
        id: uuid(),
        name: item.name,
        description: item.description,
        type: item.type,
        quantity,
        slot: item.slot,
        effects: item.effects ? JSON.parse(JSON.stringify(item.effects)) : [],
        buyPrice: Math.round(unitPrice * 2),
        sellPrice: unitPrice,
      });
    }

    return { success: true };
  }

  clearMerchants(roomId: string): void {
    const room = this.gameState.getRoom(roomId);
    if (!room) return;
    room.merchants = undefined;
    room.merchantsLocation = undefined;
  }
}
