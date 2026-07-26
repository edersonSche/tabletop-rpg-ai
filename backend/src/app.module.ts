import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { GameModule } from './game/game.module';
import { RoomModule } from './room/room.module';
import { CampaignModule } from './campaign/campaign.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    AuthModule,
    AiModule,
    GameModule,
    RoomModule,
    CampaignModule,
  ],
})
export class AppModule {}
