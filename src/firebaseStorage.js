import { getStorage } from 'firebase/storage';
import app from './firebaseAuth';
export const storage = app ? getStorage(app) : null;
