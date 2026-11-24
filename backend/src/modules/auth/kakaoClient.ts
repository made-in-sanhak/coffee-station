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

// 카카오 호출 한 번(응답 본문 읽기 포함)에 기다리는 최대 시간
export const KAKAO_TIMEOUT_MS = 5000;

const KAKAO_SLOW = '카카오 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.';
const KAKAO_DOWN = '카카오 로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';

type KakaoCall =
  | { kind: 'response'; status: number; ok: boolean; data: Record<string, unknown> }
  | { kind: 'timeout' }
  | { kind: 'network' };

// 기한 안에 응답과 본문을 받습니다. 카카오 응답이 JSON 이 아니어도 실패로 처리하기 위해 안전하게 읽습니다.
async function callKakao(url: string, init: RequestInit, timeoutMs: number): Promise<KakaoCall> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    let data: Record<string, unknown> = {};
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object') data = body as Record<string, unknown>;
    } catch {
      if (controller.signal.aborted) return { kind: 'timeout' };
    }
    return { kind: 'response', status: res.status, ok: res.ok, data };
  } catch {
    return controller.signal.aborted ? { kind: 'timeout' } : { kind: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// 카카오 쪽 문제(지연·연결 실패·5xx)는 502/504 로, 인가 코드·토큰 거절(4xx)은 401 로 구분합니다.
function kakaoFailure(call: KakaoCall, step: string, rejectedMessage: string): AppError {
  if (call.kind === 'timeout') {
    console.warn(`${step} failed: timeout`);
    return new AppError(504, KAKAO_SLOW);
  }
  if (call.kind === 'network') {
    console.warn(`${step} failed: network`);
    return new AppError(502, KAKAO_DOWN);
  }
  const code = typeof call.data.error_code === 'string' ? call.data.error_code : call.status;
  console.warn(`${step} failed: ${code}`);
  return call.status >= 500 ? new AppError(502, KAKAO_DOWN) : new AppError(401, rejectedMessage);
}

/**
 * 인가 코드 → 카카오 액세스 토큰
 * 콘솔에서 클라이언트 시크릿을 켜면 client_secret 이 없을 때 KOE010 이 납니다.
 * 시크릿·인가 코드·토큰은 절대 로그에 남기지 않습니다. (카카오 error_code 만 기록)
 */
export async function exchangeKakaoCode(
  code: string,
  config: KakaoConfig,
  timeoutMs = KAKAO_TIMEOUT_MS,
): Promise<string> {
  if (!config.restApiKey || !config.clientSecret || !config.redirectUri) {
    throw new AppError(500, '카카오 로그인 설정이 없습니다.');
  }
  const call = await callKakao(
    'https://kauth.kakao.com/oauth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.restApiKey,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      }),
    },
    timeoutMs,
  );
  if (call.kind === 'response' && call.ok && typeof call.data.access_token === 'string' && call.data.access_token) {
    return call.data.access_token;
  }
  throw kakaoFailure(call, 'Kakao token exchange', '카카오 로그인에 실패했습니다. 다시 시도해 주세요.');
}

// 카카오 액세스 토큰 → 사용자 정보
export async function fetchKakaoUser(accessToken: string, timeoutMs = KAKAO_TIMEOUT_MS): Promise<KakaoProfile> {
  const call = await callKakao(
    'https://kapi.kakao.com/v2/user/me',
    { headers: { Authorization: `Bearer ${accessToken}` } },
    timeoutMs,
  );
  if (call.kind !== 'response' || !call.ok || (typeof call.data.id !== 'number' && typeof call.data.id !== 'string')) {
    throw kakaoFailure(call, 'Kakao user lookup', '카카오 사용자 정보를 가져오지 못했습니다.');
  }
  const data = call.data;
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
