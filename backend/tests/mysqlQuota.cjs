const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { setTimeout } = require('node:timers/promises');
const { createPool } = require('mysql2/promise');
const { MysqlQuotaStore } = require('../dist/modules/recommendations/mysqlQuota');

const port = process.env.QUOTA_TEST_PORT;
test('two MySQL connections share attempt and lease limits', { skip: !port }, async () => {
  const options = {
    host: '127.0.0.1', port: Number(port), connectionLimit: 1,
    database: 'coffee_quota_test', user: 'quota_test', password: 'quota-test-local',
  };
  const a = createPool(options);
  const b = createPool(options);
  try {
    const schema = await readFile(join(__dirname, '../sql/migrations/001_recommendation_quota.sql'), 'utf8');
    for (const statement of schema.split(';').filter(sql => sql.trim())) await a.query(statement);

    const [first, second] = [new MysqlQuotaStore(a), new MysqlQuotaStore(b)];
    const policy = { perMinute: 10, perDay: 20, concurrent: 1, leaseMs: 60000 };
    const user = randomUUID();
    const contenders = await Promise.all([first.reserve(user, policy), second.reserve(user, policy)]);
    const winner = contenders.find(result => result.allowed);
    assert.equal(contenders.filter(result => result.allowed).length, 1);
    await second.release(randomUUID(), winner.leaseId);
    assert.equal((await first.reserve(user, policy)).allowed, false);
    await second.release(user, winner.leaseId);
    assert.equal((await second.reserve(user, policy)).allowed, true);

    for (const limits of [{ perMinute: 1 }, { perDay: 1 }]) {
      const budgetUser = randomUUID();
      const budget = { ...policy, ...limits, concurrent: 2 };
      const results = await Promise.all([first.reserve(budgetUser, budget), second.reserve(budgetUser, budget)]);
      assert.equal(results.filter(result => result.allowed).length, 1);
      await second.release(budgetUser, results.find(result => result.allowed).leaseId);
      const denied = await first.reserve(budgetUser, budget);
      assert.equal(denied.allowed, false);
      assert.ok(denied.retryAfterSeconds > 0);
    }

    const expiringUser = randomUUID();
    assert.equal((await first.reserve(expiringUser, { ...policy, leaseMs: 100 })).allowed, true);
    await setTimeout(150);
    assert.equal((await second.reserve(expiringUser, policy)).allowed, true);
  } finally {
    await Promise.all([a.end(), b.end()]);
  }
});
