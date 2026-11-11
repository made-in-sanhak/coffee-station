import { create } from 'zustand';
import { persistKakaoSettings } from '../storage/kakaoSettingsStorage';
import { defaultKakaoSettings } from '../utils/kakaoSettingsDefaults';

export type KakaoSettings = typeof defaultKakaoSettings;

interface KakaoSettingsState {
  settings: KakaoSettings;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  loadSettings: (value: unknown) => void;
  storageFailed: (message: string) => void;
  saveSettings: (settings: KakaoSettings) => Promise<void>;
}

function readSettings(value: unknown): KakaoSettings {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const read = (key: keyof KakaoSettings) =>
    typeof record[key] === 'string'
      ? (record[key] as string).trim() || defaultKakaoSettings[key]
      : defaultKakaoSettings[key];
  return {
    kakaoNativeAppKey: read('kakaoNativeAppKey'),
    kakaoRestApiKey: read('kakaoRestApiKey'),
    kakaoMapJsKey: read('kakaoMapJsKey'),
    kakaoRedirectUri: read('kakaoRedirectUri'),
  };
}

export const useKakaoSettingsStore = create<KakaoSettingsState>((set, get) => ({
  settings: { ...defaultKakaoSettings },
  status: 'loading',
  error: null,
  loadSettings: value =>
    set({ settings: readSettings(value), status: 'ready', error: null }),
  storageFailed: message => set({ status: 'error', error: message }),
  saveSettings: async input => {
    if (get().status !== 'ready') {
      throw new Error(
        get().error ?? '설정을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.',
      );
    }
    const settings = readSettings(input);
    if (
      settings.kakaoRedirectUri &&
      !/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/.test(settings.kakaoRedirectUri)
    ) {
      throw new Error(
        'Redirect URI는 http:// 또는 https://로 시작하는 주소를 입력해 주세요.',
      );
    }
    await persistKakaoSettings(settings);
    set({ settings, error: null });
  },
}));
