import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AppError } from '../../common/AppError';
import { pool } from '../../config/db';
import type { KakaoProfile } from './kakaoClient';
import type { Role } from './tokens';

export interface ServiceUser {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  role: Role;
}

const toUser = (row: RowDataPacket): ServiceUser => ({
  id: Number(row.user_id),
  nickname: String(row.nickname),
  profileImageUrl: row.profile_image_url == null ? null : String(row.profile_image_url),
  role: row.role === 'OWNER' || row.role === 'ADMIN' ? row.role : 'USER',
});

// DB 오류는 내용을 숨기고 503 으로 바꿉니다. (의도한 AppError 는 그대로)
async function db<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, '로그인 정보를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
}

const USER_COLUMNS = 'user_id, nickname, profile_image_url, role';

async function findUser(userId: number): Promise<ServiceUser | null> {
  return db(async () => {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`, [userId]);
    return rows.length ? toUser(rows[0]) : null;
  });
}

// 카카오 회원번호로 회원을 찾고, 없으면 만듭니다. 로그인할 때마다 닉네임·사진을 최신으로 맞춥니다.
async function upsertKakaoUser(profile: KakaoProfile, now = new Date()): Promise<ServiceUser> {
  return db(async () => {
    await pool.query(
      `INSERT INTO users (kakao_id, nickname, profile_image_url, last_login_at) VALUES (?, ?, ?, ?) AS incoming
       ON DUPLICATE KEY UPDATE nickname = incoming.nickname, profile_image_url = incoming.profile_image_url,
       last_login_at = incoming.last_login_at`,
      [profile.kakaoId, profile.nickname.slice(0, 100), profile.profileImageUrl?.slice(0, 500) ?? null, now],
    );
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${USER_COLUMNS} FROM users WHERE kakao_id = ?`, [profile.kakaoId]);
    if (!rows.length) throw new Error('user not saved');
    return toUser(rows[0]);
  });
}

async function saveRefreshToken(userId: number, hash: string, expiresAt: Date): Promise<void> {
  await db(() => pool.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, hash, expiresAt]));
}

// 유효한 refresh 토큰을 폐기하고 새 토큰을 저장합니다. 같은 토큰이 동시에 두 번 쓰여도 한 번만 성공합니다.
async function rotateRefreshToken(oldHash: string, next: { hash: string; expiresAt: Date }, now = new Date()): Promise<ServiceUser | null> {
  return db(async () => {
    const conn = await pool.getConnection();
    // 롤백에 실패하면 트랜잭션 상태를 알 수 없으므로 그 연결은 풀에 돌려주지 않고 버립니다.
    let unusable = false;
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT t.user_id FROM refresh_tokens t WHERE t.token_hash = ? AND t.revoked_at IS NULL AND t.expires_at > ? FOR UPDATE`,
        [oldHash, now],
      );
      if (!rows.length) {
        await conn.rollback();
        return null;
      }
      const userId = Number(rows[0].user_id);
      await conn.query('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?', [now, oldHash]);
      await conn.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, next.hash, next.expiresAt]);
      const [users] = await conn.query<RowDataPacket[]>(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`, [userId]);
      await conn.commit();
      return users.length ? toUser(users[0]) : null;
    } catch (error) {
      try {
        await conn.rollback();
      } catch {
        unusable = true;
      }
      throw error;
    } finally {
      if (unusable) conn.destroy();
      else conn.release();
    }
  });
}

// 로그아웃: 이미 폐기됐거나 없는 토큰이어도 오류 없이 끝냅니다.
async function revokeRefreshToken(hash: string, now = new Date()): Promise<boolean> {
  return db(async () => {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', [now, hash],
    );
    return result.affectedRows > 0;
  });
}

// 라우터는 이 객체를 통해서만 DB 에 접근합니다. (테스트에서 메서드를 가짜로 바꿀 수 있도록)
export const userStore = { findUser, upsertKakaoUser, saveRefreshToken, rotateRefreshToken, revokeRefreshToken };
