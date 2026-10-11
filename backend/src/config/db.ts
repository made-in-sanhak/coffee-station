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
 *     await conn.rollback();
 *     throw e;
 *   } finally {
 *     conn.release();
 *   }
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
