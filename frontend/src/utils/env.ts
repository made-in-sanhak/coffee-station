import {
  KAKAO_MAP_JS_KEY,
  KAKAO_REDIRECT_URI,
  KAKAO_REST_API_KEY,
  USE_MOCK_API,
} from '@env';

export const env = {
  kakaoRestApiKey: KAKAO_REST_API_KEY ?? '',
  // 카카오 개발자 콘솔에 등록한 Redirect URI 와 글자 하나까지 같아야 합니다.
  kakaoRedirectUri:
    KAKAO_REDIRECT_URI || 'http://localhost:8080/auth/kakao/callback',
  kakaoMapJsKey: KAKAO_MAP_JS_KEY ?? '',
  // 백엔드 API 가 나오기 전까지는 가짜 데이터로 동작합니다.
  // 실제 서버에 붙일 때 .env 에 USE_MOCK_API=false 를 넣으세요.
  useMockApi: USE_MOCK_API !== 'false',
};
