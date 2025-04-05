import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDujY1coohijCl-Bl576QuyKIH3qHPG-6M",
  authDomain: "sos-backend-e5524.firebaseapp.com",
  projectId: "sos-backend-e5524",
  storageBucket: "sos-backend-e5524.firebasestorage.app",
  messagingSenderId: "800009511290",
  appId: "1:800009511290:web:32cdcfe5911631f2b436c3",
  measurementId: "G-Z54CT1MXYM",
};

const app = initializeApp(firebaseConfig);

const firestore = getFirestore(app);
const auth = getAuth(app);

export { auth, firestore };
