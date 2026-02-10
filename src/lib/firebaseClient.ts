// firebaseClient.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database, ref, set, get } from 'firebase/database';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Ensure single Firebase app instance
let app: FirebaseApp | null = null;
let database: Database | null = null;

export function initializeFirebaseClient(): FirebaseApp {
  if (!app) {
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
      throw new Error('Missing required Firebase configuration');
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

// ✅ Fixed export for getFirebaseDatabase
export function getFirebaseDatabase(): Database {
  if (!database) {
    const firebaseApp = initializeFirebaseClient();
    database = getDatabase(firebaseApp);
  }
  return database;
}

// Other exports remain exactly the same
export async function saveUserData(user: { name: string; id: string | number; profile_pic?: string }) {
  const db = getFirebaseDatabase();
  const userRef = ref(db, `users/${user.id}`);
  await set(userRef, { ...user, created_at: new Date().toISOString() });
}

export async function getUserData(userId: string | number) {
  const db = getFirebaseDatabase();
  const snapshot = await get(ref(db, `users/${userId}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);
}

export function getFirebaseApp(): FirebaseApp {
  return initializeFirebaseClient();
}

// Legacy aliases
export const getTelegramUserData = getUserData;
export const setTelegramUserData = saveUserData;

// Auto-initialize client-side
if (typeof window !== 'undefined') {
  initializeFirebaseClient();
}

export {}; // ✅ Ensure this file is recognized as a TS module