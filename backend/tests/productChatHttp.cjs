const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'gemini';
process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'test-model';
process.env.MVP_CATALOG_MODE = 'mysql-seed';
const { app } = require('../dist/app');
const { pool } = require('../dist/config/db');

test('chip search needs no proposal and chat confirmation uses the signed conditions', async () => {
  const budgets = [];
  let geminiCalls = 0;
  const request = global.fetch;
  global.fetch = async () => {
    geminiCalls++;
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{
      text: JSON.stringify({
        conditions: { maxPrice: 5000, purpose: null, tastes: ['DECAF'] },
        evidence: { maxPrice: '5천 원 이하', tastes: '디카페인' },
        unresolved: [],
      }),
    }] } }] });
  };
  pool.query = async (_query, params) => {
    budgets.push(params);
    return [[{
      cafe_id: '11', cafe_name: '행신 카페', address: '행신로 1',
      latitude: '37.62', longitude: '126.83', rating_avg: '0', review_count: 0,
      has_drive_thru: 0, price_id: '101', menu_name: '디카페인 아메리카노',
      category: 'COFFEE', size: '기본', option_name: 'ICE',
      price: 3000, source: 'DEMO', price_scope: 'STORE', option_rank: 1,
    }]];
  };
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/recommendations`;
    const post = (path, body) => request(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    assert.equal((await post('/search', { conditions: { maxPrice: 3000 } })).status, 200);
    assert.equal(geminiCalls, 0);
    const prepared = await post('/chat/prepare', { message: '5천 원 이하 디카페인 메뉴를 찾아줘' });
    assert.equal(prepared.status, 200);
    assert.equal(geminiCalls, 1);
    const { data: { proposalId } } = await prepared.json();
    assert.equal((await post('/chat/confirm', { proposalId })).status, 409);
    assert.equal((await post('/chat/confirm', {
      proposalId, confirmed: true, conditions: { maxPrice: 3000 },
    })).status, 200);
    assert.deepEqual(budgets, [[3000], [5000]]);
    assert.equal(geminiCalls, 1);
  } finally {
    global.fetch = request;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
