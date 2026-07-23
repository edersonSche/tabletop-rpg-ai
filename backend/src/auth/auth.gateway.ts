import { UsePipes } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { AuthLoginSchema } from '../dto/schemas';

@WebSocketGateway()
export class AuthGateway implements OnGatewayDisconnect {
  constructor(private authService: AuthService) {}

  @SubscribeMessage('auth:login')
  @UsePipes(new ZodValidationPipe(AuthLoginSchema))
  handleLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const { userId } = data as { userId: string };

    const success = this.authService.login(userId.trim(), client.id);
    if (!success) {
      return { success: false, error: 'User already connected' };
    }

    return { success: true };
  }

  async handleDisconnect(client: Socket) {
    this.authService.logout(client.id);
  }
}
