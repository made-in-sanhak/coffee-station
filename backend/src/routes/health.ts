import { Router } from 'express';
import { pool } from '../config/db';
import { ok } from '../common/response';

const router = Router();

// 서버·DB 상태 확인: GET /health
router.get('/', async (_req, res) => {
  let db: 'ok' | 'down' = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    db = 'down';
  }
  res.json(ok({ server: 'ok', db }));
});

export default router;
