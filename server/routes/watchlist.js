import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware.js';
import { delCache } from '../redis.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM watchlists WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Watchlist fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { movieId, movieTitle, mediaType, posterPath } = req.body;
  if (!movieId || !movieTitle) {
    return res.status(400).json({ error: 'movieId and movieTitle required' });
  }
  try {
    const result = await query(
      `INSERT INTO watchlists (user_id, movie_id, movie_title, media_type, poster_path)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, movie_id) DO NOTHING
       RETURNING *`,
      [req.user.uid, movieId, movieTitle, mediaType || 'movie', posterPath || null]
    );
    await delCache(`watchlist:${req.user.uid}`);
    res.status(201).json(result.rows[0] || { added: true });
  } catch (err) {
    console.error('Watchlist add error:', err.message);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM watchlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.uid]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await delCache(`watchlist:${req.user.uid}`);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Watchlist delete error:', err.message);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

router.get('/check/:movieId', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM watchlists WHERE user_id = $1 AND movie_id = $2) as saved',
      [req.user.uid, req.params.movieId]
    );
    res.json({ saved: result.rows[0].saved });
  } catch (err) {
    console.error('Watchlist check error:', err.message);
    res.status(500).json({ error: 'Failed to check watchlist' });
  }
});

export default router;
