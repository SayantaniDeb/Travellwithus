// Firebase configuration and initialization
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence, onAuthStateChanged as observeAuthState, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "travelwithus-73db1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "travelwithus-73db1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "travelwithus-73db1.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if it hasn't been initialized already
const app = firebaseConfig.apiKey
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

// Initialize Firebase Authentication and get a reference to the service
export const auth = app ? initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence] }) : null;

// Keep public pages usable when local Firebase credentials are absent.
export function onAuthStateChanged(authInstance, callback, ...options) {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return observeAuthState(authInstance, user => callback(user?.isAnonymous ? null : user), ...options);
}

// Google Auth Provider
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

// Apple Auth Provider
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export default app;