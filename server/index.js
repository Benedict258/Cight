import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { connectDB, isDBConnected } from './db.js';
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import commentsRoutes from './routes/comments.js';
import ratingsRoutes from './routes/ratings.js';
import conversationsRoutes from './routes/conversations.js';
import aiRoutes from './routes/ai.js';

const PORT = 3000;
const app = express();

// Trust reverse proxy (nginx / Cloud Run)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: { error: 'Too many auth attempts, please try again later' },
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  const dbOk = isDBConnected();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'in-memory-mock',
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/api/', (req, res) => {
  res.json({ name: 'Cight API', version: '1.0.0' });
});

// Database offline graceful fallback middleware as required by migration guidelines
app.use((err, req, res, next) => {
  if (err && (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out')))) {
    console.warn('[AI Studio] Database offline — returning mock empty response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

// Mount Vite middleware for development or static file serving for production
if (process.env.NODE_ENV !== 'production') {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } catch (err) {
    console.error('Failed to initialize Vite dev middleware:', err);
  }
} else if (process.env.SERVE_FRONTEND === 'true') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  // In Express 5, use regex or *all for SPA fallback
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

let server;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[AI Studio] Database initialization warning:', err.message);
  }

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Studio] Cight unified server running on port ${PORT}`);
  });
}

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      try {
        const mongoose = (await import('mongoose')).default;
        await mongoose.connection.close(false);
      } catch {}
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
