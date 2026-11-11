/* eslint-env jest */
// WebView 는 네이티브 모듈이라 테스트에서는 빈 View 로 대체합니다.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { __esModule: true, WebView: View, default: View };
});

// The native persistence boundary is in-memory in unit tests only.
jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map();
  return { __esModule: true, default: {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  } };
});
