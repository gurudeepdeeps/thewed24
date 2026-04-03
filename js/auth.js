/* auth.js - Firebase Auth Helpers */
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from './firebase.js';

/**
 * Sign in as admin
 */
export async function loginAdmin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, error };
    }
}

/**
 * Log out
 */
export async function logoutAdmin() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error);
        return { success: false, error };
    }
}

/**
 * Check session state
 */
export function checkAuth(callback) {
    return onAuthStateChanged(auth, callback);
}
