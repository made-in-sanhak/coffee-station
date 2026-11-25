const { spawn } = require('node:child_process');
const path = require('node:path');

function mvpSettings(mode, values = process.env) {
  if (!['mock', 'mysql-seed'].includes(mode))
    throw new Error('Choose mock or mysql-seed');
  return {
    ...values,
    NODE_ENV: 'development',
    EXTRACTION_MODE: 'mock',
    MVP_CATALOG_MODE: mode,
    // MVP launchers only query existing data. General dev startup owns setup.
    DEV_DB_AUTO_SETUP: 'false',
  };
}

if (require.main === module) {
  const mode = process.argv[2];
  const env = mvpSettings(mode);
  console.log(`MVP catalog=${mode}; extraction=mock (no external AI calls)`);
  const child = spawn(
    process.execPath,
    [require.resolve('tsx/cli'), 'watch', 'src/server.ts'],
    { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env },
  );
  child.on('error', error => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on('exit', code => {
    process.exitCode = code ?? 1;
  });
}

module.exports = { mvpSettings };
