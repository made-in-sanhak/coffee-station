// 모든 API 호출은 이 함수를 거칩니다. (서버 주소 + 토큰 자동 첨부 + 공통 응답 처리)
// 기능별 호출 함수는 src/api/endpoints/기능.ts 에 만들고 apiFetch 를 사용하세요.
import { useConfigStore } from '../store/configStore';
import { isParkMockToken } from '../integration/parkSession';

// Android 에뮬레이터에서 PC의 localhost 는 10.0.2.2 입니다.
// 실제 폰으로 테스트할 때는 PC의 IP(예: http://192.168.0.10:8080)로 바꾸세요.
export const API_BASE_URL = 'http://10.0.2.2:8080';
export const getApiBaseUrl = () => useConfigStore.getState().backendUrl || API_BASE_URL;
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
  if (preview && path.startsWith('/api/') &&
      ((options.method ?? 'GET').toUpperCase() !== 'GET' || privateRead)) {
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
