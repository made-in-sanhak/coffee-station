const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'mock';
process.env.MVP_CATALOG_MODE = 'mysql-seed';
const { app } = require('../dist/app');
const { pool } = require('../dist/config/db');

test('chip search needs no proposal and chat confirmation uses the signed conditions', async () => {
  const budgets = [];
  pool.query = async (_query, params) => {
    budgets.push(params);
    return [[]];
  };
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/recommendations`;
    const post = (path, body) => fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    assert.equal((await post('/search', { conditions: { maxPrice: 3000 } })).status, 200);
    const prepared = await post('/chat/prepare', { message: '5천 원 이하 디카페인 메뉴를 찾아줘' });
    assert.equal(prepared.status, 200);
    const { data: { proposalId } } = await prepared.json();
    assert.equal((await post('/chat/confirm', { proposalId })).status, 409);
    assert.equal((await post('/chat/confirm', {
      proposalId, confirmed: true, conditions: { maxPrice: 3000 },
    })).status, 200);
    assert.deepEqual(budgets, [[3000], [5000]]);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
