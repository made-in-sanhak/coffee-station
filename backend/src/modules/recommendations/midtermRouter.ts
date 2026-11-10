import { Router } from 'express';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { recommendMidterm } from './midterm';
import { prepareMidterm, confirmMidterm } from './midtermFlow';
import { env } from '../../config/env';
import { createMidtermGeminiExtractor } from './midtermGemini';

const router = Router();
router.post('/search',async(req,res)=>res.json(ok(await recommendMidterm(req.body?.constraints))));
router.post('/prepare',async(req,res)=>{
  const extractor = env.extractionMode === 'gemini'
    ? createMidtermGeminiExtractor({apiKey:env.geminiApiKey,model:env.geminiModel}) : undefined;
  res.json(ok(await prepareMidterm(req.body?.message,extractor,env.extractionMode as 'mock' | 'gemini')));
});
router.post('/confirm',async(req,res)=>{
  if (req.body?.confirmed!==true) { throw new AppError(409,'명시적 확인이 필요합니다.'); }
  const c=confirmMidterm(req.body?.proposal_id,req.body?.constraints);
  res.json(ok(await recommendMidterm(c)));
});
export default router;
