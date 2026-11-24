const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { migrateAuth, authMigrationApplied } = require('./migrate-auth.cjs');
const ROOT = path.resolve(__dirname, '../..'),
  SQL = path.resolve(__dirname, '../sql');
const localHost = host => ['localhost', '127.0.0.1', '::1'].includes(host);
const digest = value =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
async function tables(conn) {
  const [r] = await conn.query(
    "SELECT TABLE_NAME name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'",
  );
  return r.map(x => x.name);
}
async function applied(conn, id) {
  const [r] = await conn.query('SELECT 1 FROM app_migrations WHERE id=?', [id]);
  return !!r.length;
}
async function backup(conn, directory, database, names) {
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(
    directory,
    database.replace(/[^a-zA-Z0-9_-]/g, '_') +
      '-' +
      Date.now() +
      '-' +
      crypto.randomBytes(4).toString('hex') +
      '.sql',
  );
  const [zone] = await conn.query('SELECT @@session.time_zone zone');
  const lines = [
    '-- Local development backup. Restore only into the intended database.',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS=0;',
    'SET @coffee_backup_time_zone=@@session.time_zone;',
    "SET time_zone='+00:00';",
  ];
  await conn.query("SET time_zone='+00:00'");
  try {
    await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    for (const name of names.sort()) {
      const [create] = await conn.query(
        'SHOW CREATE TABLE ' + mysql.escapeId(name),
      );
      lines.push(
        'DROP TABLE IF EXISTS ' + mysql.escapeId(name) + ';',
        create[0]['Create Table'] + ';',
      );
      const [cols] = await conn.query(
        "SELECT column_name name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND extra NOT LIKE '%VIRTUAL GENERATED%' AND extra NOT LIKE '%STORED GENERATED%' ORDER BY ordinal_position",
        [name],
      );
      const names = cols.map(c => c.name);
      if (!names.length) continue;
      const [rows] = await conn.query(
        'SELECT ' +
          names.map(n => mysql.escapeId(n)).join(',') +
          ' FROM ' +
          mysql.escapeId(name),
      );
      for (const row of rows) {
        const values = names.map(k => {
          const v = row[k];
          return mysql.escape(
            v &&
              typeof v === 'object' &&
              !Buffer.isBuffer(v) &&
              !(v instanceof Date)
              ? JSON.stringify(v)
              : v,
          );
        });
        lines.push(
          'INSERT INTO ' +
            mysql.escapeId(name) +
            ' (' +
            names.map(n => mysql.escapeId(n)).join(',') +
            ') VALUES (' +
            values.join(',') +
            ');',
        );
      }
    }
    await conn.commit();
    lines.push(
      'SET FOREIGN_KEY_CHECKS=1;',
      'SET time_zone=@coffee_backup_time_zone;',
    );
    await fs.writeFile(filename, lines.join('\n') + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    return filename;
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    await conn.query('SET time_zone=?', [zone[0].zone]);
  }
}
async function connect(db) {
  const { name: database, ...settings } = db;
  try {
    return await mysql.createConnection({
      ...settings,
      database,
      multipleStatements: true,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
  } catch (e) {
    if (e.code !== 'ER_BAD_DB_ERROR') throw e;
    const c = await mysql.createConnection({
      ...settings,
      multipleStatements: true,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    try {
      await c.query(
        'CREATE DATABASE ' +
          mysql.escapeId(database) +
          ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      );
      await c.changeUser({ database });
      return c;
    } catch (err) {
      await c.end();
      throw err;
    }
  }
}
async function prepareDevelopmentDatabase({
  db,
  seed = true,
  backupDir = path.join(ROOT, '.local', 'db-backups'),
  log = console.log,
}) {
  if (!localHost(db.host))
    throw new Error(
      '자동 DB 준비는 로컬 DB만 허용합니다. 원격 DB는 수동 migration을 사용해 주세요.',
    );
  if (!db.name || db.name.length > 64 || !db.user)
    throw new Error('DB_NAME/DB_USER 설정을 확인해 주세요.');
  let conn;
  try {
    conn = await connect(db);
  } catch (e) {
    throw new Error(
      'DB 연결 실패 (' +
        (e.code || 'unknown') +
        '). 로컬 DB 실행 상태와 .env DB 연결값을 확인해 주세요.',
    );
  }
  let locked = false;
  let backupFile = null;
  const done = [];
  try {
    const [lock] = await conn.query(
      "SELECT GET_LOCK(CONCAT('coffee-dev:',MD5(DATABASE())),30) locked",
    );
    if (!lock[0].locked)
      throw new Error(
        '다른 DB 준비 작업이 실행 중입니다. 잠시 후 다시 실행해 주세요.',
      );
    locked = true;
    const original = await tables(conn),
      initial = new Set(original);
    const file = async name => fs.readFile(path.join(SQL, name), 'utf8');
    const base = await file('schema.sql'),
      community = await file('migrations/006_community_schema.sql');
    const prices = seed ? await file('seeds/haengsin.sql') : '';
    const reviews = await file('seeds/haengsin_reviews.sql'),
      importSql = await file('migrations/003_import_generated_reviews.sql');
    const baseId = 'dev-base-v1',
      communityId = '006_community_schema',
      priceId = 'dev-haengsin-' + digest(prices),
      reviewId = 'dev-reviews-' + digest(prices + reviews + importSql);
    const authReady = await authMigrationApplied(conn);
    const seen = async id =>
      initial.has('app_migrations') && (await applied(conn, id));
    const baseTables = [
      'brands',
      'cafes',
      'menus',
      'menu_prices',
      'users',
      'refresh_tokens',
    ];
    const featureTables = [
      'community_reviews',
      'community_review_comments',
      'community_review_images',
      'community_review_likes',
      'cafe_price_requests',
      'cafe_interactions',
    ];
    const needsBase =
      baseTables.some(t => !initial.has(t)) || !(await seen(baseId));
    const needsCommunity =
      featureTables.some(t => !initial.has(t)) || !(await seen(communityId));
    const needsPrices = seed && !(await seen(priceId)),
      needsReviews = seed && !(await seen(reviewId));
    const importId = 'dev-import-' + digest(importSql),
      needsImport = !seed && !(await seen(importId));
    if (
      original.length &&
      (needsBase ||
        needsCommunity ||
        !authReady ||
        needsPrices ||
        needsReviews ||
        needsImport)
    ) {
      backupFile = await backup(conn, backupDir, db.name, original);
      log('기존 DB 자동 백업: ' + backupFile);
    }
    await conn.query(
      'CREATE TABLE IF NOT EXISTS app_migrations(id VARCHAR(100) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB',
    );
    const mark = async id =>
      conn.query('INSERT IGNORE INTO app_migrations(id) VALUES(?)', [id]);
    const run = async (id, sql, needed = true) => {
      if (!needed) return;
      await conn.query(sql);
      await mark(id);
      done.push(id);
      log('DB 적용: ' + id);
    };
    await run(baseId, base, needsBase);
    if (!authReady) {
      // The older local schema needs its original FK graph before identities are mapped.
      if (initial.has('community_accounts'))
        await conn.query(await file('migrations/002_community_features.sql'));
      else await conn.query(community);
      await migrateAuth(conn);
      done.push('005_unified_auth');
      log('DB 적용: 005_unified_auth');
    }
    await run(communityId, community, needsCommunity);
    await run(
      priceId,
      'SET @hs_preserve_existing_coordinates=1;\n' + prices,
      needsPrices,
    );
    if (needsReviews) {
      await conn.query(await file('migrations/001_generated_reviews.sql'));
      await conn.query(reviews);
      await run(reviewId, importSql);
    } else if (needsImport) await run(importId, importSql);
    const existing = new Set(await tables(conn));
    for (const name of [...baseTables, ...featureTables, 'auth_login_flows'])
      if (!existing.has(name))
        throw new Error('필수 기능 테이블 누락: ' + name);
    const [counts] = await conn.query(
      'SELECT (SELECT COUNT(*) FROM cafes) cafes,(SELECT COUNT(*) FROM menu_prices) prices,(SELECT COUNT(*) FROM community_reviews) reviews',
    );
    const summary = {
      database: db.name,
      applied: done,
      backupFile,
      counts: counts[0],
    };
    log(
      'DB 준비 완료: 매장 ' +
        counts[0].cafes +
        ' / 가격 옵션 ' +
        counts[0].prices +
        ' / 리뷰 ' +
        counts[0].reviews,
    );
    return summary;
  } catch (error) {
    await conn.rollback().catch(() => {});
    const code = error.code;
    throw new Error(
      'DB 자동 준비 실패' +
        (code ? ' (' + code + ')' : '') +
        '. ' +
        (backupFile ? '기존 DB 백업: ' + backupFile + '. ' : '') +
        (code ? '스키마/권한/시드 ID 충돌을 확인해 주세요.' : error.message),
    );
  } finally {
    if (locked)
      await conn
        .query("SELECT RELEASE_LOCK(CONCAT('coffee-dev:',MD5(DATABASE())))")
        .catch(() => {});
    await conn.end();
  }
}
module.exports = { prepareDevelopmentDatabase, backup, localHost };
