import { app } from './app';
import { env } from './config/env';
import { pool } from './config/db';
import type { Server } from 'node:http';
// Development only. A failed setup never leaves an apparently healthy API listening.
export async function startServer(): Promise<Server> {
  if (env.nodeEnv === 'development' && env.devDbAutoSetup) {
    const { prepareDevelopmentDatabase } =
      require('../scripts/prepare-development-db.cjs') as {
        prepareDevelopmentDatabase: (options: {
          db: typeof env.db;
          seed: boolean;
        }) => Promise<unknown>;
      };
    await prepareDevelopmentDatabase({ db: env.db, seed: env.devSeedHaengsin });
  }
  return new Promise((resolve, reject) => {
    const server = app.listen(env.port, env.host, () => {
      console.log(
        `🚀 coffee-station backend: http://localhost:${env.port} (${env.nodeEnv})`,
      );
      resolve(server);
    });
    server.once('error', reject);
  });
}
if (require.main === module)
  startServer().catch(async error => {
    console.error(
      error instanceof Error ? error.message : '서버 시작에 실패했습니다.',
    );
    await pool.end();
    process.exitCode = 1;
  });
