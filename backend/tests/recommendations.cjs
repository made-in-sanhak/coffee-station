const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');

test('Express recommendation forwarding and safe failures', async () => {
  let status = 200;
  let received;
  const upstream = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    received = { url: req.url, token: req.headers['x-internal-token'], body: body ? JSON.parse(body) : null };
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status === 200
      ? (req.url.includes('review-summary') ? {status: 'READY', summary: {review_count: 3}, data_mode: 'mock'} : { status: 'RESULT', recommendations: [] }) : { detail: 'private upstream detail' }));
  }).listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  process.env.AI_SERVER_URL = `http://127.0.0.1:${upstream.address().port}`;
  process.env.INTERNAL_API_TOKEN = 'server-test-token';
  const { app } = require('../dist/app');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/recommendations`;
  const body = { message: 'test', constraints: { max_price_krw: 4000 } };
  const send = () => fetch(url, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Internal-Token': 'untrusted-client-token',
  }, body: JSON.stringify(body) });
  try {
    let response = await send();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
    assert.deepEqual(received, { url: '/recommendations', token: 'server-test-token', body });
    response = await fetch(url.replace('/api/recommendations', '/api/cafes/990001/review-summary'));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.summary.review_count, 3);
    assert.equal(received.url, '/cafes/990001/review-summary');
    assert.equal(received.token, 'server-test-token');
    for (const code of [401, 422, 503, 504]) {
      status = code;
      response = await send();
      assert.equal(response.status, code === 401 ? 502 : code);
      assert.equal((await response.json()).success, false);
    }
    await new Promise(resolve => upstream.close(resolve));
    response = await send();
    assert.equal(response.status, 502);
    assert.equal((await response.json()).success, false);
  } finally {
    server.closeAllConnections();
    upstream.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    upstream.close();
  }
});
