/* firebase.js - Firebase Initialization */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBKY_F9X5Mav2neYr2w6D8TS1uMmlsZ7iU",
    authDomain: "the-wed-24.firebaseapp.com",
    projectId: "the-wed-24",
    storageBucket: "the-wed-24.firebasestorage.app",
    messagingSenderId: "605929134316",
    appId: "1:605929134316:web:3d89f6cc5f1dd7311c2dc9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
