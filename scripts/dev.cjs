const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { parseEnv } = require('node:util');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const ROOT = path.resolve(__dirname, '..');
const localHost = host => ['localhost', '127.0.0.1', '::1'].includes(host);
async function listening(host, port) {
  return new Promise(resolve => {
    const s = net.createConnection({ host, port: Number(port) });
    const finish = value => {
      s.destroy();
      resolve(value);
    };
    s.setTimeout(800);
    s.once('connect', () => finish(true));
    s.once('timeout', () => finish(false));
    s.once('error', () => finish(false));
  });
}
async function freePort() {
  for (let p = 3307; p < 3330; p++)
    if (!(await listening('127.0.0.1', p))) return String(p);
  throw new Error('사용 가능한 로컬 MySQL 포트를 찾지 못했습니다.');
}
async function settings(
  root = ROOT,
  environment = process.env,
  choosePort = freePort,
) {
  const file = path.join(root, '.env');
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    content = await fs.readFile(path.join(root, '.env.example'), 'utf8');
    const defaults = {
      DB_HOST: '127.0.0.1',
      DB_PORT: await choosePort(),
      DB_NAME: 'coffee_station',
      DB_USER: 'coffee',
      DB_PASSWORD: crypto.randomBytes(24).toString('hex'),
      DB_ROOT_PASSWORD: crypto.randomBytes(24).toString('hex'),
      MVP_CATALOG_MODE: 'mysql-seed',
      USE_MOCK_API: 'false',
    };
    for (const [k, v] of Object.entries(defaults))
      content = content.replace(new RegExp('^' + k + '=.*$', 'm'), k + '=' + v);
  }
  let values = parseEnv(content),
    changed = false;
  if ((environment.NODE_ENV ?? values.NODE_ENV) === 'production')
    throw new Error(
      'npm run dev는 개발 전용입니다. 운영 서버는 배포 migration 후 npm start를 사용해 주세요.',
    );
  const put = (key, value) => {
    const line = key + '=' + value;
    content = new RegExp('^' + key + '=.*$', 'm').test(content)
      ? content.replace(new RegExp('^' + key + '=.*$', 'm'), line)
      : content + '\n' + line + '\n';
    changed = true;
  };
  const key = environment.JWT_SECRET ?? values.JWT_SECRET;
  if (!key || key.length < 32 || key.startsWith('change-me')) {
    if (environment.JWT_SECRET)
      throw new Error(
        'JWT_SECRET 환경변수를 32자 이상의 무작위 값으로 설정해 주세요.',
      );
    put('JWT_SECRET', crypto.randomBytes(32).toString('hex'));
  }
  if (!values.USE_MOCK_API && !environment.USE_MOCK_API)
    put('USE_MOCK_API', 'false');
  if (!values.MVP_CATALOG_MODE && !environment.MVP_CATALOG_MODE)
    put('MVP_CATALOG_MODE', 'mysql-seed');
  // Create once; real existing settings and private keys are never replaced.
  let exists = true;
  try {
    await fs.access(file);
  } catch {
    exists = false;
  }
  if (changed || !exists)
    await fs.writeFile(file, content, {
      mode: 0o600,
      flag: exists ? 'w' : 'wx',
    });
  values = { ...parseEnv(content), ...environment };
  return {
    ...values,
    NODE_ENV: 'development',
    MVP_CATALOG_MODE: 'mysql-seed',
    EXTRACTION_MODE: values.EXTRACTION_MODE || 'mock',
  };
}
function command(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      stdio: 'inherit',
      windowsHide: true,
      ...options,
    });
    child.once('error', () =>
      reject(new Error(program + ' 실행 실패. 설치와 PATH를 확인해 주세요.')),
    );
    child.once('exit', code =>
      code === 0
        ? resolve()
        : reject(new Error(program + ' 실행 실패 (exit ' + code + ').')),
    );
  });
}
async function dependencies(root, env, run = command) {
  const folder = path.join(root, 'backend'),
    lock = await fs.readFile(path.join(folder, 'package-lock.json'));
  const hash = crypto.createHash('sha256').update(lock).digest('hex'),
    marker = path.join(folder, 'node_modules', '.coffee-lock');
  let installed = false;
  try {
    installed = (await fs.readFile(marker, 'utf8')) === hash;
    await fs.access(path.join(folder, 'node_modules', 'tsx', 'package.json'));
    await fs.access(
      path.join(folder, 'node_modules', 'mysql2', 'package.json'),
    );
  } catch {
    installed = false;
  }
  if (!installed) {
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci'], {
      cwd: folder,
      env,
      shell: process.platform === 'win32',
    });
    await fs.mkdir(path.dirname(marker), { recursive: true });
    await fs.writeFile(marker, hash);
  }
}
async function databaseContainers(port, env) {
  const options = { env, windowsHide: true };
  const { stdout } = await execute('docker', ['ps', '-aq'], options);
  const ids = stdout.trim().split(/\s+/).filter(Boolean);
  const matches = [];
  for (const id of ids) {
    const { stdout: bindings } = await execute(
      'docker',
      ['inspect', '--format', '{{json .HostConfig.PortBindings}}', id],
      options,
    );
    const ports = JSON.parse(bindings) || {};
    if (
      (ports['3306/tcp'] || []).some(
        binding => String(binding.HostPort) === String(port),
      )
    )
      matches.push(id);
  }
  return matches;
}
async function ensureDatabase(
  root,
  env,
  run = command,
  findContainers = databaseContainers,
  isListening = listening,
) {
  const host = env.DB_HOST || '127.0.0.1',
    port = env.DB_PORT || '3306';
  if (!localHost(host))
    throw new Error(
      '자동 실행은 로컬 DB를 사용합니다. 원격 DB는 수동 배포 절차를 사용해 주세요.',
    );
  if (await isListening(host, port)) {
    console.log('설정된 로컬 DB 서버를 사용합니다.');
    return;
  }
  try {
    await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
      env,
      stdio: 'ignore',
    });
  } catch {
    if (process.platform !== 'win32')
      throw new Error('Docker Desktop 또는 Docker 엔진을 먼저 켜 주세요.');
    const desktop = path.join(
      process.env.ProgramFiles || 'C:\\Program Files',
      'Docker',
      'Docker',
      'Docker Desktop.exe',
    );
    await fs.access(desktop).catch(() => {
      throw new Error('Docker Desktop을 설치한 뒤 다시 실행해 주세요.');
    });
    const helper = spawn(desktop, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    helper.on('error', () => {});
    helper.unref();
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
          env,
          stdio: 'ignore',
        });
        ready = true;
        break;
      } catch {}
    }
    if (!ready)
      throw new Error(
        'Docker 엔진이 준비되지 않았습니다. Docker Desktop 상태를 확인해 주세요.',
      );
  }
  const existing = await findContainers(port, env);
  if (existing.length > 1)
    throw new Error(
      '동일 DB 포트의 기존 컨테이너가 여러 개입니다. 사용할 DB를 확인해 주세요.',
    );
  if (existing.length === 1) {
    console.log('기존 MySQL 컨테이너를 다시 시작합니다.');
    await run('docker', ['start', existing[0]], { env });
    for (let i = 0; i < 60; i++) {
      if (await isListening(host, port)) return;
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error(
      '기존 MySQL 컨테이너가 준비되지 않았습니다. 컨테이너 상태를 확인해 주세요.',
    );
  }
  if (!env.DB_PASSWORD || !env.DB_ROOT_PASSWORD)
    throw new Error(
      '새 Docker DB를 만들려면 .env의 DB_PASSWORD/DB_ROOT_PASSWORD가 필요합니다.',
    );
  const project =
    'coffee-station-' +
    crypto.createHash('sha256').update(root).digest('hex').slice(0, 10);
  await run(
    'docker',
    [
      'compose',
      '--project-name',
      project,
      '--env-file',
      path.join(root, '.env'),
      '-f',
      path.join(root, 'infra', 'docker-compose.dev.yml'),
      'up',
      '-d',
      '--wait',
      '--wait-timeout',
      '120',
      'mysql',
    ],
    { cwd: root, env },
  );
}
async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 11))
    throw new Error('Node.js 22.11 이상을 설치해 주세요.');
  const env = await settings();
  console.log('로컬 실행 준비: 의존성 → MySQL → DB 자동 적용 → 백엔드');
  await dependencies(ROOT, env);
  await ensureDatabase(ROOT, env);
  if (!env.KAKAO_REST_API_KEY || !env.KAKAO_REDIRECT_URI)
    console.log(
      '카카오 실제 로그인은 .env의 개인/팀 카카오 설정 후 사용할 수 있습니다. 공개 조회 API는 실행됩니다.',
    );
  await command(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev:watch'],
    {
      cwd: path.join(ROOT, 'backend'),
      env,
      shell: process.platform === 'win32',
    },
  );
}
if (require.main === module)
  main().catch(e => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = {
  settings,
  dependencies,
  ensureDatabase,
  listening,
  localHost,
};
