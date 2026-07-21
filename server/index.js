import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import commentsRoutes from './routes/comments.js';
import ratingsRoutes from './routes/ratings.js';

const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const app = express();

app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '5kb' }));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/ratings', ratingsRoutes);

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/', (req, res) => {
  res.json({ name: 'Cight API', version: '1.0.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Cight API running on port ${PORT}`);
  });
}

start();
