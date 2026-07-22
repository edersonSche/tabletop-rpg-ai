import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { GameModule } from '../game/game.module';
import { CampaignModule } from '../campaign/campaign.module';
import { RoomGateway } from './room.gateway';
import { RoomService } from './room.service';
import { CampaignStore } from '../campaign/campaign.store';

@Module({
  imports: [
    AuthModule,
    AiModule,
    GameModule,
    forwardRef(() => CampaignModule),
  ],
  providers: [RoomGateway, RoomService, CampaignStore],
  exports: [RoomGateway, RoomService, CampaignStore],
})
export class RoomModule {}
