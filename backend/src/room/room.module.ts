import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { GameModule } from '../game/game.module';
import { RoomGateway } from './room.gateway';
import { RoomService } from './room.service';

@Module({
  imports: [
    AuthModule,
    AiModule,
    GameModule,
  ],
  providers: [RoomGateway, RoomService],
  exports: [RoomGateway, RoomService],
})
export class RoomModule {}
