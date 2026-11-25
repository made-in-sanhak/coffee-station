const { env } = require('../dist/config/env');
const { prepareDevelopmentDatabase } = require('./prepare-development-db.cjs');
if (env.nodeEnv === 'production') {
  console.error('운영 DB는 배포 migration 절차를 사용하세요.');
  process.exitCode = 1;
} else
  prepareDevelopmentDatabase({ db: env.db, seed: true }).catch(e => {
    console.error(e.message);
    process.exitCode = 1;
  });
