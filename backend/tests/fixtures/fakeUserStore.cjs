// userStore 를 메모리 구현으로 바꿉니다. (실제 MySQL 에 접속하지 않음)
// 반환값의 restore() 로 원래 구현을 되돌립니다.
function installFakeUserStore(userStore) {
  const original = { ...userStore };
  const users = new Map(); // kakaoId -> user
  const tokens = new Map(); // hash -> { userId, expiresAt, revokedAt }
  let nextId = 1;
  const byId = id => [...users.values()].find(user => user.id === id) ?? null;

  Object.assign(userStore, {
    async findUser(userId) { return byId(userId); },
    async upsertKakaoUser(profile) {
      const existing = users.get(profile.kakaoId);
      const user = { id: existing?.id ?? nextId++, nickname: profile.nickname, profileImageUrl: profile.profileImageUrl, role: 'USER' };
      users.set(profile.kakaoId, user);
      return user;
    },
    async saveRefreshToken(userId, hash, expiresAt) { tokens.set(hash, { userId, expiresAt, revokedAt: null }); },
    async rotateRefreshToken(oldHash, next, now = new Date()) {
      const row = tokens.get(oldHash);
      if (!row || row.revokedAt || row.expiresAt <= now) return null;
      row.revokedAt = now;
      tokens.set(next.hash, { userId: row.userId, expiresAt: next.expiresAt, revokedAt: null });
      return byId(row.userId);
    },
    async revokeRefreshToken(hash, now = new Date()) {
      const row = tokens.get(hash);
      if (!row || row.revokedAt) return false;
      row.revokedAt = now;
      return true;
    },
  });
  return { users, tokens, restore: () => Object.assign(userStore, original) };
}

module.exports = { installFakeUserStore };
