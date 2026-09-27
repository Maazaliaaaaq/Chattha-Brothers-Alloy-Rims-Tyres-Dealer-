import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
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

    db = getFirestore(app, dbId);
    auth = getAuth(app);

    // Non-blocking connection check
    if (db) {
      getDocFromServer(doc(db, 'test', 'connection')).catch(() => {
        // silently handled
      });
    }
  } else {
    console.warn('Firebase configuration missing required keys, using offline local mode.');
  }
} catch (e) {
  console.warn('Firebase initialization fallback:', e);
}

export { app, db, auth, firebaseConfig };


