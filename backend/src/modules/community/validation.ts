import { AppError } from '../../common/AppError';
export const bad = (message: string): never => { throw new AppError(400, message); };
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return bad('JSON 객체가 필요합니다.');
  return value as Record<string, unknown>;
}
export function text(value: unknown, name: string, max: number, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.trim().length > max)
    return bad(`${name} 값을 확인해 주세요. (최대 ${max}자)`);
  return value.trim();
}
export function id(value: unknown, name = 'ID'): string {
  const result = text(value, name, 19);
  if (!/^[1-9]\d{0,18}$/.test(result) || BigInt(result) > 9223372036854775807n) return bad(`${name} 값을 확인해 주세요.`);
  return result;
}
export function integer(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) return bad(`${name} 값을 확인해 주세요.`);
  return value;
}
export function queryNumber(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) return bad(`${name} 값을 확인해 주세요.`);
  return Number(value);
}
export const categories = ['리뷰', '신메뉴', '질문'];
export function category(value: unknown): string {
  const result = text(value ?? '리뷰', '분류', 30);
  if (!categories.includes(result)) return bad('지원하지 않는 리뷰 분류입니다.');
  return result;
}
