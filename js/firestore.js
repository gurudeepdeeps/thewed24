/* firestore.js - Firestore Data Layer */
import { collection, getDocs, addDoc, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase.js';

/**
 * Fetch films for the gallery
 */
export async function getFilms() {
    try {
        const q = query(collection(db, "films"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching films:", error);
        return [];
    }
}

/**
 * Fetch featured films for home
 */
export async function getFeaturedFilms() {
    try {
        const q = query(
            collection(db, "films"), 
            where("is_selected_work", "==", true),
            where("status", "==", "PUBLISHED"),
            orderBy("created_at", "desc"),
            limit(4)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching featured films:", error);
        return [];
    }
}

/**
 * Fetch testimonials
 */
export async function getTestimonials() {
    try {
        const q = query(collection(db, "testimonials"), where("is_visible", "==", true), orderBy("display_order", "asc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching testimonials:", error);
        return [];
    }
}

/**
 * Fetch packages
 */
export async function getPackages() {
    try {
        const q = query(collection(db, "packages"), where("is_visible", "==", true), orderBy("display_order", "asc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching packages:", error);
        return [];
    }
}

/**
 * Fetch about profile
 */
export async function getAboutProfile() {
    try {
        const q = query(collection(db, "about_profile"), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.length > 0 ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } : null;
    } catch (error) {
        console.error("Error fetching about profile:", error);
        return null;
    }
}

/**
 * Submit an inquiry
 */
export async function submitInquiry(data) {
    try {
        await addDoc(collection(db, "inquiries"), {
            ...data,
            status: 'unread',
            created_at: new Date()
        });
        return { success: true };
    } catch (error) {
        console.error("Error submitting inquiry:", error);
        return { success: false, error };
    }
}
