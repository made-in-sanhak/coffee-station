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
  console.error(err);
  res.status(500).json(fail('서버 오류가 발생했습니다.'));
};
