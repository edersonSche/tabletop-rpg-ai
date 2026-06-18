import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { AuthService } from './auth.service';

@Injectable()
export class AuthWsGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    if (!this.authService.isAuthenticated(client.id)) {
      client.emit('game:error', { message: 'Authentication required' });
      return false;
    }
    return true;
  }
}
