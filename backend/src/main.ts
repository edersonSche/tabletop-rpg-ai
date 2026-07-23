import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

class CorsIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any) {
    const origin = process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173';
    return super.createIOServer(port, {
      ...options,
      cors: { origin, credentials: true },
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true,
  });
  app.useWebSocketAdapter(new CorsIoAdapter(app));
  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
