import { parseOAuthRedirect, isKakaoAuthorizeUrl } from '../src/app/oauth';
import { loginWithKakao } from '../src/api/endpoints/auth';
import { env } from '../src/utils/env';
const redirect = 'http://localhost:8080/auth/kakao/callback';
const transport = globalThis.fetch;
const mode = env.useMockApi;
afterEach(() => {
  globalThis.fetch = transport;
  env.useMockApi = mode;
});
test('OAuth checks exact redirect and a single matching state/code', () => {
  expect(
    parseOAuthRedirect(redirect + '?code=abc&state=nonce', redirect, 'nonce'),
  ).toEqual({ code: 'abc' });
  expect(
    parseOAuthRedirect(
      redirect + '-evil?code=abc&state=nonce',
      redirect,
      'nonce',
    ),
  ).toBeNull();
  for (const query of [
    '?code=abc',
    '?code=abc&state=wrong',
    '?code=abc&state=nonce&state=nonce',
    '?code=a&code=b&state=nonce',
  ])
    expect(() =>
      parseOAuthRedirect(redirect + query, redirect, 'nonce'),
    ).toThrow();
  expect(
    isKakaoAuthorizeUrl(
      'https://evil.example/oauth/authorize?response_type=code&redirect_uri=' +
        encodeURIComponent(redirect) +
        '&state=nonce',
      redirect,
      'nonce',
    ),
  ).toBe(false);
});
test('profile-only or mock backend responses never become real service sessions', async () => {
  env.useMockApi = false;
  for (const data of [
    { profile: { kakaoId: '123' } },
    {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: { id: 1, nickname: 'preview', profileImageUrl: null },
    },
  ]) {
    globalThis.fetch = jest.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({ success: true, data, message: null }),
        } as Response),
    );
    await expect(
      loginWithKakao({
        code: 'code',
        redirectUri: redirect,
        state: 'nonce',
        flowToken: 'flow',
      }),
    ).rejects.toThrow('서버 로그인 응답');
  }
});
