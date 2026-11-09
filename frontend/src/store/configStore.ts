import { create } from 'zustand';
import { native } from '../app/native';
const KEY = 'coffee.config.v1';
let revision = 0;
interface ConfigState {
  backendUrl: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setBackendUrl: (url: string) => Promise<void>;
}
export function normalizeBackendUrl(input: string): string {
  const value = input.trim().replace(/\/+$/, '');
  if (value && !/^https:\/\/[^\s/?#:@]+(?::\d+)?(?:\/[^\s?#]*)?$/.test(value))
    throw new Error('서버 주소는 https://로 시작하는 주소를 입력해 주세요.');
  return value;
}
export const useConfigStore = create<ConfigState>(set => ({
  backendUrl: '',
  hydrated: false,
  hydrate: async () => {
    const current = revision;
    try {
      const value = await native.secureGet(KEY);
      if (revision !== current) return;
      set({
        backendUrl: value ? normalizeBackendUrl(value) : '',
        hydrated: true,
      });
    } catch {
      if (revision !== current) return;
      set({ hydrated: true });
    }
  },
  setBackendUrl: async input => {
    const backendUrl = normalizeBackendUrl(input);
    revision++;
    await native.secureSet(KEY, backendUrl);
    set({ backendUrl, hydrated: true });
  },
}));
