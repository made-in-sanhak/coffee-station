import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import { errorHandler, notFound } from './middlewares/errorHandler';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/health', healthRouter);
// 기능 라우터는 여기에 추가합니다. 예)
// app.use('/api/cafes', cafeRouter);

// 아래 두 줄은 항상 맨 마지막에 둡니다.
app.use(notFound);
app.use(errorHandler);
