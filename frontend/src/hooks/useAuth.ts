import { useAuthStore } from '../stores/authStore';
import type { AuthState } from '../stores/authStore';

export function useAuth<T>(selector: (state: AuthState) => T): T {
  return useAuthStore(selector);
}
