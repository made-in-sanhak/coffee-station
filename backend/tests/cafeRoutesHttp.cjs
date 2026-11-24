const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'mock';
process.env.MVP_CATALOG_MODE = 'mysql-seed';
const { pool } = require('../dist/config/db');
const { env } = require('../dist/config/env');
const { app } = require('../dist/app');

// 목록·상세는 pool.execute, 지도 가격 조회는 pool.query 를 씁니다. 어느 쪽이 불렸는지 기록합니다.
async function withServer(run) {
  const calls = [];
  const original = { query: pool.query, execute: pool.execute };
  pool.query = async () => { calls.push('map'); return [[]]; };
  pool.execute = async (sql, params) => {
    calls.push(sql.includes('FROM menu_prices') ? 'menus' : 'list');
    return [sql.includes('WHERE c.cafe_id = ?') && params[0] === '9001'
      ? [{ id: '9001', name: '스타벅스 행신역점', address: '경기도 고양시', latitude: 37.614, longitude: 126.834, rating_avg: 0, review_count: 0 }]
      : []];
  };
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const get = path => fetch(`http://127.0.0.1:${server.address().port}/api/cafes${path}`);
    await run(get, calls);
  } finally {
    Object.assign(pool, original);
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

const MAP = '?latitude=37.61&longitude=126.83&radius=1000&menu=' + encodeURIComponent('아메리카노') + '&temperature=ICE';

test('GET /api/cafes sends map requests (with menu) and list/search requests (without menu) to different handlers', async () => {
  await withServer(async (get, calls) => {
    for (const path of ['', '?query=' + encodeURIComponent('스타벅스'), '?latitude=37.61&longitude=126.83&radius=500']) {
      const response = await get(path);
      assert.equal(response.status, 200, path || '(no params)');
      assert.deepEqual((await response.json()).data, []);
    }
    assert.deepEqual(calls, ['list', 'list', 'list']);

    calls.length = 0;
    assert.equal((await get(MAP)).status, 200);
    assert.deepEqual(calls, ['map']);
  });
});

test('the cafe list keeps working outside DB seed mode while the price map stays gated', async () => {
  const mode = env.catalogMode;
  env.catalogMode = 'mock';
  try {
    await withServer(async (get, calls) => {
      assert.equal((await get('')).status, 200);
      assert.equal((await get(MAP)).status, 503);
      assert.equal((await get('/options')).status, 503, '/options must not be treated as a cafe id');
      assert.deepEqual(calls, ['list']);
    });
  } finally {
    env.catalogMode = mode;
  }
});

test('cafe detail and menus are served by the same router and unknown ids are 404', async () => {
  await withServer(async get => {
    const detail = await get('/9001');
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.name, '스타벅스 행신역점');
    assert.equal((await get('/9001/menus')).status, 200);
    assert.equal((await get('/1234')).status, 404);
    assert.equal((await get('/abc')).status, 404);
  });
});
