import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware, JWT_SECRET } from '../middleware.js';

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
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ email: email.toLowerCase(), password: hashed, displayName: displayName || '' });
    const token = jwt.sign({ userId: user.id, email: user.email, displayName: user.displayName }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: user.toJSON() });
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
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email, displayName: user.displayName }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
