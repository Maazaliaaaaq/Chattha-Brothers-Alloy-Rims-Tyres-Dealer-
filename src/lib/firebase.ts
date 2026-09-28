import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
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

const DEFAULT_FIREBASE_CONFIG: FirebaseAppletConfig = {
  projectId: "gen-lang-client-0670794076",
  appId: "1:743112456419:web:e9d4652a77260702956dd6",
  apiKey: "AIzaSyBZH-TmaNIL2Kr_nqiVdpQdl57zhb_It70",
  authDomain: "gen-lang-client-0670794076.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-chatthainventory-0ba9c980-601d-4ed1-b583-cf052811b4cf",
  storageBucket: "gen-lang-client-0670794076.firebasestorage.app",
  messagingSenderId: "743112456419",
};

const firebaseConfig: FirebaseAppletConfig = {
  ...DEFAULT_FIREBASE_CONFIG,
  ...((rawConfig as FirebaseAppletConfig) || {}),
};

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

    // Non-blocking background connectivity test
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



