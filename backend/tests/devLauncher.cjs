const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  settings,
  dependencies,
  ensureDatabase,
} = require('../../scripts/dev.cjs');
async function project() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'coffee-launcher-'));
  await fs.writeFile(
    path.join(root, '.env.example'),
    'DB_HOST=localhost\nDB_PORT=3306\nDB_NAME=coffee_station\nDB_USER=coffee\nDB_PASSWORD=change-me\nDB_ROOT_PASSWORD=change-me-root\nJWT_SECRET=change-me\nUSE_MOCK_API=\nMVP_CATALOG_MODE=mock\nKAKAO_CLIENT_SECRET=\n',
  );
  return root;
}

test('a stopped existing MySQL container is restarted before creating a new volume', async () => {
  const calls = [];
  let probes = 0;
  await ensureDatabase(
    '/workspace',
    { DB_HOST: '127.0.0.1', DB_PORT: '33317' },
    async (program, args) => calls.push([program, ...args]),
    async () => ['existing-mysql'],
    async () => ++probes > 1,
  );
  assert.ok(calls.some(c => c[1] === 'start' && c[2] === 'existing-mysql'));
  assert.ok(!calls.some(c => c.includes('compose')));
});

test('an unused local DB port creates a healthy private compose service without deleting volumes', async () => {
  const calls = [];
  await ensureDatabase(
    '/workspace',
    {
      DB_HOST: '127.0.0.1',
      DB_PORT: '33317',
      DB_PASSWORD: 'local',
      DB_ROOT_PASSWORD: 'local-root',
    },
    async (program, args) => calls.push([program, ...args]),
    async () => [],
    async () => false,
  );
  const compose = calls.find(c => c.includes('compose'));
  assert.ok(compose.includes('--wait'));
  assert.ok(compose.includes('--env-file'));
  assert.ok(compose.includes('mysql'));
  assert.ok(!compose.includes('down'));
});

test('ambiguous existing DB containers stop startup instead of silently using another data volume', async () => {
  const calls = [];
  await assert.rejects(
    ensureDatabase(
      '/workspace',
      { DB_HOST: '127.0.0.1', DB_PORT: '33317' },
      async (program, args) => calls.push(args),
      async () => ['db-a', 'db-b'],
      async () => false,
    ),
    /여러 개/,
  );
  assert.ok(!calls.some(c => c.includes('start') || c.includes('compose')));
});
test('fresh launch creates private reproducible settings once, without sharing an auth secret', async () => {
  const root = await project();
  const first = await settings(root, {}, async () => '3312');
  const second = await settings(root, {}, async () => {
    throw new Error('port must not change');
  });
  assert.equal(first.DB_PORT, '3312');
  assert.equal(first.USE_MOCK_API, 'false');
  assert.equal(first.MVP_CATALOG_MODE, 'mysql-seed');
  assert.match(first.JWT_SECRET, /^[a-f0-9]{64}$/);
  assert.equal(first.JWT_SECRET, second.JWT_SECRET);
  assert.equal(first.DB_PASSWORD, second.DB_PASSWORD);
});
test('existing DB credentials, real auth keys and unrelated settings survive startup', async () => {
  const root = await project(),
    file = path.join(root, '.env');
  const content =
    'DB_NAME=existing_db\nDB_PASSWORD=keep-password\nJWT_SECRET=' +
    'x'.repeat(64) +
    '\nKAKAO_CLIENT_SECRET=keep-client-secret\nUSE_MOCK_API=false\nMVP_CATALOG_MODE=mysql-seed\nCUSTOM_SETTING=keep\n';
  await fs.writeFile(file, content);
  const value = await settings(root, {});
  assert.equal(value.DB_PASSWORD, 'keep-password');
  assert.equal(value.KAKAO_CLIENT_SECRET, 'keep-client-secret');
  assert.equal(await fs.readFile(file, 'utf8'), content);
});
test('placeholder JWT and empty API mode are completed without overwriting private Kakao settings', async () => {
  const root = await project();
  await fs.writeFile(
    path.join(root, '.env'),
    'JWT_SECRET=change-me\nKAKAO_CLIENT_SECRET=private-setting\nUSE_MOCK_API=\n',
  );
  const value = await settings(root, {});
  assert.match(value.JWT_SECRET, /^[a-f0-9]{64}$/);
  assert.equal(value.KAKAO_CLIENT_SECRET, 'private-setting');
  assert.equal(value.USE_MOCK_API, 'false');
});
test('production use is rejected before a private configuration is rewritten', async () => {
  const root = await project();
  await assert.rejects(
    settings(root, { NODE_ENV: 'production' }, async () => '3312'),
    /개발 전용/,
  );
  await assert.rejects(fs.access(path.join(root, '.env')));
});
test('dependency installation is repeated only when the lock changes', async () => {
  const root = await project(),
    backend = path.join(root, 'backend');
  await fs.mkdir(backend);
  await fs.writeFile(path.join(backend, 'package-lock.json'), 'version-one');
  let calls = 0;
  const run = async () => {
    calls++;
    for (const p of ['tsx', 'mysql2']) {
      await fs.mkdir(path.join(backend, 'node_modules', p), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(backend, 'node_modules', p, 'package.json'),
        '{}',
      );
    }
  };
  await dependencies(root, {}, run);
  await dependencies(root, {}, run);
  assert.equal(calls, 1);
  await fs.writeFile(path.join(backend, 'package-lock.json'), 'version-two');
  await dependencies(root, {}, run);
  assert.equal(calls, 2);
});
