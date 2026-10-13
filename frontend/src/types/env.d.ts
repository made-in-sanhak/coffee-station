// babel.config.js 의 react-native-dotenv 가 루트 .env 값을 넣어줍니다.
declare module '@env' {
  export const KAKAO_REST_API_KEY: string | undefined;
  export const KAKAO_REDIRECT_URI: string | undefined;
  export const KAKAO_MAP_JS_KEY: string | undefined;
  export const USE_MOCK_API: string | undefined;
}
