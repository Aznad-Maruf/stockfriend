import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBThDrr6IYFH8IXrh42oygBtWg8D9KMKIY',
  authDomain: 'stockfriend-3b4d1.firebaseapp.com',
  projectId: 'stockfriend-3b4d1',
  storageBucket: 'stockfriend-3b4d1.firebasestorage.app',
  messagingSenderId: '164297012723',
  appId: '1:164297012723:web:6385bfb4ef1b13dcc44e86',
  measurementId: 'G-90Q2W63KM5',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Expose for browser console in dev mode
if (import.meta.env.DEV) {
  window.__fb = { auth, db };
}

export default app;
