import { ReactNode } from 'react';
import { SocketProvider } from './SocketContext';
import { AuthProvider } from './AuthContext';
import { PlayerProvider } from './PlayerContext';
import { GameProvider } from './GameContext';
import { TradeProvider } from './TradeContext';
import { InventoryProvider } from './InventoryContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SocketProvider>
      <AuthProvider>
        <PlayerProvider>
          <GameProvider>
            <TradeProvider>
              <InventoryProvider>
                {children}
              </InventoryProvider>
            </TradeProvider>
          </GameProvider>
        </PlayerProvider>
      </AuthProvider>
    </SocketProvider>
  );
}
