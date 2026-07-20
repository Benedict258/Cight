import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

if (!firebaseConfig || !firebaseConfig.projectId || firebaseConfig.projectId === 'YOUR_PROJECT_ID') {
  throw new Error(
    'Firebase config missing. Copy firebase-applet-config.example.json to firebase-applet-config.json and fill in your Firebase project credentials.'
  );
}

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
  const path = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      // Don't throw here to avoid crashing the whole app on init if rules haven't propagated,
      // but log it clearly.
      console.warn('Initial connection test failed:', error);
    }
  }
}
testConnection();
