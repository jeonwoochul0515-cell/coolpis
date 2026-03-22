import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBACIKNtt0XdGHr0rAOgqvNmo63koxgW0c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "coolpis-7fbd1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "coolpis-7fbd1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "coolpis-7fbd1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "429937876563",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:429937876563:web:2cd8366992960b6af270a6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BN2CZSD3B5",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app); // Cloud Functions 초기화
