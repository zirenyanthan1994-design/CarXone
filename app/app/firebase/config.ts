import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- 1. MUST HAVE THIS
import { getAuth } from "firebase/auth";

// 2. Your unique keys from the Firebase Console
const firebaseConfig = {

  apiKey: "AIzaSyC-VTbfHD9A7hcv0_Un6GoGRl8H38JPh0g",

  authDomain: "carxone-23bb6.firebaseapp.com",

  projectId: "carxone-23bb6",

  storageBucket: "carxone-23bb6.firebasestorage.app",

  messagingSenderId: "523933687323",

  appId: "1:523933687323:web:0e7b2297e307ffcdc6a2be",

  measurementId: "G-X6K5WG0JRS"

};

// (Your firebaseConfig object will be right above this)

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // <--- WE ADDED THIS LINE

// Export them so other pages can use them
export { db, storage, auth }; // <--- WE ADDED 'auth' TO THIS LIST