jest.mock('../src/utils/kakaoSettingsDefaults', () => ({
  defaultKakaoSettings: {
    kakaoNativeAppKey: '',
    kakaoRestApiKey: 'fixture-env-rest',
    kakaoMapJsKey: 'fixture-env-map',
    kakaoRedirectUri: 'https://fixture.test/callback',
  },
}));

import { useKakaoSettingsStore } from '../src/store/kakaoSettingsStore';
import { defaultKakaoSettings } from '../src/utils/kakaoSettingsDefaults';

test('blank saved settings restore the environment defaults during hydration', () => {
  useKakaoSettingsStore.getState().loadSettings({
    kakaoNativeAppKey: '  ',
    kakaoRestApiKey: '',
    kakaoMapJsKey: '   ',
    kakaoRedirectUri: '',
  });
  expect(useKakaoSettingsStore.getState().settings).toEqual(defaultKakaoSettings);
});

test('missing saved settings use the environment defaults', () => {
  useKakaoSettingsStore.getState().loadSettings(null);
  expect(useKakaoSettingsStore.getState().settings).toEqual(defaultKakaoSettings);
});

test('nonempty saved settings retain their trimmed overrides', () => {
  useKakaoSettingsStore.getState().loadSettings({
    kakaoNativeAppKey: ' custom-native ',
    kakaoRestApiKey: ' custom-rest ',
    kakaoMapJsKey: ' custom-map ',
    kakaoRedirectUri: ' https://custom.test/callback ',
  });
  expect(useKakaoSettingsStore.getState().settings).toEqual({
    kakaoNativeAppKey: 'custom-native',
    kakaoRestApiKey: 'custom-rest',
    kakaoMapJsKey: 'custom-map',
    kakaoRedirectUri: 'https://custom.test/callback',
  });
});
