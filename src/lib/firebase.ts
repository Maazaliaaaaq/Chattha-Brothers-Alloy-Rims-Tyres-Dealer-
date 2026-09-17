import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

interface FirebaseAppletConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  firestoreDatabaseId?: string;
  [key: string]: any;
}

const firebaseConfig: FirebaseAppletConfig = (rawConfig as FirebaseAppletConfig) || {};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (firebaseConfig.projectId && firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp({
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
    });

    db = getFirestore(
      app,
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
        ? firebaseConfig.firestoreDatabaseId
        : undefined
    );

    auth = getAuth(app);

    signInAnonymously(auth).catch((err) => {
      console.debug('Firebase auth initialization note:', err?.message);
    });
  } else {
    console.warn('Firebase configuration missing required keys, falling back to local mode.');
  }
} catch (e) {
  console.warn('Firebase initialization skipped/fallback:', e);
}

export { app, db, auth, firebaseConfig };

