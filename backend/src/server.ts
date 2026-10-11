import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`🚀 coffee-station backend: http://localhost:${env.port}  (${env.nodeEnv})`);
});
