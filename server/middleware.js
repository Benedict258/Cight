import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cight-default-dev-secret-jwt-key-2026';

if (!process.env.JWT_SECRET) {
  console.warn('[AI Studio] Notice: JWT_SECRET environment variable is not set. Using fallback secret for development.');
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const token = header.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { uid: decoded.userId, email: decoded.email, name: decoded.displayName };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid auth token' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { uid: decoded.userId, email: decoded.email, name: decoded.displayName };
  } catch {}
  next();
}

export { JWT_SECRET };
