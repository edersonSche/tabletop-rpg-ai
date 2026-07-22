import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { OpencodeProvider } from './providers/opencode.provider';
import { AIConfig } from './ai.interface';

@Module({
  providers: [
    AiService,
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
  exports: [AiService, 'AI_PROVIDER', 'AI_CONFIG'],
})
export class AiModule {}
