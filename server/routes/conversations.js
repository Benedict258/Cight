import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import { authMiddleware } from '../middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.uid })
      .select('title updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(conversations);
  } catch (err) {
    console.error('Conversations fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

router.post('/', async (req, res) => {
  try {
    const conv = await Conversation.create({
      userId: req.user.uid,
      title: req.body.title || 'New Chat',
      messages: req.body.messages || [],
    });
    res.status(201).json(conv);
  } catch (err) {
    console.error('Create conversation error:', err.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      { 
        $set: { 
          messages: req.body.messages, 
          title: req.body.title, 
          updatedAt: new Date() 
        } 
      },
      { new: true }
    );
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    console.error('Update conversation error:', err.message);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
