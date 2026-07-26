import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { RoomModule } from '../room/room.module';
import { CampaignStore } from './campaign.store';

@Module({
  imports: [
    GameModule,
    RoomModule,
  ],
  providers: [CampaignStore],
  exports: [CampaignStore],
})
export class CampaignModule {}
