import { Module } from '@nestjs/common';
import { AuthGateway } from './auth.gateway';
import { AuthService } from './auth.service';
import { AuthWsGuard } from './auth.guard';

@Module({
  providers: [AuthGateway, AuthService, AuthWsGuard],
  exports: [AuthService, AuthWsGuard],
})
export class AuthModule {}
