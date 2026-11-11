import { create } from 'zustand';
import { setTokenGetter } from '../api/client';
import { classifyParkSession } from '../integration/parkSession';
import type { LoginReturnTarget } from '../navigation/types';
import type { LoginResponse, User } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  loginReturn: LoginReturnTarget | null;
  setSession: (session: LoginResponse, returnTo?: LoginReturnTarget) => void;
  takeLoginReturn: () => LoginReturnTarget | null;
  logout: () => void;
}

// 지금은 메모리에만 보관합니다. (앱을 다시 켜면 로그아웃 상태)
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  loginReturn: null,
  setSession: (session, returnTo) => {
    const { accessToken, refreshToken, user } = session;
    set({
      accessToken,
      refreshToken,
      user,
      loginReturn: returnTo && classifyParkSession(session) ? returnTo : null,
    });
  },
  takeLoginReturn: () => {
    const { loginReturn } = get();
    if (loginReturn) set({ loginReturn: null });
    return loginReturn;
  },
  logout: () => set({ accessToken: null, refreshToken: null, user: null, loginReturn: null }),
}));

setTokenGetter(() => useAuthStore.getState().accessToken);
