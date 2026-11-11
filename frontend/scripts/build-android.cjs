const { spawnSync } = require('node:child_process');
const path = require('node:path');
const task = process.argv[2];
if (!['assembleRelease', 'bundleRelease'].includes(task)) throw new Error('Unsupported build task');
const windows = process.platform === 'win32';
const result = spawnSync(windows ? 'cmd.exe' : './gradlew', windows
  ? ['/d', '/c', `gradlew.bat ${task}`] : [task], {
  cwd: path.resolve(__dirname, '../android'), stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
