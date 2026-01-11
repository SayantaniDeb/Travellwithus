// Firebase configuration and initialization
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API,
  authDomain: "travelwithus-73db1.firebaseapp.com",
  projectId: "travelwithus-73db1",
  storageBucket: "travelwithus-73db1.appspot.com",
  messagingSenderId: "123456789012", // You'll need to get this from Firebase console
  appId: "1:123456789012:web:abcdef123456" // You'll need to get this from Firebase console
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

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