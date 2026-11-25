import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AppError } from '../../common/AppError';
import { pool } from '../../config/db';
import { transaction } from '../../config/transaction';
import type { KakaoProfile } from './kakaoClient';
import { hashRefreshToken, type Role, type AccessClaims } from './tokens';
export interface ServiceUser {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  role: Role;
}
export type SessionUser = ServiceUser & { sessionId: string };
const columns = 'u.user_id,u.nickname,u.profile_image_url,u.role';
function user(row: RowDataPacket): ServiceUser {
  const id = Number(row.user_id);
  if (!Number.isSafeInteger(id) || id < 1)
    throw new AppError(503, '회원 식별 범위를 초과했습니다.');
  return {
    id,
    nickname: String(row.nickname),
    profileImageUrl: row.profile_image_url ?? null,
    role: row.role === 'OWNER' || row.role === 'ADMIN' ? row.role : 'USER',
  };
}
async function db<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      503,
      '로그인 정보를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    );
  }
}
async function findUser(id: number) {
  return db(async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${columns} FROM users u WHERE u.user_id=? AND u.active=1`,
      [id],
    );
    return rows.length ? user(rows[0]) : null;
  });
}
async function upsertKakaoUser(profile: KakaoProfile, now = new Date()) {
  return db(() =>
    transaction(async conn => {
      await conn.query(
        `INSERT INTO users(kakao_id,nickname,profile_image_url,last_login_at) VALUES(?,?,?,?) AS incoming
    ON DUPLICATE KEY UPDATE nickname=incoming.nickname,profile_image_url=incoming.profile_image_url,last_login_at=incoming.last_login_at`,
        [
          profile.kakaoId,
          profile.nickname.slice(0, 100),
          profile.profileImageUrl?.slice(0, 500) ?? null,
          now,
        ],
      );
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT ${columns},u.active FROM users u WHERE kakao_id=? FOR UPDATE`,
        [profile.kakaoId],
      );
      if (!rows.length || !rows[0].active)
        throw new AppError(403, '사용할 수 없는 계정입니다.');
      return user(rows[0]);
    }),
  );
}
async function saveRefreshToken(
  userId: number,
  hash: string,
  expiresAt: Date,
  sessionId: string,
) {
  await db(async () => {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO refresh_tokens(user_id,token_hash,expires_at,session_id)
      SELECT user_id,?,?,? FROM users WHERE user_id=? AND active=1`,
      [hash, expiresAt, sessionId, userId],
    );
    if (!result.affectedRows)
      throw new AppError(401, '사용할 수 없는 계정입니다.');
  });
}
// Sign the replacement inside the transaction BEFORE revoking the current token.
async function rotateRefreshToken(
  oldHash: string,
  next: { hash: string; expiresAt: Date },
  now = new Date(),
  beforeSave?: (value: SessionUser) => void,
) {
  return db(() =>
    transaction(async conn => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT ${columns},t.session_id,t.expires_at FROM refresh_tokens t
    JOIN users u ON u.user_id=t.user_id WHERE t.token_hash=? AND t.revoked_at IS NULL AND t.expires_at>? AND u.active=1 AND t.session_id IS NOT NULL FOR UPDATE`,
        [oldHash, now],
      );
      if (!rows.length) return null;
      const current = {
        ...user(rows[0]),
        sessionId: String(rows[0].session_id),
      };
      beforeSave?.(current);
      await conn.query(
        'UPDATE refresh_tokens SET revoked_at=? WHERE token_hash=?',
        [now, oldHash],
      );
      await conn.query(
        'INSERT INTO refresh_tokens(user_id,token_hash,expires_at,session_id) VALUES(?,?,?,?)',
        [current.id, next.hash, rows[0].expires_at, current.sessionId],
      );
      return current;
    }),
  );
}
async function revokeRefreshToken(hash: string, now = new Date()) {
  return db(() =>
    transaction(async conn => {
      // Lock the current token, not the entire chain: lock order matches rotation.
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT token_id,session_id,revoked_at FROM refresh_tokens WHERE token_hash=? FOR UPDATE',
        [hash],
      );
      if (!rows.length || rows[0].revoked_at !== null) return false;
      const [r] = await conn.query<ResultSetHeader>(
        'UPDATE refresh_tokens SET revoked_at=? WHERE session_id=? AND revoked_at IS NULL',
        [now, rows[0].session_id],
      );
      return r.affectedRows > 0;
    }),
  );
}
async function authenticate(claims: AccessClaims) {
  return db(async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${columns} FROM users u WHERE u.user_id=? AND u.active=1 AND EXISTS
   (SELECT 1 FROM refresh_tokens t WHERE t.user_id=u.user_id AND t.session_id=? AND t.revoked_at IS NULL AND t.expires_at>?)`,
      [claims.userId, claims.sessionId, new Date()],
    );
    return rows.length ? user(rows[0]) : null;
  });
}
async function createLoginFlow(
  state: string,
  flowToken: string,
  redirectUri: string,
) {
  await db(async () => {
    await pool.query(
      'DELETE FROM auth_login_flows WHERE expires_at<CURRENT_TIMESTAMP(3)',
    );
    await pool.query(
      'INSERT INTO auth_login_flows(flow_hash,state_hash,redirect_uri,expires_at) VALUES(?,?,?,DATE_ADD(CURRENT_TIMESTAMP(3),INTERVAL 5 MINUTE))',
      [hashRefreshToken(flowToken), hashRefreshToken(state), redirectUri],
    );
  });
}
async function consumeLoginFlow(
  state: string,
  flowToken: string,
  redirectUri: string,
) {
  return db(async () => {
    const [r] = await pool.query<ResultSetHeader>(
      'DELETE FROM auth_login_flows WHERE flow_hash=? AND state_hash=? AND redirect_uri=? AND expires_at>CURRENT_TIMESTAMP(3)',
      [hashRefreshToken(flowToken), hashRefreshToken(state), redirectUri],
    );
    return r.affectedRows === 1;
  });
}
export const userStore = {
  findUser,
  upsertKakaoUser,
  saveRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  authenticate,
  createLoginFlow,
  consumeLoginFlow,
};
