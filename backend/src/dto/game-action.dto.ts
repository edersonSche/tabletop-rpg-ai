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
