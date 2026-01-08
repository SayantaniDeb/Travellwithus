// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API,
  authDomain: "travelwithus-73db1.firebaseapp.com",
  projectId: "travelwithus-73db1",
  storageBucket: "travelwithus-73db1.appspot.com",
  messagingSenderId: "444389048171",
  appId: "1:444389048171:web:76704e4d54bc724f0c562e",
  measurementId: "G-PX7KRVDCBS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };