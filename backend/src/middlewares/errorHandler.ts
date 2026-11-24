import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../common/AppError';
import { fail } from '../common/response';

// 등록되지 않은 URL
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json(fail(`${req.method} ${req.originalUrl} 경로를 찾을 수 없습니다.`));
};

// 모든 오류를 공통 응답 형식으로 변환 (Express 5는 async 함수의 오류도 자동으로 여기로 옵니다)
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(fail(err.message));
    return;
  }
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json(fail('요청 본문(JSON) 형식이 올바르지 않습니다.'));
    return;
  }
  if ((err as { type?: string }).type === 'entity.too.large') { res.status(413).json(fail('첨부 데이터가 너무 큽니다.')); return; }
  const dbCode = (err as { code?: string }).code;
  if (dbCode && /^(ECONN|ETIMEDOUT|PROTOCOL_|ER_NO_SUCH_TABLE|ER_ACCESS_DENIED)/.test(dbCode)) {
    res.status(503).json(fail('DB 연결 또는 기능 테이블 적용 상태를 확인해 주세요.')); return;
  }
  console.error(err);
  res.status(500).json(fail('서버 오류가 발생했습니다.'));
};
