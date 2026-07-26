import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { OpencodeProvider } from './providers/opencode.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { AIConfig, AIProvider } from './ai.interface';

@Module({
  providers: [
    AiService,
    OpencodeProvider,
    OpenRouterProvider,
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
      useFactory: (
        config: AIConfig,
        opencodeProvider: OpencodeProvider,
        openrouterProvider: OpenRouterProvider,
      ): AIProvider => {
        switch (config.provider) {
          case 'opencode':
            return opencodeProvider;
          case 'openrouter':
            return openrouterProvider;
          default:
            throw new Error(
              `Invalid AI_PROVIDER: "${config.provider}". Valid values: "opencode", "openrouter"`,
            );
        }
      },
      inject: ['AI_CONFIG', OpencodeProvider, OpenRouterProvider],
    },
  ],
  exports: [AiService, 'AI_PROVIDER', 'AI_CONFIG'],
})
export class AiModule {}
