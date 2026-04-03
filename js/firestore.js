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
            where("status", "==", "PUBLISHED")
        );
        const querySnapshot = await getDocs(q);
        const films = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Local sort to avoid composite index requirement
        films.sort((a, b) => {
            const timeA = a.created_at?.toMillis?.() || Date.parse(a.created_at) || 0;
            const timeB = b.created_at?.toMillis?.() || Date.parse(b.created_at) || 0;
            return timeB - timeA; // desc
        });
        return films.slice(0, 4);
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
        const q = query(collection(db, "testimonials"), where("is_visible", "==", true));
        const querySnapshot = await getDocs(q);
        const testimonials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        testimonials.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)); // asc
        return testimonials;
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
        const q = query(collection(db, "packages"), where("is_visible", "==", true));
        const querySnapshot = await getDocs(q);
        const packages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        packages.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)); // asc
        return packages;
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
        await addDoc(collection(db, "enquiries"), {
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

/**
 * Fetch public albums
 */
export async function getAlbums() {
    try {
        const q = query(collection(db, "albums"), where("access_level", "==", "PUBLIC"));
        const querySnapshot = await getDocs(q);
        const albums = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        albums.sort((a, b) => {
            const timeA = a.event_date?.toMillis?.() || Date.parse(a.event_date) || 0;
            const timeB = b.event_date?.toMillis?.() || Date.parse(b.event_date) || 0;
            return timeB - timeA; // desc
        });
        return albums;
    } catch (error) {
        console.error("Error fetching albums:", error);
        return [];
    }
}

/**
 * Fetch images for an album
 */
export async function getAlbumImages(albumId) {
    try {
        const q = query(collection(db, "album_images"), where("album_id", "==", albumId));
        const querySnapshot = await getDocs(q);
        const images = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        images.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)); // asc
        return images;
    } catch (error) {
        console.error("Error fetching album images:", error);
        return [];
    }
}
/**
 * Submit a testimonial
 */
export async function submitTestimonial(data) {
    try {
        await addDoc(collection(db, "testimonials"), {
            ...data,
            status: 'PENDING REVIEW',
            created_at: new Date()
        });
        return { success: true };
    } catch (error) {
        console.error("Error submitting testimonial:", error);
        return { success: false, error };
    }
}
