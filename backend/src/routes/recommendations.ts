import { Router } from 'express';
import { env } from '../config/env';
import { AppError } from '../common/AppError';
import { ok } from '../common/response';

const router = Router();

router.post(['/', '/prepare', '/confirm'], async (req, res) => {
  if (!env.internalApiToken) throw new AppError(503, '추천 서비스 설정을 확인하세요.');
  let upstream: Response;
  try {
    const suffix = req.path === '/' ? '' : req.path;
    upstream = await fetch(new URL(`/recommendations${suffix}`, env.aiServerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': env.internalApiToken },
      body: JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AppError(504, '추천 요청 시간이 초과되었습니다.');
    }
    throw new AppError(502, '추천 서비스에 연결할 수 없습니다.');
  }
  if (!upstream.ok) {
    const status = [409, 422, 503, 504].includes(upstream.status) ? upstream.status : 502;
    if (upstream.status === 401) {
      throw new AppError(502, 'Python 내부 인증 실패: 두 서버의 INTERNAL_API_TOKEN과 재시작 여부를 확인하세요.');
    }
    if (req.path === '/prepare' && upstream.status === 502) {
      const body = await upstream.json().catch(() => null);
      const code = body?.detail?.error_code;
      const hints: Record<string, string> = {
        TIMEOUT: 'Gemini 응답 시간 초과', PROVIDER_TIMEOUT: 'Gemini 서버 응답 시간 초과',
        RATE_LIMITED: 'Gemini 할당량 제한', INVALID_REQUEST: 'Gemini 요청 형식 오류',
        UNAUTHENTICATED: 'Gemini API 키 인증 실패', PERMISSION_DENIED: 'Gemini 권한 제한',
        MODEL_NOT_FOUND: 'Gemini 모델 ID 확인 필요', LOCAL_SDK_ERROR: 'SDK 또는 추출 응답 검증 실패',
        NETWORK_ERROR: 'Gemini 네트워크 연결 실패', PROVIDER_ERROR: 'Gemini 서버 오류',
        PROVIDER_UNAVAILABLE: 'Gemini 서버 일시 사용 불가', MODEL_ERROR: 'Gemini 호출 실패',
      };
      if (typeof code === 'string' && Object.hasOwn(hints, code)) {
        throw new AppError(502, `[${code}] ${hints[code]}`);
      }
    }
    throw new AppError(status, status === 422
      ? '추천 메시지와 확정 조건을 확인하세요.' : '추천 서비스가 요청을 완료하지 못했습니다.');
  }
  let data;
  try {
    data = await upstream.json();
  } catch {
    throw new AppError(502, '추천 서비스 응답 형식이 올바르지 않습니다.');
  }
  const valid = req.path === '/prepare'
    ? data && ['AWAITING_CONFIRMATION', 'NEEDS_CLARIFICATION'].includes(data.status) && typeof data.proposal_id === 'string'
    : data && ['RESULT', 'QUESTION'].includes(data.status) && Array.isArray(data.recommendations);
  if (!valid) {
    throw new AppError(502, '추천 서비스 응답 형식이 올바르지 않습니다.');
  }
  res.json(ok(data));
});

export default router;
