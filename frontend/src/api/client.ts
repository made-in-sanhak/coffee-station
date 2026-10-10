// 모든 API 호출은 이 함수를 거칩니다. (서버 주소 + 토큰 자동 첨부 + 공통 응답 처리)
// 기능별 호출 함수는 src/api/endpoints/기능.ts 에 만들고 apiFetch 를 사용하세요.

// Android 에뮬레이터에서 PC의 localhost 는 10.0.2.2 입니다.
// 실제 폰으로 테스트할 때는 PC의 IP(예: http://192.168.0.10:8080)로 바꾸세요.
export const API_BASE_URL = 'http://10.0.2.2:8080';

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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
  return body.data;
}
