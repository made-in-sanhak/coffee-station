import mysql from 'mysql2/promise';
import { env } from './env';

/**
 * MySQL 연결 풀. 쿼리는 반드시 ? 자리표시자를 사용하세요. (SQL 인젝션 방지)
 *   const [rows] = await pool.query('SELECT * FROM cafe WHERE id = ?', [id]);
 *
 * 트랜잭션이 필요할 때 (영수증 등록 + 쿠폰 발급 등):
 *   const conn = await pool.getConnection();
 *   try {
 *     await conn.beginTransaction();
 *     ... conn.query(...) ...
 *     await conn.commit();
 *   } catch (e) {
 *     try { await conn.rollback(); } catch { broken = true; } // 롤백 실패 = 상태를 알 수 없는 연결
 *     throw e;
 *   } finally {
 *     if (broken) conn.destroy(); else conn.release();   // 깨진 연결은 풀에 돌려주지 않음
 *   }
 *   (try 앞에 let broken = false; 를 둡니다. 예: modules/auth/userStore.ts rotateRefreshToken)
 */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 3000,
  timezone: '+09:00',
});
