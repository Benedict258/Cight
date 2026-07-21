import { Router } from 'express';
import Comment from '../models/Comment.js';
import { authMiddleware } from '../middleware.js';

const router = Router();

router.get('/:movieId', async (req, res) => {
  try {
    const docs = await Comment.find({ movieId: req.params.movieId }).sort({ createdAt: -1 }).limit(50);
    res.json(docs);
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
    const doc = await Comment.create({
      userId: req.user.uid,
      userName: req.user.name || req.user.email?.split('@')[0] || 'User',
      movieId,
      content: content.trim(),
      parentId: parentId || null,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('Comment post error:', err.message);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Comment.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    if (!doc) {
      return res.status(404).json({ error: 'Not found or not authorized' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Comment delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
