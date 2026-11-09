import { create } from 'zustand';
import { setTokenGetter } from '../api/client';
import type { LoginResponse, User } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (session: LoginResponse) => void;
  logout: () => void;
}

// 지금은 메모리에만 보관합니다. (앱을 다시 켜면 로그아웃 상태)
export const useAuthStore = create<AuthState>(set => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setSession: ({ accessToken, refreshToken, user }) =>
    set({ accessToken, refreshToken, user }),
  logout: () => set({ accessToken: null, refreshToken: null, user: null }),
}));

setTokenGetter(() => useAuthStore.getState().accessToken);
