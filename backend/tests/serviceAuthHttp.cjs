const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.EXTRACTION_MODE = 'mock';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.KAKAO_REST_API_KEY = 'fixture-client';
process.env.KAKAO_CLIENT_SECRET = 'fixture-secret';
process.env.KAKAO_REDIRECT_URI = 'http://localhost:8080/auth/kakao/callback';
const realFetch = globalThis.fetch;
const { kakaoProfile } = require('../dist/modules/auth/kakao');
function provider(profileId = 987654321) {
  return async (url, init) => {
    if (String(url) === 'https://kauth.kakao.com/oauth/token') {
      const form = new URLSearchParams(String(init.body));
      assert.equal(form.get('client_secret'), 'fixture-secret');
      assert.equal(form.get('redirect_uri'), process.env.KAKAO_REDIRECT_URI);
      return new Response(JSON.stringify({ access_token: 'provider-token' }));
    }
    if (String(url) === 'https://kapi.kakao.com/v2/user/me') {
      assert.equal(init.headers.Authorization, 'Bearer provider-token');
      return new Response(
        JSON.stringify({
          id: profileId,
          kakao_account: {
            profile: {
              nickname: '로그인테스트',
              profile_image_url: 'https://example.com/profile.png',
            },
          },
        }),
      );
    }
    return realFetch(url, init);
  };
}
test('Kakao code exchange uses secret, validates profile, hides provider failures', async () => {
  try {
    globalThis.fetch = provider();
    assert.equal((await kakaoProfile('fixture-code')).kakaoId, '987654321');
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: 'invalid_client',
          error_description: 'private data',
        }),
        { status: 401 },
      );
    await assert.rejects(
      () => kakaoProfile('bad-code'),
      e => e.status === 401 && !e.message.includes('private'),
    );
    globalThis.fetch = async () => {
      throw new Error('network private token');
    };
    await assert.rejects(
      () => kakaoProfile('bad-code'),
      e => e.status === 502 && !e.message.includes('private'),
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
test(
  'actual HTTP + MySQL login -> feature writes -> refresh rotation -> logout',
  { skip: !process.env.COMMUNITY_TEST_DB },
  async t => {
    assert.match(process.env.DB_NAME || '', /^coffee_features_test_\d+$/);
    const { app } = require('../dist/app');
    const { pool } = require('../dist/config/db');
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const post = async (path, body = {}, access) => {
      const r = await realFetch(base + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(access ? { Authorization: 'Bearer ' + access } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };
    let session, flow;
    const begin = async () => {
      const r = await post('/auth/kakao/start');
      assert.equal(r.status, 200);
      return r.body.data;
    };
    const loginBody = f => ({
      code: 'fixture-code',
      redirectUri: f.redirectUri,
      state: f.state,
      flowToken: f.flowToken,
    });
    try {
      globalThis.fetch = provider();
      await t.test(
        'state, redirect and one-time flows reject invalid or replayed requests',
        async () => {
          flow = await begin();
          const u = new URL(flow.authorizeUrl);
          assert.equal(u.searchParams.get('state'), flow.state);
          assert.equal(
            (await post('/auth/kakao', { ...loginBody(flow), state: 'wrong' }))
              .status,
            401,
          );
          assert.equal(
            (
              await post('/auth/kakao', {
                ...loginBody(flow),
                redirectUri: 'https://evil.example',
              })
            ).status,
            400,
          );
          const r = await post('/auth/kakao', loginBody(flow));
          assert.equal(r.status, 200);
          session = r.body.data;
          assert.equal(session.user.nickname, '로그인테스트');
          assert.equal(typeof session.user.id, 'number');
          assert(!session.accessToken.startsWith('mock'));
          assert.equal(
            (await post('/auth/kakao', loginBody(flow))).status,
            401,
          );
        },
      );
      await t.test(
        'same Kakao identity reuses member ID; token works for review/comment/like/report',
        async () => {
          const repeat = await post('/auth/kakao', loginBody(await begin()));
          assert.equal(repeat.body.data.user.id, session.user.id);
          const input = {
            cafeId: '1',
            rating: 5,
            text: '실제 서비스 세션으로 작성한 테스트 리뷰',
            category: '리뷰',
          };
          const review = await post('/api/reviews', input, session.accessToken);
          assert.equal(review.status, 201);
          const id = review.body.data.id;
          assert.equal(
            (
              await post(
                '/api/reviews/' + id + '/like',
                {},
                session.accessToken,
              )
            ).body.data.liked,
            true,
          );
          assert.equal(
            (
              await post(
                '/api/reviews/' + id + '/comments',
                { text: '댓글도 저장돼요' },
                session.accessToken,
              )
            ).status,
            201,
          );
          assert.equal(
            (
              await post(
                '/api/cafes/1/price-requests',
                { menuId: '1', reportedPrice: 2100, note: '확인' },
                session.accessToken,
              )
            ).status,
            201,
          );
          const [rows] = await pool.execute(
            'SELECT refresh_hash FROM auth_sessions WHERE id=?',
            [session.refreshToken.split('.')[0]],
          );
          assert.notEqual(rows[0].refresh_hash, session.refreshToken);
        },
      );
      await t.test(
        'refresh rotates opaque token and rejects its previous value',
        async () => {
          const prior = session.refreshToken;
          const r = await post('/api/auth/refresh', { refreshToken: prior });
          assert.equal(r.status, 200);
          session = r.body.data;
          assert.notEqual(session.refreshToken, prior);
          assert.equal(
            (await post('/api/auth/refresh', { refreshToken: prior })).status,
            401,
          );
        },
      );
      await t.test(
        'logout revokes existing access tokens and is repeatable',
        async () => {
          assert.equal(
            (
              await post('/api/auth/logout', {
                refreshToken: session.refreshToken,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await post('/api/auth/logout', {
                refreshToken: session.refreshToken,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await post(
                '/api/reviews',
                { cafeId: '1', rating: 5, text: '차단', category: '리뷰' },
                session.accessToken,
              )
            ).status,
            401,
          );
          assert.equal(
            (
              await post('/api/auth/refresh', {
                refreshToken: session.refreshToken,
              })
            ).status,
            401,
          );
        },
      );
      await t.test(
        'inactive account cannot log in or be reactivated by profile upsert',
        async () => {
          await pool.execute(
            'UPDATE community_accounts SET active=0 WHERE user_id=?',
            [session.user.id],
          );
          try {
            assert.equal(
              (await post('/auth/kakao', loginBody(await begin()))).status,
              403,
            );
          } finally {
            await pool.execute(
              'UPDATE community_accounts SET active=1 WHERE user_id=?',
              [session.user.id],
            );
          }
        },
      );
    } finally {
      globalThis.fetch = realFetch;
      server.closeAllConnections();
      await new Promise(r => server.close(r));
      await pool.end();
    }
  },
);
