/**
 * 서비스에서 의도적으로 던지는 오류
 *   throw new AppError(404, '카페를 찾을 수 없습니다.');
 *   throw new AppError(409, '이미 등록된 영수증입니다.');
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
