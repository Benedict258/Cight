import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let loginPromise: Promise<any> | null = null;
export const login = async () => {
  if (loginPromise) return loginPromise;
  
  loginPromise = signInWithPopup(auth, googleProvider).finally(() => {
    loginPromise = null;
  });
  
  try {
    return await loginPromise;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      alert('The login popup was blocked by your browser. Please allow popups for this site and try again.');
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.warn('Login request was cancelled or superseded.');
    } else {
      console.error('Firebase Login Error:', error);
    }
    throw error;
  }
};
export const logout = () => auth.signOut();

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();
