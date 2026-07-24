import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { TurnManager } from './turn.manager';
import { ConditionEngine } from './condition.engine';
import { MerchantService } from './merchant.service';
import { TradeService } from './trade.service';
import { LevelingService } from './leveling.service';
import { PlayerService } from './player.service';

@Module({
  imports: [AuthModule, AiModule],
  providers: [
    GameGateway,
    GameService,
    TurnManager,
    ConditionEngine,
    MerchantService,
    TradeService,
    LevelingService,
    PlayerService,
  ],
  exports: [
    GameGateway,
    GameService,
    TurnManager,
    ConditionEngine,
    MerchantService,
    TradeService,
    LevelingService,
    PlayerService,
  ],
})
export class GameModule {}
