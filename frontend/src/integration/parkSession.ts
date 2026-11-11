import type { AuthSession } from '../app/domain';
import type { User } from '../types/auth';

export const isParkMockToken = (token: string | null | undefined) =>
  typeof token === 'string' && /^mock(?:-|$)/i.test(token);

export function classifyParkSession(value: {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}): AuthSession | null {
  const { accessToken, refreshToken, user } = value;
  if (!accessToken?.trim() || !refreshToken?.trim() ||
      isParkMockToken(accessToken) || isParkMockToken(refreshToken) ||
      !user || !Number.isSafeInteger(user.id) || user.id < 1 ||
      typeof user.nickname !== 'string' || !user.nickname.trim() ||
      (user.profileImageUrl !== null && typeof user.profileImageUrl !== 'string')) return null;
  return { accessToken, refreshToken,
    user: { id: String(user.id), nickname: user.nickname,
      profileImageUrl: user.profileImageUrl, role: 'USER' } };
}
