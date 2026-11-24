function installFakeUserStore(userStore) {
  const original = { ...userStore },
    users = new Map(),
    tokens = new Map(),
    flows = new Map();
  let nextId = 1;
  const byId = id => [...users.values()].find(u => u.id === id) ?? null;
  Object.assign(userStore, {
    async findUser(id) {
      return byId(id);
    },
    async upsertKakaoUser(profile) {
      const old = users.get(profile.kakaoId);
      const u = {
        id: old?.id ?? nextId++,
        nickname: profile.nickname,
        profileImageUrl: profile.profileImageUrl,
        role: 'USER',
      };
      users.set(profile.kakaoId, u);
      return u;
    },
    async saveRefreshToken(userId, hash, expiresAt, sessionId) {
      tokens.set(hash, { userId, expiresAt, sessionId, revokedAt: null });
    },
    async rotateRefreshToken(oldHash, next, now = new Date(), beforeSave) {
      const row = tokens.get(oldHash);
      if (!row || row.revokedAt || row.expiresAt <= now) return null;
      const u = { ...byId(row.userId), sessionId: row.sessionId };
      beforeSave?.(u);
      row.revokedAt = now;
      tokens.set(next.hash, {
        userId: row.userId,
        expiresAt: row.expiresAt,
        sessionId: row.sessionId,
        revokedAt: null,
      });
      return u;
    },
    async revokeRefreshToken(hash, now = new Date()) {
      const row = tokens.get(hash);
      if (!row || row.revokedAt) return false;
      for (const r of tokens.values())
        if (r.sessionId === row.sessionId) r.revokedAt = now;
      return true;
    },
    async authenticate(c) {
      return [...tokens.values()].some(
        r =>
          r.userId === c.userId &&
          r.sessionId === c.sessionId &&
          !r.revokedAt &&
          r.expiresAt > new Date(),
      )
        ? byId(c.userId)
        : null;
    },
    async createLoginFlow(state, flow, uri) {
      flows.set(flow, { state, uri });
    },
    async consumeLoginFlow(state, flow, uri) {
      const r = flows.get(flow);
      if (!r || r.state !== state || r.uri !== uri) return false;
      flows.delete(flow);
      return true;
    },
  });
  return { users, tokens, restore: () => Object.assign(userStore, original) };
}
module.exports = { installFakeUserStore };
