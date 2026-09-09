import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import { authMiddleware } from '../middleware.js';
import { isDBConnected } from '../db.js';
import { memoryStore } from '../store.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    if (isDBConnected()) {
      const conversations = await Conversation.find({ userId: req.user.uid })
        .select('title updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(50);
      return res.json(conversations);
    }
    const conversations = memoryStore.getConversations(req.user.uid);
    res.json(conversations);
  } catch (err) {
    console.error('Conversations fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (isDBConnected()) {
      const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user.uid });
      if (!conv) return res.status(404).json({ error: 'Not found' });
      return res.json(conv);
    }
    const conv = memoryStore.getConversation(req.params.id, req.user.uid);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (isDBConnected()) {
      const conv = await Conversation.create({
        userId: req.user.uid,
        title: req.body.title || 'New Chat',
        messages: req.body.messages || [],
      });
      return res.status(201).json(conv);
    }
    const conv = memoryStore.createConversation({
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
    if (isDBConnected()) {
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
      return res.json(conv);
    }
    const conv = memoryStore.updateConversation(req.params.id, req.user.uid, {
      messages: req.body.messages,
      title: req.body.title,
    });
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    console.error('Update conversation error:', err.message);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (isDBConnected()) {
      const result = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
      if (!result) return res.status(404).json({ error: 'Not found' });
      return res.json({ deleted: true });
    }
    const deleted = memoryStore.deleteConversation(req.params.id, req.user.uid);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
