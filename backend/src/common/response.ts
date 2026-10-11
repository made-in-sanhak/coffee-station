/**
 * 모든 API의 공통 응답 형식 (frontend/src/api/client.ts 의 ApiResponse 와 동일)
 *   성공: res.json(ok(data))
 *   실패: AppError 를 throw 하면 errorHandler 가 fail(message) 형태로 응답합니다.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}

export const ok = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  message: null,
});

export const fail = (message: string): ApiResponse<null> => ({
  success: false,
  data: null,
  message,
});
