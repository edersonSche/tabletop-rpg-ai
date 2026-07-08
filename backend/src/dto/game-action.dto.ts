export class GameActionDto {
  message: string;
}

export class RollDto {}

export class CreateCampaignDto {
  name: string;
  language: string;
}

export class JoinRoomDto {
  roomId: string;
}

export class CreateCharacterDto {
  roomId: string;
  name: string;
}

export class EquipItemDto {
  roomId: string;
  playerId: string;
  itemId: string;
  slot: 'body' | 'mainHand' | 'offHand';
}

export class UnequipItemDto {
  roomId: string;
  playerId: string;
  slot: 'body' | 'mainHand' | 'offHand';
}

export class UseItemDto {
  roomId: string;
  playerId: string;
  itemId: string;
}

export class InitiateTradeDto {
  roomId: string;
  playerId: string;
}

export class BuyItemDto {
  roomId: string;
  playerId: string;
  merchantId: string;
  merchantItemId: string;
  quantity?: number;
}

export class SellItemDto {
  roomId: string;
  playerId: string;
  merchantId: string;
  itemId: string;
  quantity?: number;
}

export class EndTradeDto {
  roomId: string;
  playerId: string;
}
