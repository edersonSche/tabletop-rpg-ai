import { Global, Module } from '@nestjs/common';
import { GameState } from '../game/game.state';
import { DiceService } from '../game/dice.service';
import { CampaignStore } from '../campaign/campaign.store';
import { RoomModule } from '../room/room.module';

@Global()
@Module({
  imports: [RoomModule],
  providers: [GameState, DiceService, CampaignStore],
  exports: [GameState, DiceService, CampaignStore],
})
export class SharedModule {}
