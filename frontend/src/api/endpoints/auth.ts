import { apiFetch } from '../client';
import type { KakaoLoginRequest, LoginResponse } from '../../types/auth';
import { env } from '../../utils/env';

export interface KakaoLoginStart {
  authorizeUrl: string;
  state: string;
  flowToken: string;
  redirectUri: string;
}
export async function startKakaoLogin(): Promise<KakaoLoginStart> {
  if (env.useMockApi) {
    const state = 'development-preview-only';
    return {
      authorizeUrl:
        'https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=' +
        encodeURIComponent(env.kakaoRestApiKey) +
        '&redirect_uri=' +
        encodeURIComponent(env.kakaoRedirectUri) +
        '&state=' +
        state,
      state,
      flowToken: state,
      redirectUri: env.kakaoRedirectUri,
    };
  }
  return apiFetch<KakaoLoginStart>('/auth/kakao/start', {
    method: 'POST',
    authentication: 'none',
    body: '{}',
  });
}
// Server validates a single-use login flow, exchanges the code and issues service tokens.
export async function loginWithKakao(
  request: KakaoLoginRequest,
): Promise<LoginResponse> {
  if (env.useMockApi) {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: { id: 1, nickname: '테스트 사용자', profileImageUrl: null },
    };
  }
  const response = await apiFetch<LoginResponse>('/auth/kakao', {
    method: 'POST',
    authentication: 'none',
    body: JSON.stringify(request),
  });
  if (
    !response ||
    typeof response.accessToken !== 'string' ||
    !response.accessToken.trim() ||
    /^mock(?:-|$)/i.test(response.accessToken) ||
    typeof response.refreshToken !== 'string' ||
    !response.refreshToken.trim() ||
    /^mock(?:-|$)/i.test(response.refreshToken) ||
    !response.user ||
    !Number.isSafeInteger(response.user.id) ||
    response.user.id < 1 ||
    typeof response.user.nickname !== 'string' ||
    !response.user.nickname.trim() ||
    (response.user.profileImageUrl !== null &&
      typeof response.user.profileImageUrl !== 'string')
  )
    throw new Error('서버 로그인 응답 형식이 올바르지 않습니다.');
  return response;
}
