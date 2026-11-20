import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { QuotaPolicy, QuotaStore, Reservation } from './quota';

interface Attempt extends RowDataPacket {
  attempted_at_ms: number | string;
  expires_at_ms: number | string;
}

export class MysqlQuotaStore implements QuotaStore {
  constructor(private readonly pool: Pool) {}

  async reserve(userId: string, policy: QuotaPolicy): Promise<Reservation> {
    const conn = await this.pool.getConnection();
    try {
      // The user row serializes reservations; range locks could block other users' inserts.
      await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await conn.beginTransaction();
      // Lock one user even when they have no attempts yet.
      await conn.execute(
        'INSERT INTO recommendation_quota_users (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id',
        [userId],
      );
      const [[clock]] = await conn.query<RowDataPacket[]>(
        'SELECT TIMESTAMPDIFF(MICROSECOND, \'1970-01-01\', UTC_TIMESTAMP(3)) DIV 1000 AS now_ms',
      );
      const now = Number(clock.now_ms);
      const day = Math.floor(now / 86400000) * 86400000;
      const minuteStart = now - 60000;
      // shortcut: prune only active users' history; add retention cleanup before production rollout.
      await conn.execute(
        'DELETE FROM recommendation_quota_attempts WHERE user_id = ? AND attempted_at_ms < ? AND expires_at_ms <= ?',
        [userId, Math.min(day, minuteStart), now],
      );
      const [rows] = await conn.execute<Attempt[]>(
        'SELECT attempted_at_ms, expires_at_ms FROM recommendation_quota_attempts WHERE user_id = ? ORDER BY attempted_at_ms',
        [userId],
      );
      const attempts = rows.map(row => Number(row.attempted_at_ms));
      const minute = attempts.filter(time => time > minuteStart);
      const leases = rows.map(row => Number(row.expires_at_ms))
        .filter(expiry => expiry > now).sort((a, b) => a - b);
      const waits = [0];
      if (attempts.filter(time => time >= day).length >= policy.perDay) waits.push(day + 86400000 - now);
      if (minute.length >= policy.perMinute) waits.push(minute[minute.length - policy.perMinute] + 60000 - now);
      if (leases.length >= policy.concurrent) waits.push(leases[leases.length - policy.concurrent] - now);
      const wait = Math.max(...waits);
      if (wait > 0) {
        await conn.commit();
        return { allowed: false, retryAfterSeconds: Math.ceil(wait / 1000) };
      }

      const leaseId = randomUUID();
      await conn.execute(
        'INSERT INTO recommendation_quota_attempts (user_id, lease_id, attempted_at_ms, expires_at_ms) VALUES (?, ?, ?, ?)',
        [userId, leaseId, now, now + policy.leaseMs],
      );
      await conn.commit();
      return { allowed: true, leaseId };
    } catch (error) {
      try {
        await conn.rollback();
      } catch {
        conn.destroy();
      }
      throw error;
    } finally {
      conn.release();
    }
  }

  async release(userId: string, leaseId: string): Promise<void> {
    await this.pool.execute(
      'UPDATE recommendation_quota_attempts SET expires_at_ms = 0 WHERE user_id = ? AND lease_id = ?',
      [userId, leaseId],
    );
  }
}
