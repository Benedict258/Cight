import { Router } from 'express';
import Comment from '../models/Comment.js';
import { authMiddleware } from '../middleware.js';
import { isDBConnected } from '../db.js';
import { memoryStore } from '../store.js';

const router = Router();

router.get('/:movieId', async (req, res) => {
  try {
    if (isDBConnected()) {
      const docs = await Comment.find({ movieId: req.params.movieId }).sort({ createdAt: -1 }).limit(50);
      return res.json(docs);
    }
    const docs = memoryStore.getComments(req.params.movieId);
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
    const userName = req.user.name || req.user.email?.split('@')[0] || 'User';
    if (isDBConnected()) {
      const doc = await Comment.create({
        userId: req.user.uid,
        userName,
        movieId,
        content: content.trim(),
        parentId: parentId || null,
      });
      return res.status(201).json(doc);
    }
    const doc = memoryStore.addComment({
      userId: req.user.uid,
      userName,
      movieId,
      content: content.trim(),
      parentId,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('Comment post error:', err.message);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (isDBConnected()) {
      const doc = await Comment.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
      if (!doc) {
        return res.status(404).json({ error: 'Not found or not authorized' });
      }
      return res.json({ deleted: true });
    }
    const deleted = memoryStore.deleteComment(req.params.id, req.user.uid);
    if (!deleted) {
      return res.status(404).json({ error: 'Not found or not authorized' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Comment delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
