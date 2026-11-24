const { test } = require('node:test');
const assert = require('node:assert/strict');
test(
  'legacy/team ID collisions preserve identities, content and author relations; migration repeats safely',
  { skip: !process.env.MIGRATION_TEST_DB },
  async t => {
    process.env.NODE_ENV = 'test';
    const mysql = require('mysql2/promise');
    const { env } = require('../dist/config/env');
    assert.match(env.db.name, /^coffee_features_test_\d+$/);
    const { name: database, ...settings } = env.db;
    const c = await mysql.createConnection({
      ...settings,
      database,
      multipleStatements: true,
    });
    try {
      await require('./fixtures/setupCommunity.cjs').setup(c, { legacy: true });
    await c.query('ALTER TABLE users DROP COLUMN active');
    await c.query('ALTER TABLE refresh_tokens DROP INDEX session_lookup, DROP COLUMN session_id');
      await c.query(
        "INSERT INTO users(user_id,kakao_id,nickname,role) VALUES(1,'7777','team unrelated','USER'),(9,'8888','team owner','OWNER')",
      );
      await c.query(
        "INSERT INTO community_accounts(user_id,nickname,active) VALUES(1,'local owner',1),(2,'blocked local',0)",
      );
      await c.query(
        "INSERT INTO auth_users(user_id,kakao_id) VALUES(1,'8888'),(2,'9999')",
      );
      await c.query(
        "INSERT INTO cafes(cafe_id,name,address,latitude,longitude) VALUES(1,'Store','Address',37.6,126.8)",
      );
      await c.query(
        "INSERT INTO menus(menu_id,standard_name,category) VALUES(1,'Coffee','COFFEE')",
      );
      await c.query(
        "INSERT INTO menu_prices(price_id,cafe_id,menu_id,size,option_name,price,source,verified_at) VALUES(1,1,1,'Regular','ICE',2000,'DEMO',CURRENT_DATE())",
      );
      await c.query(
        "INSERT INTO community_reviews(id,cafe_id,author_id,author_nickname,rating,content) VALUES('r1',1,1,'owner',5,'original review'),('r2',1,2,'blocked',4,'second review')",
      );
      await c.query(
        "INSERT INTO community_review_comments(id,review_id,author_id,content) VALUES('c1','r1',2,'original comment')",
      );
      await c.query(
        "INSERT INTO community_review_likes(review_id,user_id) VALUES('r1',1),('r1',2)",
      );
      await c.query(
        "INSERT INTO cafe_price_requests(id,cafe_id,price_id,author_id,reported_price,note) VALUES('p1',1,1,1,2300,'original report')",
      );
      await c.query(
        "INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES(9,REPEAT('a',64),DATE_ADD(NOW(),INTERVAL 1 DAY))",
      );
      const { migrateAuth } = require('../scripts/migrate-auth.cjs');
      await migrateAuth(c);
      const [map] = await c.query(
        'SELECT legacy_id,user_id FROM legacy_community_user_map ORDER BY legacy_id',
      );
      assert.equal(map[0].user_id, 9);
      assert.notEqual(map[1].user_id, 1);
      assert.notEqual(map[1].user_id, 9);
      const [u] = await c.query('SELECT * FROM users ORDER BY user_id');
      assert.equal(u.find(x => x.user_id === 1).kakao_id, '7777');
      assert.equal(u.find(x => x.user_id === 9).role, 'OWNER');
      assert.equal(u.find(x => x.kakao_id === '9999').active, 0);
      const [r] = await c.query(
        'SELECT id,author_id,content FROM community_reviews ORDER BY id',
      );
      assert.equal(r[0].author_id, 9);
      assert.equal(r[0].content, 'original review');
      assert.equal(r[1].author_id, map[1].user_id);
      const [comments] = await c.query(
        'SELECT author_id,content FROM community_review_comments',
      );
      assert.equal(comments[0].author_id, map[1].user_id);
      assert.equal(comments[0].content, 'original comment');
      const [likes] = await c.query(
        'SELECT user_id FROM community_review_likes ORDER BY user_id',
      );
      assert.deepEqual(
        likes.map(x => x.user_id),
        map.map(x => x.user_id).sort((a, b) => a - b),
      );
      const [p] = await c.query(
        'SELECT author_id,reported_price FROM cafe_price_requests',
      );
      assert.equal(p[0].author_id, 9);
      assert.equal(p[0].reported_price, 2300);
      const [old] = await c.query('SELECT revoked_at FROM refresh_tokens');
      assert.ok(old[0].revoked_at);
      const [archived] = await c.query(
        'SELECT COUNT(*) n FROM legacy_community_accounts',
      );
      assert.equal(archived[0].n, 2);
      await migrateAuth(c);
      const [again] = await c.query(
        'SELECT id,author_id,content FROM community_reviews ORDER BY id',
      );
      assert.deepEqual(again, r);
      const [prices] = await c.query('SELECT price FROM menu_prices');
      assert.equal(prices[0].price, 2000);
      const [keys] = await c.query(
        "SELECT table_name FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND referenced_table_name='users' AND table_name IN ('community_reviews','community_review_comments','community_review_likes','cafe_price_requests')",
      );
      assert.equal(keys.length, 4);
    } finally {
      await c.end();
    }
  },
);
