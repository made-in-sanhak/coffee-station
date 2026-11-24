import type { PoolConnection } from 'mysql2/promise';
import { pool } from './db';
export async function transaction<T>(
  work: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  let broken = false;
  try {
    await conn.beginTransaction();
    const value = await work(conn);
    await conn.commit();
    return value;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      broken = true;
    }
    throw error;
  } finally {
    if (broken) conn.destroy();
    else conn.release();
  }
}
