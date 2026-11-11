import dotenv from 'dotenv';
import path from 'path';

// 저장소 최상위의 .env 를 읽습니다. (backend/src/config → ../../../.env)
// 배포 환경에서는 파일 없이 환경변수로 직접 주입되므로 없어도 오류가 나지 않습니다.
// Tests use only explicit environment values, never a developer's secret file.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
}

export function loadSettings(values: NodeJS.ProcessEnv) {
  const number = (key: string, fallback: number, max: number) => {
    const value = values[key] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
      throw new Error(`Invalid setting: ${key}`);
    }
    return Number(value);
  };
  const nodeEnv = values.NODE_ENV ?? 'development';
  const extractionMode = values.EXTRACTION_MODE ?? 'mock';
  const catalogMode = values.MVP_CATALOG_MODE ?? 'mock';
  if (!['mock', 'mysql-seed'].includes(catalogMode)) { throw new Error('Invalid setting: MVP_CATALOG_MODE'); }
  if (!['development', 'test', 'production'].includes(nodeEnv)) { throw new Error('Invalid setting: NODE_ENV'); }
  if (!['mock', 'gemini'].includes(extractionMode)) { throw new Error('Invalid setting: EXTRACTION_MODE'); }
  if (extractionMode === 'gemini' && (!values.GEMINI_API_KEY?.trim() || !/^[a-zA-Z0-9._-]+$/.test(values.GEMINI_MODEL ?? ''))) {
    throw new Error('Gemini mode requires GEMINI_API_KEY and a valid GEMINI_MODEL');
  }
  return {
    port: number('PORT', 8080, 65535),
    host: values.HOST ?? '0.0.0.0',
    nodeEnv,
    db: {
      host: values.DB_HOST ?? 'localhost',
      port: number('DB_PORT', 3306, 65535),
      name: values.DB_NAME ?? 'coffee_station',
      user: values.DB_USER ?? 'coffee',
      password: values.DB_PASSWORD ?? '',
    },
    jwtSecret: values.JWT_SECRET ?? '',
    extractionMode,
    catalogMode,
    geminiApiKey: values.GEMINI_API_KEY ?? '',
    geminiModel: values.GEMINI_MODEL ?? '',
    reviewSummaryFile: values.MOCK_REVIEW_SUMMARY_FILE ?? path.resolve(__dirname, '../../artifacts/mock-review-summary.json'),
  };
}

export const env = loadSettings(process.env);
