const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'mock';
process.env.KAKAO_REST_API_KEY = 'test-rest-key';
process.env.KAKAO_CLIENT_SECRET = 'test-client-secret';
process.env.KAKAO_REDIRECT_URI = 'http://localhost:8080/auth/kakao/callback';
const { app } = require('../dist/app');
const { env } = require('../dist/config/env');
const { pool } = require('../dist/config/db');
const { userStore } = require('../dist/modules/auth/userStore');
const { hashRefreshToken } = require('../dist/modules/auth/tokens');
const { exchangeKakaoCode, fetchKakaoUser } = require('../dist/modules/auth/kakaoClient');
const { installFakeUserStore } = require('./fixtures/fakeUserStore.cjs');

const realFetch = globalThis.fetch;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const kakaoConfig = { restApiKey: 'k', clientSecret: 's', redirectUri: 'http://localhost/cb' };

async function withServer(kakao, run) {
  const kakaoCalls = [];
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.includes('kakao.com')) {
      kakaoCalls.push(href);
      return kakao(href, init);
    }
    return realFetch(url, init);
  };
  const store = installFakeUserStore(userStore);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const call = async (path, body) => {
      const response = await realFetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    await run({ call, store, kakaoCalls });
  } finally {
    store.restore();
    globalThis.fetch = realFetch;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

// JWT_SECRET 이 빠진 운영 서버를 흉내 냅니다.
async function withoutSigningSecret(run) {
  const saved = { jwtSecret: env.jwtSecret, nodeEnv: env.nodeEnv };
  env.jwtSecret = '';
  env.nodeEnv = 'production';
  try {
    await run();
  } finally {
    Object.assign(env, saved);
  }
}

const okKakao = href => href.includes('/oauth/token')
  ? json(200, { access_token: 'kakao-access-token' })
  : json(200, { id: 4242, properties: { nickname: '행신 커피러' } });

test('refresh checks the signing secret before revoking, so the old refresh token keeps working', async () => {
  await withServer(okKakao, async ({ call, store }) => {
    const login = await call('/auth/kakao', { code: 'auth-code', redirectUri: env.kakao.redirectUri });
    const { refreshToken } = login.body.data;
    let rotations = 0;
    const rotate = userStore.rotateRefreshToken;
    userStore.rotateRefreshToken = async (...args) => { rotations += 1; return rotate(...args); };

    await withoutSigningSecret(async () => {
      const failed = await call('/api/auth/refresh', { refreshToken });
      assert.equal(failed.status, 500);
      assert.equal(failed.body.success, false);
    });
    assert.equal(rotations, 0, 'no rotation happens when the access token cannot be signed');
    assert.equal(store.tokens.get(hashRefreshToken(refreshToken)).revokedAt, null);

    const retried = await call('/api/auth/refresh', { refreshToken });
    assert.equal(retried.status, 200, 'the same refresh token works once the server is fixed');
    assert.equal(rotations, 1);
  });
});

test('kakao login stops before calling Kakao or saving anything when the signing secret is missing', async () => {
  await withServer(okKakao, async ({ call, store, kakaoCalls }) => {
    await withoutSigningSecret(async () => {
      const response = await call('/auth/kakao', { code: 'auth-code', redirectUri: env.kakao.redirectUri });
      assert.equal(response.status, 500);
    });
    assert.deepEqual(kakaoCalls, [], 'the one-time authorization code is not spent');
    assert.equal(store.users.size, 0);
    assert.equal(store.tokens.size, 0);
  });
});

function fakeConnection({ rollbackFails }) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push('begin'); },
    async query() { calls.push('query'); throw new Error('lost connection'); },
    async commit() { calls.push('commit'); },
    async rollback() {
      calls.push('rollback');
      if (rollbackFails) throw new Error('rollback failed');
    },
    release() { calls.push('release'); },
    destroy() { calls.push('destroy'); },
  };
}

test('a connection whose rollback failed is destroyed instead of returned to the pool', async () => {
  const original = pool.getConnection;
  try {
    for (const [rollbackFails, last] of [[true, 'destroy'], [false, 'release']]) {
      const conn = fakeConnection({ rollbackFails });
      pool.getConnection = async () => conn;
      await assert.rejects(
        userStore.rotateRefreshToken('old-hash', { hash: 'new-hash', expiresAt: new Date(Date.now() + 1000) }),
        error => error.status === 503,
      );
      assert.deepEqual(conn.calls, ['begin', 'query', 'rollback', last]);
    }
  } finally {
    pool.getConnection = original;
  }
});

test('Kakao delays and outages are not reported as a rejected authorization code', async () => {
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    // 응답이 오지 않으면 기한 뒤에 끊고 504
    globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    await assert.rejects(exchangeKakaoCode('code', kakaoConfig, 20), error => error.status === 504);
    await assert.rejects(fetchKakaoUser('token', 20), error => error.status === 504);

    // 연결 실패·카카오 5xx 는 502
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(exchangeKakaoCode('code', kakaoConfig), error => error.status === 502);
    globalThis.fetch = async () => json(503, { msg: 'busy' });
    await assert.rejects(exchangeKakaoCode('code', kakaoConfig), error => error.status === 502);
    await assert.rejects(fetchKakaoUser('token'), error => error.status === 502);

    // 인가 코드·토큰 거절만 401
    globalThis.fetch = async () => json(400, { error: 'invalid_grant', error_code: 'KOE320' });
    await assert.rejects(exchangeKakaoCode('code', kakaoConfig), error => error.status === 401);
    globalThis.fetch = async () => json(401, { msg: 'this access token does not exist', code: -401 });
    await assert.rejects(fetchKakaoUser('token'), error => error.status === 401);
  } finally {
    globalThis.fetch = realFetch;
    console.warn = warn;
  }
});

test('a Kakao outage during login reaches the app as 502, not 401', async () => {
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    await withServer(() => json(500, {}), async ({ call, store }) => {
      const response = await call('/auth/kakao', { code: 'auth-code', redirectUri: env.kakao.redirectUri });
      assert.equal(response.status, 502);
      assert.equal(store.users.size, 0);
    });
  } finally {
    console.warn = warn;
  }
});
