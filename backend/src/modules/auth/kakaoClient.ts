import { AppError } from '../../common/AppError';

export interface KakaoConfig {
  restApiKey: string;
  clientSecret: string;
  redirectUri: string;
}

export interface KakaoProfile {
  kakaoId: string;
  nickname: string;
  profileImageUrl: string | null;
}

// 카카오 응답이 JSON 이 아니어도 실패로 처리하기 위해 안전하게 읽습니다.
const readJson = async (res: Response): Promise<Record<string, unknown>> => {
  try {
    const body: unknown = await res.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

/**
 * 인가 코드 → 카카오 액세스 토큰
 * 콘솔에서 클라이언트 시크릿을 켜면 client_secret 이 없을 때 KOE010 이 납니다.
 * 시크릿·인가 코드·토큰은 절대 로그에 남기지 않습니다. (카카오 error_code 만 기록)
 */
export async function exchangeKakaoCode(code: string, config: KakaoConfig): Promise<string> {
  if (!config.restApiKey || !config.clientSecret || !config.redirectUri) {
    throw new AppError(500, '카카오 로그인 설정이 없습니다.');
  }
  let res: Response;
  try {
    res = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.restApiKey,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      }),
    });
  } catch {
    console.warn('Kakao token exchange failed: network');
    throw new AppError(401, '카카오 로그인에 실패했습니다. 다시 시도해 주세요.');
  }
  const data = await readJson(res);
  if (!res.ok || typeof data.access_token !== 'string' || !data.access_token) {
    console.warn('Kakao token exchange failed:', typeof data.error_code === 'string' ? data.error_code : res.status);
    throw new AppError(401, '카카오 로그인에 실패했습니다. 다시 시도해 주세요.');
  }
  return data.access_token;
}

// 카카오 액세스 토큰 → 사용자 정보
export async function fetchKakaoUser(accessToken: string): Promise<KakaoProfile> {
  let res: Response;
  try {
    res = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new AppError(401, '카카오 사용자 정보를 가져오지 못했습니다.');
  }
  const data = await readJson(res);
  if (!res.ok || (typeof data.id !== 'number' && typeof data.id !== 'string')) {
    throw new AppError(401, '카카오 사용자 정보를 가져오지 못했습니다.');
  }
  // 닉네임·사진은 kakao_account.profile(신규) 또는 properties(구버전)에 있습니다.
  const account = data.kakao_account as { profile?: { nickname?: unknown; profile_image_url?: unknown } } | undefined;
  const properties = data.properties as { nickname?: unknown; profile_image?: unknown } | undefined;
  const text = (...values: unknown[]) => values.find((v): v is string => typeof v === 'string' && v.length > 0);
  return {
    kakaoId: String(data.id),
    nickname: text(account?.profile?.nickname, properties?.nickname) ?? '커피 주유소 사용자',
    profileImageUrl: text(account?.profile?.profile_image_url, properties?.profile_image) ?? null,
  };
}
