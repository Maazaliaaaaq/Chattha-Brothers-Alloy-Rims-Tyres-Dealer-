import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
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
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    const dbId =
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
        ? firebaseConfig.firestoreDatabaseId
        : undefined;

    // Use initializeFirestore with auto-detect long polling to ensure bulletproof
    // real-time sync inside browser iframes and Google Cloud Run proxies
    try {
      db = initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
        },
        dbId
      );
    } catch {
      db = getFirestore(app, dbId);
    }

    auth = getAuth(app);

    // Test connection as instructed in Firebase guidelines
    if (db) {
      getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      });
    }
  } else {
    console.warn('Firebase configuration missing required keys, falling back to local mode.');
  }
} catch (e) {
  console.warn('Firebase initialization skipped/fallback:', e);
}

export { app, db, auth, firebaseConfig };

