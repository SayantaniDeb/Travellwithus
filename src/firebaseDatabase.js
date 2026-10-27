import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import app from './firebaseAuth';
export const db = app ? getFirestore(app) : null;
export function subscribeToProfile(uid, onValue, onError) {
  return onSnapshot(doc(db, 'user_profiles', uid), onValue, onError);
}
