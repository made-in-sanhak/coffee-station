import { KAKAO_MAP_JS_KEY, KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from '@env';

export const defaultKakaoSettings = {
  kakaoNativeAppKey: '',
  kakaoRestApiKey: KAKAO_REST_API_KEY ?? '',
  kakaoMapJsKey: KAKAO_MAP_JS_KEY ?? '',
  kakaoRedirectUri:
    KAKAO_REDIRECT_URI || 'http://localhost:8080/auth/kakao/callback',
};
