import { Router } from 'express';
import Rating from '../models/Rating.js';
import { authMiddleware } from '../middleware.js';

const router = Router();

router.get('/:movieId', async (req, res) => {
  try {
    const result = await Rating.aggregate([
      { $match: { movieId: req.params.movieId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const counts = { likes: 0, dislikes: 0 };
    result.forEach(r => {
      if (r._id === 'like') counts.likes = r.count;
      if (r._id === 'dislike') counts.dislikes = r.count;
    });
    res.json(counts);
  } catch (err) {
    console.error('Ratings fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.get('/:movieId/mine', authMiddleware, async (req, res) => {
  try {
    const doc = await Rating.findOne({ userId: req.user.uid, movieId: req.params.movieId });
    res.json({ rating: doc?.type || null });
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
    const existing = await Rating.findOne({ userId: req.user.uid, movieId });

    if (existing?.type === type) {
      await Rating.deleteOne({ userId: req.user.uid, movieId });
      return res.json({ rating: null, removed: true });
    }

    const doc = await Rating.findOneAndUpdate(
      { userId: req.user.uid, movieId },
      { userId: req.user.uid, movieId, type, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ rating: doc.type });
  } catch (err) {
    console.error('Rating post error:', err.message);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

export default router;
