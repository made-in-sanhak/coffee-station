import path from 'node:path';
import { AppError } from '../common/AppError';
export function ocrUsageDirectory() {
 const configured = process.env.CLOVA_OCR_USAGE_DIR || process.env.MENU_BOARD_OCR_USAGE_DIR;
 if (configured && !path.isAbsolute(configured)) throw new AppError(503,'OCR 호출 기록 폴더는 절대 경로로 설정해 주세요.');
 return configured || path.resolve(__dirname,'../../artifacts/clova-quota');
}
