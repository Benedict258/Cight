import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware.js';

const router = Router();

router.get('/:movieId', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.user_id, c.user_name, c.movie_id, c.content, c.parent_id, c.created_at
       FROM comments c
       WHERE c.movie_id = $1
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [req.params.movieId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Comments fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { movieId, content, parentId } = req.body;
  if (!movieId || !content?.trim()) {
    return res.status(400).json({ error: 'movieId and content required' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ error: 'Content too long (max 1000 chars)' });
  }
  try {
    const result = await query(
      `INSERT INTO comments (user_id, user_name, movie_id, content, parent_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.uid, req.user.name || req.user.email?.split('@')[0] || 'User', movieId, content.trim(), parentId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Comment post error:', err.message);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.uid]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found or not authorized' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Comment delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
