import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => auth.signOut();

// Connection Test
async function testConnection() {
  if (!firebaseConfig.apiKey) return;
  try {
    // Attempt a silent fetch to wake up the client
    await getDocFromServer(doc(db, 'system', 'ping')).catch(() => null);
  } catch (error) {
    // Ignore initial connection blips
    console.debug("Firebase connection trace:", error);
  }
}
testConnection();
