/* eslint-env jest */
// WebView 는 네이티브 모듈이라 테스트에서는 빈 View 로 대체합니다.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { __esModule: true, WebView: View, default: View };
});
