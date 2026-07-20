import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn('Slow query:', { text: text.substring(0, 80), duration });
  }
  return result;
}

export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS watchlists (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      movie_id VARCHAR(64) NOT NULL,
      movie_title VARCHAR(256) NOT NULL,
      media_type VARCHAR(16) DEFAULT 'movie',
      poster_path VARCHAR(256),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      user_name VARCHAR(128) NOT NULL,
      movie_id VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      movie_id VARCHAR(64) NOT NULL,
      type VARCHAR(16) NOT NULL CHECK (type IN ('like', 'dislike')),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, movie_id)
    );

    CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_movie ON comments(movie_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_movie ON ratings(movie_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
  `);
}

export default pool;
