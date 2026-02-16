import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBACIKNtt0XdGHr0rAOgqvNmo63koxgW0c",
  authDomain: "coolpis-7fbd1.firebaseapp.com",
  projectId: "coolpis-7fbd1",
  storageBucket: "coolpis-7fbd1.firebasestorage.app",
  messagingSenderId: "429937876563",
  appId: "1:429937876563:web:2cd8366992960b6af270a6",
  measurementId: "G-BN2CZSD3B5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app); // Cloud Functions 초기화
