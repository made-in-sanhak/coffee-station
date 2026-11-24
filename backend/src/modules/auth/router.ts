import { Router } from 'express';
import { AppError } from '../../common/AppError';
import { ok } from '../../common/response';
import { env } from '../../config/env';
import { exchangeKakaoCode, fetchKakaoUser } from './kakaoClient';

const router = Router();

// 카카오 인가 코드로 로그인: POST /auth/kakao  { code, redirectUri }
router.post('/kakao', async (req, res) => {
  const { code, redirectUri } = (req.body ?? {}) as { code?: unknown; redirectUri?: unknown };
  if (typeof code !== 'string' || !code.trim()) throw new AppError(400, '인가 코드가 없습니다.');
  // 토큰 교환에는 서버 설정값을 씁니다. 앱이 보낸 주소는 서버 설정과 같을 때만 허용합니다.
  if (typeof redirectUri !== 'string' || redirectUri !== env.kakao.redirectUri) {
    throw new AppError(400, 'Redirect URI가 일치하지 않습니다.');
  }

  const kakaoToken = await exchangeKakaoCode(code.trim(), env.kakao);
  const profile = await fetchKakaoUser(kakaoToken);

  // TODO: users 테이블에서 kakaoId 로 회원 조회·생성
  // TODO: 서비스 JWT(accessToken, refreshToken) 발급 → 프론트가 기대하는 { accessToken, refreshToken, user } 로 응답
  res.json(ok({ profile }));
});

export default router;
