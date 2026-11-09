module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        // 저장소 루트의 .env 를 같이 씁니다.
        path: '../.env',
        // 앱에 들어가도 되는 값만 허용 (서버용 비밀값이 번들에 섞이지 않도록)
        allowlist: [
          'KAKAO_REST_API_KEY',
          'KAKAO_REDIRECT_URI',
          'KAKAO_MAP_JS_KEY',
          'USE_MOCK_API',
        ],
        allowUndefined: true,
        quiet: true,
      },
    ],
  ],
};
