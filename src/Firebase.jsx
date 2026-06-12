// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB3WpmcExX-G80EmpJL6TzOHSwyI2ZHOuo",
  authDomain: "travelwithus-73db1.firebaseapp.com",
  projectId: "travelwithus-73db1",
  storageBucket: "travelwithus-73db1.firebasestorage.app",
  messagingSenderId: "444389048171",
  appId: "1:444389048171:web:b3ae60f12f3efec20c562e",
  measurementId: "G-MYLNF9L0SS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, provider, db, storage };
