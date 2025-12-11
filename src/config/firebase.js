import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCHf4981pz5HBuNsTBoRcAMEJz0-Lz5-0g",
  authDomain: "smart-spend-158e4.firebaseapp.com",
  projectId: "smart-spend-158e4",
  storageBucket: "smart-spend-158e4.firebasestorage.app",
  messagingSenderId: "683693635106",
  appId: "1:683693635106:web:0a8eb3c438702741f57c7b",
  measurementId: "G-B4X23V2FQQ"
};

let app, auth, db;
// Initialize the Google Provider
const googleProvider = new GoogleAuthProvider();

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase Init Error: Check your config object.", error);
}

// Export googleProvider so App.jsx can use it
export { auth, db, app, googleProvider };
export const appId = 'my-finance-app';