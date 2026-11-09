import { apiFetch } from '../client';
import type { KakaoLoginRequest, LoginResponse } from '../../types/auth';
import { env } from '../../utils/env';

// 카카오 인가 코드를 서버에 넘기고 우리 서비스의 JWT 를 받습니다.
// TODO(백엔드 협의): URL·요청/응답 형식은 임시입니다. docs/api.md 확정 후 맞춰주세요.
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
  return apiFetch<LoginResponse>('/auth/kakao', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
