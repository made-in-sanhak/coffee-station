const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
process.env.NODE_ENV = 'test';
const {
  prepareDevelopmentDatabase,
} = require('../scripts/prepare-development-db.cjs');
test('automatic setup refuses remote databases before making any connection', async () => {
  await assert.rejects(
    prepareDevelopmentDatabase({
      db: { host: 'rds.example.com', name: 'app', user: 'app' },
    }),
    /로컬 DB/,
  );
});
test('a failed development setup never opens the HTTP server', async () => {
  const module = require('../scripts/prepare-development-db.cjs'),
    original = module.prepareDevelopmentDatabase;
  const { env } = require('../dist/config/env');
  const saved = { ...env };
  const { app } = require('../dist/app');
  const originalListen = app.listen;
  let listened = false;
  try {
    env.nodeEnv = 'development';
    env.devDbAutoSetup = true;
    module.prepareDevelopmentDatabase = async () => {
      throw new Error('setup rejected');
    };
    app.listen = () => {
      listened = true;
      throw new Error('must not listen');
    };
    await assert.rejects(
      require('../dist/server').startServer(),
      /setup rejected/,
    );
    assert.equal(listened, false);
  } finally {
    Object.assign(env, saved);
    module.prepareDevelopmentDatabase = original;
    app.listen = originalListen;
  }
});
test(
  'fresh dev server is ready with all cafe/menu/review data; restarts preserve user content',
  { skip: !process.env.DEV_BOOTSTRAP_TEST },
  async () => {
    const mysql = require('mysql2/promise'),
      { env } = require('../dist/config/env');
    assert.match(env.db.name, /^coffee_features_test_\d+$/);
    const { name: database, ...settings } = env.db;
    const conn = await mysql.createConnection({
      ...settings,
      database,
      multipleStatements: true,
      dateStrings: true,
    });
    const backupDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'coffee-db-backup-'),
    );
    const opts = { db: env.db, backupDir, log: () => {} };
    const [initial] = await conn.query('SHOW TABLES');
    assert.equal(initial.length, 0);
    const saved = { ...env },
      serverModule = require('../dist/server');
    let server;
    try {
      env.nodeEnv = 'development';
      env.devDbAutoSetup = true;
      env.devSeedHaengsin = true;
      env.port = 0;
      env.host = '127.0.0.1';
      env.catalogMode = 'mysql-seed';
      server = await serverModule.startServer();
      const url = 'http://127.0.0.1:' + server.address().port;
      const health = await (await fetch(url + '/health')).json();
      assert.equal(health.data.db, 'ok');
      const cafes = await (await fetch(url + '/api/cafes')).json();
      assert.equal(cafes.data.length, 21);
      const menus = await (await fetch(url + '/api/cafes/9001/menus')).json();
      assert.ok(menus.data.length > 2);
      const reviews = await (
        await fetch(url + '/api/reviews?cafeId=9001')
      ).json();
      assert.equal(reviews.data.length, 5);
      const [brands] = await conn.query(
        'SELECT name,COUNT(*) n FROM brands GROUP BY name',
      );
      assert.equal(brands.length, 8);
      assert.ok(brands.every(b => Number(b.n) === 1));
      const [before] = await conn.query(
        'SELECT (SELECT COUNT(*) FROM menu_prices) prices,(SELECT COUNT(*) FROM community_reviews) reviews',
      );
      assert.equal(Number(before[0].prices), 2740);
      assert.equal(Number(before[0].reviews), 105);
      await conn.query(
        "INSERT INTO users(user_id,kakao_id,nickname) VALUES(999,'999999','user-content')",
      );
      await conn.query(
        "INSERT INTO community_reviews(id,cafe_id,author_id,author_nickname,rating,content) VALUES('manual-review',9001,999,'user-content',4,'KEEP ME')",
      );
      await conn.query(
        "UPDATE menu_prices SET price=8765,source='OWNER' WHERE price_id=(SELECT id FROM (SELECT MIN(price_id) id FROM menu_prices) q)",
      );
      await conn.query(
        "INSERT INTO community_review_images(id,review_id,position,mime_type,image_data) VALUES('00000000-0000-4000-8000-000000000001','manual-review',0,'image/png',X'00FF01')",
      );
      const [originalDate] = await conn.query(
        "SELECT created_at FROM community_reviews WHERE id='manual-review'",
      );
      await conn.query(
        'UPDATE cafes SET latitude=37.6000000 WHERE cafe_id=9001',
      );
      // Re-apply seed and canonical-schema steps to prove retry/recovery is additive.
      await conn.query(
        "DELETE FROM app_migrations WHERE id LIKE 'dev-haengsin-%' OR id='006_community_schema'",
      );
      const results = await Promise.all([
        prepareDevelopmentDatabase(opts),
        prepareDevelopmentDatabase(opts),
      ]);
      assert.ok(results.some(r => r.backupFile));
      const [r] = await conn.query(
        "SELECT content FROM community_reviews WHERE id='manual-review'",
      );
      assert.equal(r[0].content, 'KEEP ME');
      const [after] = await conn.query(
        'SELECT (SELECT COUNT(*) FROM menu_prices) prices,(SELECT COUNT(*) FROM community_reviews) reviews',
      );
      assert.equal(after[0].prices, before[0].prices);
      assert.equal(Number(after[0].reviews), 106);
      const [location] = await conn.query(
        'SELECT latitude FROM cafes WHERE cafe_id=9001',
      );
      assert.equal(Number(location[0].latitude), 37.6);
      const [price] = await conn.query(
        "SELECT COUNT(*) n FROM menu_prices WHERE price=8765 AND source='OWNER'",
      );
      assert.equal(Number(price[0].n), 1);
      const files = await fs.readdir(backupDir);
      assert.ok(files.length);
      const sql = await fs.readFile(path.join(backupDir, files[0]), 'utf8');
      assert.ok(sql.includes('KEEP ME'));
      assert.ok(sql.includes('created_at'));
      const repeat = await prepareDevelopmentDatabase(opts);
      assert.equal(repeat.applied.length, 0);
      assert.equal(repeat.backupFile, null);
      server.closeAllConnections();
      await new Promise(r => server.close(r));
      server = undefined;
      await conn.query(sql);
      const [restored] = await conn.query(
        "SELECT content,created_at FROM community_reviews WHERE id='manual-review'",
      );
      assert.equal(restored[0].content, 'KEEP ME');
      assert.equal(restored[0].created_at, originalDate[0].created_at);
      const [image] = await conn.query(
        "SELECT image_data FROM community_review_images WHERE review_id='manual-review'",
      );
      assert.deepEqual(image[0].image_data, Buffer.from([0, 255, 1]));
    } finally {
      if (server) {
        server.closeAllConnections();
        await new Promise(r => server.close(r));
      }
      Object.assign(env, saved);
      await conn.end();
      await require('../dist/config/db').pool.end();
    }
  },
);
