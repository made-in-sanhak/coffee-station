const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'mock';
process.env.KAKAO_REST_API_KEY = 'test-rest-key';
process.env.KAKAO_CLIENT_SECRET = 'test-client-secret';
process.env.KAKAO_REDIRECT_URI = 'http://localhost:8080/auth/kakao/callback';
const { app } = require('../dist/app');

const REDIRECT = process.env.KAKAO_REDIRECT_URI;
const realFetch = globalThis.fetch;
const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

// 카카오 주소만 가짜로 응답하고, 로컬 서버 호출은 그대로 보냅니다.
async function withServer(kakao, run) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.startsWith('https://kauth.kakao.com') || href.startsWith('https://kapi.kakao.com')) {
      calls.push({ href, init });
      return kakao(href, init);
    }
    return realFetch(url, init);
  };
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const post = body => realFetch(`http://127.0.0.1:${server.address().port}/auth/kakao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await run(post, calls);
  } finally {
    globalThis.fetch = realFetch;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test('exchanges the code with the client secret and returns the Kakao profile', async () => {
  await withServer(href => href.includes('/oauth/token')
    ? json(200, { access_token: 'kakao-access-token' })
    : json(200, { id: 4242, kakao_account: { profile: { nickname: '행신 커피러', profile_image_url: 'https://img/p.jpg' } } }),
  async (post, calls) => {
    const response = await post({ code: 'auth-code', redirectUri: REDIRECT });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      data: { profile: { kakaoId: '4242', nickname: '행신 커피러', profileImageUrl: 'https://img/p.jpg' } },
      message: null,
    });
    const form = new URLSearchParams(String(calls[0].init.body));
    assert.equal(form.get('grant_type'), 'authorization_code');
    assert.equal(form.get('client_id'), 'test-rest-key');
    assert.equal(form.get('client_secret'), 'test-client-secret');
    assert.equal(form.get('redirect_uri'), REDIRECT);
    assert.equal(form.get('code'), 'auth-code');
    assert.equal(calls[1].init.headers.Authorization, 'Bearer kakao-access-token');
  });
});

test('client secret errors (KOE010) become 401 and only the error code is logged', async () => {
  const logs = [];
  const originalWarn = console.warn;
  console.warn = (...args) => logs.push(args.join(' '));
  try {
    await withServer(() => json(401, {
      error: 'invalid_client', error_code: 'KOE010', error_description: 'Bad client credentials',
    }), async (post, calls) => {
      const response = await post({ code: 'secret-auth-code', redirectUri: REDIRECT });
      assert.equal(response.status, 401);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(calls.length, 1, 'user info must not be requested after a failed exchange');
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(logs, ['Kakao token exchange failed: KOE010']);
  assert(!logs.join().includes('test-client-secret') && !logs.join().includes('secret-auth-code'));
});

test('rejects a missing code or a redirectUri that differs from the server setting', async () => {
  await withServer(() => { throw new Error('Kakao must not be called'); }, async (post, calls) => {
    assert.equal((await post({ code: 'auth-code', redirectUri: 'http://evil.example/callback' })).status, 400);
    assert.equal((await post({ code: 'auth-code' })).status, 400);
    assert.equal((await post({ code: '  ', redirectUri: REDIRECT })).status, 400);
    assert.equal(calls.length, 0);
  });
});
