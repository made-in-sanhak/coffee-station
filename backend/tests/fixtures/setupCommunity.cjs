const fs = require('node:fs/promises');
const path = require('node:path');
async function setup(conn, { legacy = false } = {}) {
  const [db] = await conn.query('SELECT DATABASE() name');
  if (!/^coffee_features_test_\d+$/.test(db[0].name))
    throw new Error('Disposable test DB required');
  const [tables] = await conn.query('SHOW TABLES');
  if (tables.length) throw new Error('Setup requires an EMPTY test database');
  const apply = async p =>
    conn.query(await fs.readFile(path.join(__dirname, '../../', p), 'utf8'));
  await apply('sql/schema.sql');
  await apply('sql/migrations/002_community_features.sql');
  if (legacy) await apply('sql/migrations/004_service_auth.sql');
  else await require('../../scripts/migrate-auth.cjs').migrateAuth(conn);
  if (!legacy) await apply('tests/fixtures/community.sql');
}
if (require.main === module) {
  process.env.NODE_ENV = 'test';
  const mysql = require('mysql2/promise');
  const { env } = require('../../dist/config/env');
  const { name: database, ...settings } = env.db;
  mysql
    .createConnection({ ...settings, database, multipleStatements: true })
    .then(async c => {
      try {
        await setup(c);
        console.log('Prepared:', database);
      } finally {
        await c.end();
      }
    })
    .catch(e => {
      console.error(e.code || e.message);
      process.exitCode = 1;
    });
}
module.exports = { setup };
