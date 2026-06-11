export class GameActionDto {
  message: string;
}

export class RollDto {}

export class CreateRoomDto {
  name: string;
  playerName: string;
}

export class JoinRoomDto {
  roomId: string;
  playerName: string;
}
