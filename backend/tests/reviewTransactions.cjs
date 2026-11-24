const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
process.env.NODE_ENV = 'test';
const { app } = require('../dist/app');
const { pool } = require('../dist/config/db');
const { userStore } = require('../dist/modules/auth/userStore');
const { signAccessToken } = require('../dist/modules/auth/tokens');
for (const route of ['review', 'like'])
  for (const rollbackFails of [false, true]) {
    test(`${route} write failure ${
      rollbackFails
        ? 'destroys a failed rollback connection'
        : 'rolls back and releases a healthy connection'
    }`, async () => {
      const originalGet = pool.getConnection,
        originalAuth = userStore.authenticate,
        originalLog = console.error;
      const calls = [],
        failure = new Error('injected write failure'),
        logs = [];
      const conn = {
        async beginTransaction() {
          calls.push('begin');
        },
        async execute(sql) {
          if (sql.startsWith('SELECT cafe_id')) return [[{ cafe_id: 1 }]];
          if (sql.startsWith('SELECT id FROM community_reviews'))
            return [[{ id: 'r1' }]];
          if (sql.startsWith('SELECT user_id')) return [[]];
          calls.push('write');
          throw failure;
        },
        async commit() {
          calls.push('commit');
        },
        async rollback() {
          calls.push('rollback');
          if (rollbackFails) throw new Error('rollback failed');
        },
        release() {
          calls.push('release');
        },
        destroy() {
          calls.push('destroy');
        },
      };
      pool.getConnection = async () => conn;
      userStore.authenticate = async () => ({
        id: 1,
        nickname: 'member',
        profileImageUrl: null,
        role: 'USER',
      });
      console.error = (...args) => logs.push(args);
      const server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      try {
        const r = await fetch(
          `http://127.0.0.1:${server.address().port}` +
            (route === 'review' ? '/api/reviews' : '/api/reviews/r1/like'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization:
                'Bearer ' + signAccessToken({ userId: 1, role: 'USER' }),
            },
            body: JSON.stringify(
              route === 'review'
                ? { cafeId: '1', rating: 5, text: 'review', category: '리뷰' }
                : {},
            ),
          },
        );
        assert.equal(r.status, 500);
        assert.equal((await r.json()).success, false);
        assert.deepEqual(calls, [
          'begin',
          'write',
          'rollback',
          rollbackFails ? 'destroy' : 'release',
        ]);
        assert.equal(logs[0][0], failure);
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        pool.getConnection = originalGet;
        userStore.authenticate = originalAuth;
        console.error = originalLog;
      }
    });
  }
