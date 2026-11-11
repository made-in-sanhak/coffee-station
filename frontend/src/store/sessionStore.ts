import { create } from 'zustand';
import type { AppUser } from '../app/domain';
import { queryClient } from '../app/queryClient';
import { classifyParkSession } from '../integration/parkSession';
import { useAuthStore } from './authStore';

interface SessionState {
  user: AppUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}
const empty = { user: null, accessToken: null, refreshToken: null };
export const useSessionStore = create<SessionState>(() => ({
  ...(classifyParkSession(useAuthStore.getState()) ?? empty),
  hydrated: true,
  loading: false,
  hydrate: async () => {},
  logout: async () => { useAuthStore.getState().logout(); },
}));

// Park owns authentication and intentionally keeps it in memory. This is only
// the screen-facing string-ID view; preview tokens never gain service identity.
useAuthStore.subscribe((state, previous) => {
  const session = classifyParkSession(state);
  useSessionStore.setState(session ?? empty);
  if (state.user?.id !== previous.user?.id || state.accessToken !== previous.accessToken)
    queryClient.clear();
});
