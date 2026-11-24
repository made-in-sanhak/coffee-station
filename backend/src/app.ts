import storesRouter from './routes/stores';
import reviewsRouter, { reviewImagesRouter } from './routes/reviews';
import { comparisonRouter, cafeFeaturesRouter } from './modules/community/cafes';
import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import recommendationsRouter from './modules/recommendations/router';
import reviewSummariesRouter from './modules/reviewSummaries/router';
import cafesRouter from './modules/cafes/router';
import { errorHandler, notFound } from './middlewares/errorHandler';
import authRouter, { sessionRouter } from './modules/auth/router';
import usersRouter from './modules/users/router';

export const app = express();

// ALB(프록시 1단) 뒤에서 실행되므로 X-Forwarded-For 의 마지막 1단계만 신뢰합니다.
// 이 설정이 없으면 req.ip 가 모든 사용자에게 ALB 주소로 잡혀 IP별 호출 제한이 하나로 합쳐집니다.
app.set('trust proxy', 1);

app.use(cors());
// Existing photo form: up to three 2 MiB images encoded as base64.
app.use('/api/reviews', express.json({ limit: '9mb' }));
app.use(express.json({ limit: '1mb' }));

app.use('/health', healthRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/review-images', reviewImagesRouter);
app.use('/api/menus', comparisonRouter);
app.use('/api/cafes', cafeFeaturesRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/cafes', reviewSummariesRouter);
app.use('/api/cafes', cafesRouter);
app.use('/stores', storesRouter);
// 기능 라우터는 여기에 추가합니다. 이미 쓰는 접두사에 라우터를 하나 더 붙이지 마세요. 예)
// app.use('/api/기능명', 기능Router);

// 앱이 /api 없이 호출하는 카카오 로그인만 예외로 /auth 를 씁니다.
app.use('/auth', authRouter);
app.use('/api/auth', sessionRouter);
app.use('/api/users', usersRouter);

// 아래 두 줄은 항상 맨 마지막에 둡니다.
app.use(notFound);
app.use(errorHandler);
