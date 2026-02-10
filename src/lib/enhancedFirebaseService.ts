import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
  remove,
} from 'firebase/database';
import { getFirebaseDatabase } from './firebaseClient'; // ✅ Ensure this is exported properly

// Helper to get DB instance
const getDb = (): ReturnType<typeof getFirebaseDatabase> => getFirebaseDatabase();

import { 
  User, 
  Task, 
  UserTask, 
  WithdrawalRequest, 
  AdminSettings, 
  DailyStats,
  PaymentData,
  ConversionData,
  BotMessage
} from '@/types';
import { VIP_TIERS, DEFAULT_SETTINGS } from './constants';
import { logFirebaseError } from './errorHandler';

// Error handling class
class FirebaseServiceError extends Error {
  constructor(message: string, public code?: string, public originalError?: any) {
    super(message);
    this.name = 'FirebaseServiceError';
  }
}

// Logging helpers
const logError = (operation: string, error: any, context?: any) => {
  console.error(`[Firebase Service] ${operation} failed:`, {
    error: error.message || error,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
  });
  logFirebaseError(error, operation, { context });
};

const logSuccess = (operation: string, context?: any) => {
  console.log(`[Firebase Service] ${operation} successful:`, {
    context,
    timestamp: new Date().toISOString(),
  });
};

// Firebase connection check
const checkFirebaseConnection = (): boolean => {
  try {
    const db = getDb();
    if (!db) {
      console.warn('[Firebase Service] Services not properly initialized. Some features may not work.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Firebase Service] ❌ Firebase connection error:', error);
    return false;
  }
};

// Listeners map
const listeners = new Map<string, () => void>();

// Example subscription fix
export const subscribeToUserWithExtendedData = (
  userId: string,
  callback: (data: {
    user: User | null;
    payments: PaymentData[];
    conversions: ConversionData[];
    messages: BotMessage[];
  }) => void
): (() => void) => {
  if (!checkFirebaseConnection()) {
    console.warn('Cannot subscribe to user: Firebase not initialized');
    callback({ user: null, payments: [], conversions: [], messages: [] });
    return () => {};
  }

  const db = getDb();
  const userRef = ref(db, `telegram_users/${userId}`);
  const paymentsRef = ref(db, `payments/${userId}`);
  const conversionsRef = ref(db, `conversions/${userId}`);
  const messagesRef = ref(db, `messages/${userId}`);

  let userData: User | null = null;
  let paymentsData: PaymentData[] = [];
  let conversionsData: ConversionData[] = [];
  let messagesData: BotMessage[] = [];

  const updateCallback = () => callback({
    user: userData,
    payments: paymentsData,
    conversions: conversionsData,
    messages: messagesData,
  });

  // User listener
  const userListener = onValue(userRef, snapshot => {
    userData = snapshot.exists() ? snapshot.val() : null;
    updateCallback();
  });

  // Payments listener
  const paymentsListener = onValue(paymentsRef, snapshot => {
    paymentsData = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, val]: any) => ({
      id, ...val
    })) : [];
    updateCallback();
  });

  // Conversions listener
  const conversionsListener = onValue(conversionsRef, snapshot => {
    conversionsData = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, val]: any) => ({
      id, ...val
    })) : [];
    updateCallback();
  });

  // Messages listener
  const messagesListener = onValue(messagesRef, snapshot => {
    messagesData = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, val]: any) => ({
      id, ...val
    })) : [];
    updateCallback();
  });

  const listenerId = `user_extended_${userId}`;
  listeners.set(listenerId, () => {
    off(userRef, 'value', userListener);
    off(paymentsRef, 'value', paymentsListener);
    off(conversionsRef, 'value', conversionsListener);
    off(messagesRef, 'value', messagesListener);
  });

  return () => {
    listeners.get(listenerId)?.();
    listeners.delete(listenerId);
  };
};

// Cleanup all listeners
export const cleanupAllListeners = () => {
  listeners.forEach(cleanup => cleanup());
  listeners.clear();
  logSuccess('All listeners cleaned up');
};