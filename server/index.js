import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import commentsRoutes from './routes/comments.js';
import ratingsRoutes from './routes/ratings.js';
import conversationsRoutes from './routes/conversations.js';

const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL;

const requiredEnvVars = ['MONGODB_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

if (!FRONTEND_URL) {
  console.warn('WARNING: FRONTEND_URL not set. CORS will deny all cross-origin requests.');
}

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: FRONTEND_URL || 'https://cight.ai',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '5kb' }));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
}));

app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/conversations', conversationsRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const mongoose = (await import('./db.js')).default;
    const dbState = mongoose.connection.readyState;
    const dbOk = dbState === 1;
    res.json({
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
    });
  } catch {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
});

app.get('/api/', (req, res) => {
  res.json({ name: 'Cight API', version: '1.0.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

let server;

async function start() {
  await connectDB();
  server = app.listen(PORT, () => {
    console.log(`Cight API running on port ${PORT}`);
  });
}

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        const mongoose = (await import('mongoose')).default;
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
      } catch {}
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
