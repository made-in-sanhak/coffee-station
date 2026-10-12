import { env } from './env';

export const buildKakaoAuthorizeUrl = () =>
  'https://kauth.kakao.com/oauth/authorize?response_type=code' +
  `&client_id=${encodeURIComponent(env.kakaoRestApiKey)}` +
  `&redirect_uri=${encodeURIComponent(env.kakaoRedirectUri)}`;

export type KakaoRedirectResult =
  | { type: 'code'; code: string }
  | { type: 'error'; message: string };

const getQueryParam = (url: string, name: string) => {
  const match = url.match(new RegExp(`[?&]${name}=([^&#]*)`));
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
};

// 카카오가 Redirect URI 로 돌려보낸 주소에서 인가 코드를 꺼냅니다.
// Redirect URI 가 아니면 null 을 돌려줍니다.
export function parseKakaoRedirect(url: string): KakaoRedirectResult | null {
  if (!url.startsWith(env.kakaoRedirectUri)) {
    return null;
  }
  const code = getQueryParam(url, 'code');
  if (code) {
    return { type: 'code', code };
  }
  const error = getQueryParam(url, 'error');
  return {
    type: 'error',
    message:
      error === 'access_denied'
        ? '로그인을 취소했습니다.'
        : getQueryParam(url, 'error_description') ??
          '카카오 로그인에 실패했습니다.',
  };
}
