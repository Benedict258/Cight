import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware, JWT_SECRET } from '../middleware.js';
import { isDBConnected } from '../db.js';
import { memoryStore } from '../store.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const lowerEmail = email.toLowerCase();

    if (isDBConnected()) {
      const existing = await User.findOne({ email: lowerEmail });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const hashed = await bcrypt.hash(password, 12);
      const user = await User.create({ email: lowerEmail, password: hashed, displayName: displayName || '' });
      const token = jwt.sign({ userId: user.id, email: user.email, displayName: user.displayName }, JWT_SECRET, { expiresIn: '30d' });
      return res.status(201).json({ token, user: user.toJSON() });
    } else {
      const existing = memoryStore.findUserByEmail(lowerEmail);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = memoryStore.createUser({ email: lowerEmail, password: hashed, displayName });
      const token = jwt.sign({ userId: user.id, email: user.email, displayName: user.displayName }, JWT_SECRET, { expiresIn: '30d' });
      return res.status(201).json({ token, user: user.toJSON() });
    }
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const lowerEmail = email.toLowerCase();
    let user = null;

    if (isDBConnected()) {
      user = await User.findOne({ email: lowerEmail });
    } else {
      user = memoryStore.findUserByEmail(lowerEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId = user.id || user._id?.toString();
    const token = jwt.sign({ userId, email: user.email, displayName: user.displayName }, JWT_SECRET, { expiresIn: '30d' });
    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : { id: userId, email: user.email, displayName: user.displayName };
    res.json({ token, user: userJson });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (isDBConnected()) {
      const user = await User.findById(req.user.uid);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: user.toJSON() });
    } else {
      const user = memoryStore.findUserById(req.user.uid);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: user.toJSON() });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
