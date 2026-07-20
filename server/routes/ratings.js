import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, optionalAuth } from '../middleware.js';

const router = Router();

router.get('/:movieId', async (req, res) => {
  try {
    const result = await query(
      `SELECT type, COUNT(*)::int as count
       FROM ratings WHERE movie_id = $1
       GROUP BY type`,
      [req.params.movieId]
    );
    const counts = { likes: 0, dislikes: 0 };
    result.rows.forEach(r => {
      if (r.type === 'like') counts.likes = r.count;
      if (r.type === 'dislike') counts.dislikes = r.count;
    });
    res.json(counts);
  } catch (err) {
    console.error('Ratings fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.get('/:movieId/mine', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT type FROM ratings WHERE user_id = $1 AND movie_id = $2',
      [req.user.uid, req.params.movieId]
    );
    res.json({ rating: result.rows[0]?.type || null });
  } catch (err) {
    console.error('Rating fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { movieId, type } = req.body;
  if (!movieId || !['like', 'dislike'].includes(type)) {
    return res.status(400).json({ error: 'movieId and type (like/dislike) required' });
  }
  try {
    const existing = await query(
      'SELECT type FROM ratings WHERE user_id = $1 AND movie_id = $2',
      [req.user.uid, movieId]
    );

    if (existing.rows[0]?.type === type) {
      await query(
        'DELETE FROM ratings WHERE user_id = $1 AND movie_id = $2',
        [req.user.uid, movieId]
      );
      return res.json({ rating: null, removed: true });
    }

    await query(
      `INSERT INTO ratings (user_id, movie_id, type, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, movie_id) DO UPDATE SET type = $3, updated_at = NOW()`,
      [req.user.uid, movieId, type]
    );
    res.json({ rating: type });
  } catch (err) {
    console.error('Rating post error:', err.message);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

export default router;
