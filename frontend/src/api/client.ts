// 모든 API 호출은 이 함수를 거칩니다. (서버 주소 + 토큰 자동 첨부 + 공통 응답 처리)
// 기능별 호출 함수는 src/api/endpoints/기능.ts 에 만들고 apiFetch 를 사용하세요.
import { useConfigStore } from '../store/configStore';
import { isParkMockToken } from '../integration/parkSession';
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from '../config/buildEnvironment';

// Android Studio 기본 에뮬레이터에서 노트북의 localhost에 접근하는 주소입니다.
// USB 실기기는 adb reverse 후 앱 설정에서 http://127.0.0.1:8080을 사용합니다.
export const API_BASE_URL = DEFAULT_API_BASE_URL;
export const getApiBaseUrl = () => resolveApiBaseUrl(__DEV__, useConfigStore.getState().backendUrl);
export const BACKEND_AVAILABLE = true;

// 서버 공통 응답 형식 (backend ApiResponse 와 동일)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

// 로그인 후 토큰을 꺼내는 함수 (로그인 구현 시 Zustand store 와 연결)
let getAccessToken: () => string | null = () => null;
export const setTokenGetter = (fn: () => string | null) => {
  getAccessToken = fn;
};

export type ApiRequestOptions = RequestInit & { authentication?: 'none' };
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API 경로가 올바르지 않습니다.');
  const rawToken = getAccessToken();
  const preview = isParkMockToken(rawToken);
  const { authentication, ...requestOptions } = options;
  const privateRead = /^\/api\/(users\/me|coupons|purchases|owner|orders)(?:[/?]|$)/.test(path);
  const method = (options.method ?? 'GET').toUpperCase();
  const developmentRecommendation = __DEV__ && method === 'POST' && [
    '/api/recommendations/search',
    '/api/recommendations/chat/prepare',
    '/api/recommendations/chat/confirm',
  ].includes(path);
  if (preview && path.startsWith('/api/') &&
      (method !== 'GET' || privateRead) && !developmentRecommendation) {
    throw new Error('화면 미리보기 상태입니다. 이 기능은 실제 서비스 로그인 후 이용할 수 있습니다.');
  }
  const token = preview || authentication === 'none' ? null : rawToken;
  const headers = new Headers(requestOptions.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    signal: controller.signal,
    redirect: 'error',
    headers,
  } as RequestInit & { redirect: 'error' });

  const body = (await res.json()) as ApiResponse<T>;
  if (!body || typeof body.success !== 'boolean') throw new Error('서버 응답 형식을 확인할 수 없습니다.');
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
  return body.data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.');
    if (error instanceof TypeError) throw new Error('서버에 연결하지 못했습니다. 서버 연결을 확인해 주세요.');
    throw error;
  } finally { clearTimeout(timeout); }
}
