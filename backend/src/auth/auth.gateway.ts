import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from './auth.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AuthGateway implements OnGatewayDisconnect {
  constructor(private authService: AuthService) {}

  @SubscribeMessage('auth:login')
  handleLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (!data.userId || !data.userId.trim()) {
      return { success: false, error: 'User ID is required' };
    }

    const success = this.authService.login(data.userId.trim(), client.id);
    if (!success) {
      return { success: false, error: 'User already connected' };
    }

    return { success: true };
  }

  async handleDisconnect(client: Socket) {
    this.authService.logout(client.id);
  }
}
