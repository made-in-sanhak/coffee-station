import { randomUUID } from 'node:crypto';
import { AppError } from '../../common/AppError';

export interface QuotaPolicy { perMinute: number; perDay: number; concurrent: number; leaseMs: number }
export type Reservation = { allowed: true; leaseId: string } | { allowed: false; retryAfterSeconds: number };
export interface QuotaStore {
  // Atomically check all limits, charge one provider attempt and create a lease.
  reserve(userId: string, policy: QuotaPolicy): Promise<Reservation>;
  release(userId: string, leaseId: string): Promise<void>;
}
export class QuotaExceeded extends AppError {
  constructor(public readonly retryAfterSeconds: number) { super(429, 'AI 호출 제한에 도달했습니다.'); }
}
export function createQuota(store: QuotaStore, policy: QuotaPolicy) {
  if (Object.values(policy).some(n => !Number.isSafeInteger(n) || n < 1)) { throw new Error('Invalid quota policy'); }
  return async (verifiedUserId: string) => {
    if (typeof verifiedUserId !== 'string' || !verifiedUserId.trim() || verifiedUserId.length > 200) {
      throw new AppError(401, '인증된 사용자 정보가 필요합니다.');
    }
    let result: Reservation;
    try { result = await store.reserve(verifiedUserId, policy); }
    catch { throw new AppError(503, 'AI 호출 제한 저장소를 사용할 수 없습니다.'); }
    if (!result.allowed) { throw new QuotaExceeded(result.retryAfterSeconds); }
    const leaseId = result.leaseId;
    return async () => {
      try { await store.release(verifiedUserId, leaseId); }
      catch { throw new AppError(503, 'AI 호출 상태를 갱신할 수 없습니다.'); }
    };
  };
}

// Test-only model of a shared atomic store. Never use as a production distributed store.
export class MockQuotaStore implements QuotaStore {
  private users = new Map<string, { attempts: number[]; leases: Map<string, number> }>();
  constructor(private now: () => number = Date.now) {}
  async reserve(userId: string, p: QuotaPolicy): Promise<Reservation> {
    const time = this.now(), day = Math.floor(time / 86400000) * 86400000;
    const state = this.users.get(userId) ?? { attempts: [], leases: new Map<string, number>() };
    state.attempts = state.attempts.filter(t => t >= Math.min(day, time - 60000));
    for (const [id, expiry] of state.leases) { if (expiry <= time) { state.leases.delete(id); } }
    this.users.set(userId, state);
    const minute = state.attempts.filter(t => t > time - 60000);
    const waits: number[] = [];
    if (state.attempts.filter(t => t >= day).length >= p.perDay) { waits.push(day + 86400000 - time); }
    if (minute.length >= p.perMinute) { waits.push(minute[minute.length - p.perMinute] + 60000 - time); }
    if (state.leases.size >= p.concurrent) { waits.push(Math.min(...state.leases.values()) - time); }
    if (waits.length) { return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(Math.max(...waits) / 1000)) }; }
    const leaseId = randomUUID();
    state.attempts.push(time); state.leases.set(leaseId, time + p.leaseMs);
    return { allowed: true, leaseId };
  }
  async release(userId: string, leaseId: string) { this.users.get(userId)?.leases.delete(leaseId); }
}
