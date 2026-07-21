import { Router } from 'express';
import Watchlist from '../models/Watchlist.js';
import { authMiddleware } from '../middleware.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await Watchlist.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    res.json(items);
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
    const doc = await Watchlist.findOneAndUpdate(
      { userId: req.user.uid, movieId },
      { userId: req.user.uid, movieId, movieTitle, mediaType: mediaType || 'movie', posterPath: posterPath || '' },
      { upsert: true, new: true }
    );
    res.status(201).json(doc);
  } catch (err) {
    console.error('Watchlist add error:', err.message);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Watchlist.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    if (!doc) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Watchlist delete error:', err.message);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

router.get('/check/:movieId', authMiddleware, async (req, res) => {
  try {
    const doc = await Watchlist.findOne({ userId: req.user.uid, movieId: req.params.movieId });
    res.json({ saved: !!doc });
  } catch (err) {
    console.error('Watchlist check error:', err.message);
    res.status(500).json({ error: 'Failed to check watchlist' });
  }
});

export default router;
