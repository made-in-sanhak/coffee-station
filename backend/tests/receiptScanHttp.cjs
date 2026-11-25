const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, rm, rmdir } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

process.env.NODE_ENV = 'test';
const { app } = require('../dist/app');
const { scanReceipt } = require('../dist/routes/receipts');

test('receipt image scans are blocked before parsing when disabled', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/receipts/scan`;

  try {
    const blocked = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(blocked.status, 503);
    assert.equal((await blocked.json()).success, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('photo uploads disable table extraction and concurrent scans share one attempt', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'coffee-ocr-test-'));
  const budget = { directory, month: '2026-11', limit: 1 };
  const settings = { url: new URL('https://example.invalid/general'), secret: 'test-key', budget };
  const body = { type: 'image/jpeg', base64: Buffer.from([255, 216, 255, 217]).toString('base64') };
  const result = { images: [{ fields: [{ inferText: '카페' }] }] };
  let calls = 0;
  const send = async (_url, options) => {
    calls++;
    assert.equal(options.headers['X-OCR-SECRET'], 'test-key');
    assert.equal(options.redirect, 'error');
    const request = JSON.parse(options.body);
    assert.equal(request.enableTableDetection, false);
    assert.deepEqual(request.images, [{ name: 'receipt', format: 'jpg', data: body.base64 }]);
    return Response.json(result);
  };
  try {
    await assert.rejects(scanReceipt({ ...body, type: 'image/png' }, settings, send), { status: 400 });
    const attempts = await Promise.allSettled([
      scanReceipt(body, settings, send), scanReceipt(body, settings, send),
    ]);
    assert.deepEqual(attempts.find(attempt => attempt.status === 'fulfilled')?.value, result);
    assert.equal(attempts.find(attempt => attempt.status === 'rejected')?.reason.status, 429);
    assert.equal(calls, 1);
  } finally {
    await rm(path.join(directory, budget.month, '1'), { force: true });
    await rmdir(path.join(directory, budget.month));
    await rmdir(directory);
  }
});
