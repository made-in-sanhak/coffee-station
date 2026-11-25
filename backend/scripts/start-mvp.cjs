const { spawn } = require('node:child_process');
const path = require('node:path');

function mvpSettings(mode, values = process.env, extraction = 'mock') {
  if (!['mock', 'mysql-seed'].includes(mode))
    throw new Error('Choose mock or mysql-seed');
  if (!['mock', 'gemini'].includes(extraction))
    throw new Error('Choose mock or gemini');
  return {
    ...values,
    NODE_ENV: 'development',
    EXTRACTION_MODE: extraction,
    MVP_CATALOG_MODE: mode,
    // MVP launchers only query existing data. General dev startup owns setup.
    DEV_DB_AUTO_SETUP: 'false',
  };
}

if (require.main === module) {
  const mode = process.argv[2];
  const env = mvpSettings(mode, process.env, process.argv[3]);
  console.log(`MVP catalog=${mode}; extraction=${env.EXTRACTION_MODE}`);
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
