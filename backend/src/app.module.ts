import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { TurnManager } from './game/turn.manager';
import { GameState } from './game/game.state';
import { DiceService } from './game/dice.service';
import { ConditionEngine } from './game/condition.engine';
import { MerchantService } from './game/merchant.service';
import { LevelingService } from './game/leveling.service';
import { PlayerService } from './game/player.service';
import { RoomGateway } from './room/room.gateway';
import { RoomService } from './room/room.service';
import { AiService } from './ai/ai.service';
import { OpencodeProvider } from './ai/providers/opencode.provider';
import { AIConfig } from './ai/ai.interface';
import { CampaignStore } from './campaign/campaign.store';

@Module({
  imports: [ConfigModule.forRoot(), AuthModule],
  providers: [
    GameGateway,
    GameService,
    TurnManager,
    GameState,
    DiceService,
    ConditionEngine,
    MerchantService,
    LevelingService,
    PlayerService,
    RoomGateway,
    RoomService,
    AiService,
    CampaignStore,
    {
      provide: 'AI_CONFIG',
      useFactory: (configService: ConfigService): AIConfig => ({
        provider: configService.get('AI_PROVIDER', 'opencode'),
        apiKey: configService.get('AI_API_KEY', ''),
        model: configService.get('AI_MODEL', ''),
        baseUrl: configService.get('AI_BASE_URL', 'http://localhost:4096'),
      }),
      inject: [ConfigService],
    },
    {
      provide: 'AI_PROVIDER',
      useFactory: (aiConfig: AIConfig) => {
        const provider = new OpencodeProvider();
        provider.configure(aiConfig);
        return provider;
      },
      inject: ['AI_CONFIG'],
    },
  ],
})
export class AppModule {}
