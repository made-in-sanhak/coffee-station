export function isKakaoAuthorizeUrl(
  value: string,
  redirectUri: string,
  state: string,
): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'kauth.kakao.com' &&
      !url.username &&
      !url.password &&
      url.pathname === '/oauth/authorize' &&
      url.searchParams.get('response_type') === 'code' &&
      url.searchParams.getAll('state').length === 1 &&
      url.searchParams.get('state') === state &&
      url.searchParams.getAll('redirect_uri').length === 1 &&
      url.searchParams.get('redirect_uri') === redirectUri
    );
  } catch {
    return false;
  }
}
export function parseOAuthRedirect(
  value: string,
  redirectUri: string,
  state: string,
): { code: string } | null {
  let url: URL;
  let expected: URL;
  try {
    url = new URL(value);
    expected = new URL(redirectUri);
  } catch {
    return null;
  }
  if (url.origin !== expected.origin || url.pathname !== expected.pathname)
    return null;
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.searchParams.getAll('state').length !== 1 ||
    url.searchParams.get('state') !== state
  )
    throw new Error(
      '로그인 보안 값이 일치하지 않습니다. 다시 로그인해 주세요.',
    );
  const error = url.searchParams.get('error');
  if (error)
    throw new Error(
      error === 'access_denied'
        ? '로그인을 취소했습니다.'
        : '카카오에서 로그인을 완료하지 못했습니다.',
    );
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048)
    throw new Error(
      '카카오 인증 코드를 확인할 수 없습니다. 다시 로그인해 주세요.',
    );
  return { code: codes[0] };
}
