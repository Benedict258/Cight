import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureSchema } from './db.js';
import { connectRedis } from './redis.js';
import watchlistRoutes from './routes/watchlist.js';
import commentsRoutes from './routes/comments.js';
import ratingsRoutes from './routes/ratings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());
app.use(express.json({ limit: '5kb' }));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/watchlist', watchlistRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/ratings', ratingsRoutes);

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(DIST, {
  maxAge: '1d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (filePath.endsWith('sw.js') || filePath.endsWith('workbox-')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.use((req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

async function start() {
  try {
    await ensureSchema();
    console.log('PostgreSQL schema ready');
  } catch (err) {
    console.warn('PostgreSQL schema setup failed (DB may not be connected):', err.message);
  }

  try {
    await connectRedis();
  } catch {
    // Redis is optional
  }

  app.listen(PORT, () => {
    console.log(`Cight server running on port ${PORT}`);
  });
}

start();
