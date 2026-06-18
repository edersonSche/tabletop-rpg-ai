import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { TurnManager } from './game/turn.manager';
import { GameState } from './game/game.state';
import { RoomGateway } from './room/room.gateway';
import { RoomService } from './room/room.service';
import { AiService } from './ai/ai.service';
import { OpenRouterProvider } from './ai/providers/openrouter.provider';
import { OpencodeProvider } from './ai/providers/opencode.provider';
import { AIConfig } from './ai/ai.interface';

@Module({
  imports: [ConfigModule.forRoot(), AuthModule],
  providers: [
    GameGateway,
    GameService,
    TurnManager,
    GameState,
    RoomGateway,
    RoomService,
    AiService,
    {
      provide: 'AI_CONFIG',
      useFactory: (configService: ConfigService): AIConfig => ({
        provider: configService.get('AI_PROVIDER', 'openrouter'),
        apiKey: configService.get('AI_API_KEY', ''),
        model: configService.get('AI_MODEL', 'deepseek/deepseek-chat'),
        baseUrl: configService.get('AI_BASE_URL', 'https://openrouter.ai/api/v1'),
      }),
      inject: [ConfigService],
    },
    {
      provide: 'AI_PROVIDER',
      useFactory: (aiConfig: AIConfig) => {
        const provider = aiConfig.provider === 'opencode'
          ? new OpencodeProvider()
          : new OpenRouterProvider();
        provider.configure(aiConfig);
        return provider;
      },
      inject: ['AI_CONFIG'],
    },
  ],
})
export class AppModule {}
