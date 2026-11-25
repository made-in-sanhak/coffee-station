import { randomUUID } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { ocrUsageDirectory } from '../config/ocrUsage';
import { json, Router } from 'express';
import { AppError } from '../common/AppError';
import { ok } from '../common/response';
import { env } from '../config/env';

type Budget = { month: string; limit: number; directory: string };
const maxImageBytes = 10 * 1024 * 1024;

async function reserveScan({ month, limit, directory }: Budget) {
  const folder = path.join(directory, month);
  try {
    await mkdir(folder, { recursive: true });
    for (let count = 1; count <= limit; count++) {
      try {
        const reservation = await open(path.join(folder, String(count)), 'wx');
        await reservation.close();
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
  } catch {
    throw new AppError(503, 'OCR 사용량을 확인할 수 없어 사진 인식을 중단했어요.');
  }
  throw new AppError(429, '이번 달에 설정한 OCR 한도를 모두 사용했어요. 직접 입력해 주세요.');
}

export async function scanReceipt(
  body: unknown,
  settings: { url: URL; secret: string; budget: Budget },
  send = fetch,
): Promise<unknown> {
  const { base64, type } = (body ?? {}) as { base64?: unknown; type?: unknown };
  if (typeof base64 !== 'string' || base64.length > Math.ceil(maxImageBytes / 3) * 4 ||
      base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new AppError(400, '10MB 이하의 JPEG 또는 PNG 사진을 선택해 주세요.');
  }
  const bytes = Buffer.from(base64, 'base64');
  const jpeg = type === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if ((!jpeg && !png) || bytes.length > maxImageBytes) {
    throw new AppError(400, '10MB 이하의 JPEG 또는 PNG 사진을 선택해 주세요.');
  }

  // Count attempts before sending so concurrent requests and timeouts cannot bypass the cap.
  await reserveScan(settings.budget);
  try {
    const response = await send(settings.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': settings.secret },
      body: JSON.stringify({
        version: 'V2', requestId: randomUUID(), timestamp: Date.now(), lang: 'ko',
        enableTableDetection: false,
        images: [{ name: 'receipt', format: jpeg ? 'jpg' : 'png', data: base64 }],
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('CLOVA OCR request failed');
    return await response.json();
  } catch {
    throw new AppError(502, '영수증 인식 서비스에 연결하지 못했어요. 직접 입력할 수도 있어요.');
  }
}

const router = Router();
const parseImageBody = json({ limit: '14mb' });
router.post('/scan', (req, res, next) => {
  const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
  const limit = Number(process.env.CLOVA_OCR_CALL_LIMIT);
  if (env.nodeEnv !== 'development' || env.host !== '127.0.0.1' ||
      process.env.CLOVA_OCR_BUDGET_MONTH !== month || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(503, '사진 인식이 아직 활성화되지 않았어요. 구매 내용을 직접 입력할 수 있어요.');
  }

  const url = URL.parse(process.env.CLOVA_OCR_URL ?? '');
  const secret = process.env.CLOVA_OCR_SECRET?.trim();
  if (!url || url.protocol !== 'https:' || !url.hostname.endsWith('.apigw.ntruss.com') ||
      !url.pathname.endsWith('/general') || !secret) {
    throw new AppError(503, 'CLOVA General OCR 연결 설정을 확인해 주세요.');
  }

  parseImageBody(req, res, error => {
    if (error?.type === 'entity.too.large') {
      next(new AppError(413, '10MB 이하의 사진을 선택해 주세요.'));
      return;
    }
    if (error) { next(error); return; }
    void scanReceipt(req.body, {
      url, secret,
      budget: { month, limit, directory: ocrUsageDirectory() },
    }).then(result => {
      res.set('Cache-Control', 'no-store').json(ok(result));
    }).catch(next);
  });
});

export default router;
