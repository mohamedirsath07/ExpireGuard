import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAF2jIbBNqx3SigaakceOrSeUjOZ8gAis",
  authDomain: "expireguard-71f2d.firebaseapp.com",
  projectId: "expireguard-71f2d",
  storageBucket: "expireguard-71f2d.firebasestorage.app",
  messagingSenderId: "425533684804",
  appId: "1:425533684804:web:881ae60e53db550f8f9011",
  measurementId: "G-RDEX7R5BTE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
