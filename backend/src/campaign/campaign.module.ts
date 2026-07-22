import { Module, forwardRef } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { RoomModule } from '../room/room.module';
import { CampaignStore } from './campaign.store';

@Module({
  imports: [
    GameModule,
    forwardRef(() => RoomModule),
  ],
  providers: [CampaignStore],
  exports: [CampaignStore],
})
export class CampaignModule {}
