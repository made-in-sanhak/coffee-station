const {spawn} = require('node:child_process');
const path = require('node:path');
const mode = process.argv[2];
if (!['mock', 'mysql-seed'].includes(mode)) throw new Error('Choose mock or mysql-seed');
console.log(`MVP catalog=${mode}; extraction=mock (no external AI calls)`);
const child = spawn(process.execPath, [require.resolve('tsx/cli'), 'watch', 'src/server.ts'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
  env: {...process.env, NODE_ENV: 'development', EXTRACTION_MODE: 'mock', MVP_CATALOG_MODE: mode},
});
child.on('error', error => {console.error(error.message); process.exitCode = 1;});
child.on('exit', code => {process.exitCode = code ?? 1;});
