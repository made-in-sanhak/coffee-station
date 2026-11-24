const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'mock';
process.env.KAKAO_REST_API_KEY = 'test-rest-key';
process.env.KAKAO_CLIENT_SECRET = 'test-client-secret';
process.env.KAKAO_REDIRECT_URI = 'http://localhost:8080/auth/kakao/callback';
const { app } = require('../dist/app');
const { userStore } = require('../dist/modules/auth/userStore');
const { signAccessToken } = require('../dist/modules/auth/tokens');
const { installFakeUserStore } = require('./fixtures/fakeUserStore.cjs');

const realFetch = globalThis.fetch;
const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

// 카카오는 가짜로 응답하고, DB 는 메모리 구현으로 바꿉니다.
async function withServer(run) {
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.includes('kauth.kakao.com')) return json({ access_token: 'kakao-access-token' });
    if (href.includes('kapi.kakao.com')) return json({ id: 777, properties: { nickname: '행신 커피러' } });
    return realFetch(url, init);
  };
  const store = installFakeUserStore(userStore);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (method, path, { body, token } = {}) => {
      const response = await realFetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const login = async () => (await call('POST', '/auth/kakao', {
      body: { code: 'auth-code', redirectUri: process.env.KAKAO_REDIRECT_URI },
    })).body.data;
    await run({ call, login, store });
  } finally {
    store.restore();
    globalThis.fetch = realFetch;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test('logging in twice keeps one member and the access token opens /api/users/me', async () => {
  await withServer(async ({ call, login, store }) => {
    const first = await login();
    const second = await login();
    assert.equal(first.user.id, second.user.id, 'the same Kakao account maps to the same member');
    assert.equal(store.users.size, 1);

    const me = await call('GET', '/api/users/me', { token: second.accessToken });
    assert.equal(me.status, 200);
    assert.deepEqual(me.body.data, { id: first.user.id, nickname: '행신 커피러', profileImageUrl: null, role: 'USER' });
  });
});

test('refresh rotates tokens and a used refresh token cannot be reused', async () => {
  await withServer(async ({ call, login }) => {
    const session = await login();
    const refreshed = await call('POST', '/api/auth/refresh', { body: { refreshToken: session.refreshToken } });
    assert.equal(refreshed.status, 200);
    assert.notEqual(refreshed.body.data.refreshToken, session.refreshToken);
    assert.equal(refreshed.body.data.user.id, session.user.id);
    assert.equal((await call('GET', '/api/users/me', { token: refreshed.body.data.accessToken })).status, 200);

    assert.equal((await call('POST', '/api/auth/refresh', { body: { refreshToken: session.refreshToken } })).status, 401);
    assert.equal((await call('POST', '/api/auth/refresh', { body: { refreshToken: refreshed.body.data.refreshToken } })).status, 200);
  });
});

test('logout revokes the refresh token and is safe to repeat', async () => {
  await withServer(async ({ call, login }) => {
    const session = await login();
    const logout = await call('POST', '/api/auth/logout', { body: { refreshToken: session.refreshToken } });
    assert.deepEqual(logout, { status: 200, body: { success: true, data: null, message: null } });
    assert.equal((await call('POST', '/api/auth/refresh', { body: { refreshToken: session.refreshToken } })).status, 401);
    assert.equal((await call('POST', '/api/auth/logout', { body: { refreshToken: session.refreshToken } })).status, 200);
    assert.equal((await call('POST', '/api/auth/logout', { body: {} })).status, 400);
  });
});

test('protected routes reject missing, forged, tampered and expired access tokens', async () => {
  await withServer(async ({ call, login }) => {
    const { accessToken } = await login();
    const [header, payload, signature] = accessToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const tampered = `${header}.${Buffer.from(JSON.stringify({ ...claims, role: 'ADMIN' })).toString('base64url')}.${signature}`;
    const expired = signAccessToken({ userId: claims.sub * 1, role: 'USER' }, Date.now() - 2 * 60 * 60 * 1000);
    for (const token of [undefined, 'not-a-token', `${header}.${payload}.forged`, tampered, expired]) {
      const response = await call('GET', '/api/users/me', { token });
      assert.equal(response.status, 401, String(token).slice(0, 20));
      assert.equal(response.body.success, false);
    }
  });
});

test('database failures become 503 without leaking details', async () => {
  await withServer(async ({ call, login, store }) => {
    const session = await login();
    userStore.rotateRefreshToken = async () => { throw new (require('../dist/common/AppError').AppError)(503, '로그인 정보를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.'); };
    const response = await call('POST', '/api/auth/refresh', { body: { refreshToken: session.refreshToken } });
    assert.equal(response.status, 503);
    assert(!JSON.stringify(response.body).includes(session.refreshToken));
    store.restore();
  });
});
