import dotenv from 'dotenv';
import path from 'path';

// 저장소 최상위의 .env 를 읽습니다. (backend/src/config → ../../../.env)
// 배포 환경에서는 파일 없이 환경변수로 직접 주입되므로 없어도 오류가 나지 않습니다.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? 'coffee_station',
    user: process.env.DB_USER ?? 'coffee',
    password: process.env.DB_PASSWORD ?? '',
  },
  jwtSecret: process.env.JWT_SECRET ?? '',
};
