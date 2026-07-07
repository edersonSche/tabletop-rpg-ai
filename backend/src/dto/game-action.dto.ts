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
