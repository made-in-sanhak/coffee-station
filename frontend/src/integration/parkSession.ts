import type { AuthSession } from '../app/domain';
import type { User } from '../types/auth';

export const isParkMockToken = (token: string | null | undefined) =>
  typeof token === 'string' && /^mock(?:-|$)/i.test(token);

export function classifyParkSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== 'object') return null;
  const { accessToken, refreshToken, user } = value as {
    accessToken?: unknown;
    refreshToken?: unknown;
    user?: Partial<User> | null;
  };
  if (typeof accessToken !== 'string' || !accessToken.trim() ||
      typeof refreshToken !== 'string' || !refreshToken.trim() ||
      isParkMockToken(accessToken) || isParkMockToken(refreshToken) ||
      !user || typeof user.id !== 'number' || !Number.isSafeInteger(user.id) || user.id < 1 ||
      typeof user.nickname !== 'string' || !user.nickname.trim() ||
      (user.profileImageUrl !== null && typeof user.profileImageUrl !== 'string')) return null;
  return { accessToken, refreshToken,
    user: { id: String(user.id), nickname: user.nickname,
      profileImageUrl: user.profileImageUrl, role: 'USER' } };
}
