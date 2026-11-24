import { env } from '../../config/env';
import { AppError } from '../../common/AppError';
export interface Profile {
  kakaoId: string;
  nickname: string;
  profileImageUrl: string | null;
}
export function loginConfig() {
  if (
    !env.kakao.restApiKey ||
    !env.kakao.redirectUri ||
    env.jwtSecret.length < 32 ||
    env.jwtSecret.startsWith('change-me')
  )
    throw new AppError(
      503,
      '카카오 로그인 또는 서비스 인증 설정이 필요합니다.',
    );
  try {
    const u = new URL(env.kakao.redirectUri);
    if (
      !['http:', 'https:'].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.hash ||
      u.search
    )
      throw 0;
  } catch {
    throw new AppError(503, '카카오 Redirect URI 설정을 확인해 주세요.');
  }
}
async function kakaoJson(
  url: string,
  init: RequestInit,
): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'error',
    });
    const data: unknown = await response.json();
    if (
      !response.ok ||
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    )
      throw new AppError(
        response.status >= 500 ? 502 : 401,
        '카카오 인증에 실패했습니다. 다시 로그인해 주세요.',
      );
    return data as Record<string, any>;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      controller.signal.aborted ? 504 : 502,
      '카카오 인증 서버에 연결하지 못했습니다. 다시 시도해 주세요.',
    );
  } finally {
    clearTimeout(timer);
  }
}
export async function kakaoProfile(code: string): Promise<Profile> {
  loginConfig();
  const data = await kakaoJson('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.kakao.restApiKey,
      redirect_uri: env.kakao.redirectUri,
      code,
      ...(env.kakao.clientSecret
        ? { client_secret: env.kakao.clientSecret }
        : {}),
    }),
  });
  if (typeof data.access_token !== 'string' || !data.access_token)
    throw new AppError(502, '카카오 토큰 응답을 확인할 수 없습니다.');
  const profile = await kakaoJson('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: 'Bearer ' + data.access_token },
  });
  if (
    !(
      typeof profile.id === 'number' &&
      Number.isSafeInteger(profile.id) &&
      profile.id > 0
    ) &&
    !(typeof profile.id === 'string' && /^[1-9]\d{0,19}$/.test(profile.id))
  )
    throw new AppError(502, '카카오 사용자 정보를 확인할 수 없습니다.');
  const nickname =
    profile.kakao_account?.profile?.nickname ?? profile.properties?.nickname;
  const image =
    profile.kakao_account?.profile?.profile_image_url ??
    profile.properties?.profile_image;
  let profileImageUrl: string | null = null;
  if (typeof image === 'string' && image.length <= 2048) {
    try {
      const u = new URL(image);
      if (u.protocol === 'https:' && !u.username && !u.password)
        profileImageUrl = image;
    } catch {}
  }
  return {
    kakaoId: String(profile.id),
    nickname:
      typeof nickname === 'string' && nickname.trim()
        ? nickname.trim().slice(0, 50)
        : '커피 주유소 사용자',
    profileImageUrl,
  };
}
