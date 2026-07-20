import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let firebaseInitialized = false;

try {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
  }
} catch (err) {
  console.warn('Firebase Admin not initialized:', err.message);
}

export async function authMiddleware(req, res, next) {
  if (!firebaseInitialized) {
    return res.status(503).json({ error: 'Auth service not configured' });
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const token = header.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid auth token' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ') || !firebaseInitialized) {
    return next();
  }
  const token = header.split('Bearer ')[1];
  admin.auth().verifyIdToken(token)
    .then(decoded => {
      req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
      next();
    })
    .catch(() => next());
}
