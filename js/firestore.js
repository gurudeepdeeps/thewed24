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
        // Query on a single field to avoid composite-index requirements.
        const q = query(collection(db, "films"), where("is_selected_work", "==", true));
        const querySnapshot = await getDocs(q);
        const films = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(f => f.status === "PUBLISHED");

        // Local sort: featured order first, then newest
        films.sort((a, b) => {
            const orderA = Number(a.selected_work_order);
            const orderB = Number(b.selected_work_order);
            const aHas = Number.isFinite(orderA) ? orderA : 999;
            const bHas = Number.isFinite(orderB) ? orderB : 999;
            if (aHas !== bHas) return aHas - bHas; // asc

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
        const q = query(collection(db, "testimonials"), where("status", "==", "PUBLISHED"));
        const querySnapshot = await getDocs(q);
        const testimonials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return testimonials;
    } catch (error) {
        console.error("Error fetching testimonials:", error);
        return [];
    }
}

/**
 * Fetch featured testimonials for home
 */
export async function getFeaturedTestimonials() {
    try {
        const q = query(
            collection(db, "testimonials"), 
            where("is_selected_home", "==", true),
            where("status", "==", "PUBLISHED")
        );
        const querySnapshot = await getDocs(q);
        const testimonials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Local sort to avoid composite index requirement
        testimonials.sort((a, b) => {
            const timeA = a.created_at?.toMillis?.() || Date.parse(a.created_at) || 0;
            const timeB = b.created_at?.toMillis?.() || Date.parse(b.created_at) || 0;
            return timeB - timeA; // desc
        });
        return testimonials.slice(0, 4);
    } catch (error) {
        console.error("Error fetching featured testimonials:", error);
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
            status: 'UNREAD',
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
export async function getAlbums(category = null) {
    try {
        const albumsRef = collection(db, "albums");
        // Avoid composite-index requirements by querying on a single field
        // and filtering the rest locally.
        const q = category
            ? query(albumsRef, where("category", "==", category))
            : query(albumsRef, where("access_level", "==", "PUBLIC"));
        const querySnapshot = await getDocs(q);
        const albums = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(a => a.access_level === "PUBLIC")
            // Default Album page should not include Pre-Wedding (ENGAGEMENT) albums.
            // Pre-wedding page passes `category='ENGAGEMENT'` explicitly.
            .filter(a => {
                const cat = String(a.category || '').toUpperCase();
                if (category) return cat === String(category).toUpperCase();
                return cat !== 'ENGAGEMENT';
            });
        albums.sort((a, b) => {
            const timeA = a.event_date?.toMillis?.() || Date.parse(a.event_date) || a.created_at?.toMillis?.() || Date.parse(a.created_at) || 0;
            const timeB = b.event_date?.toMillis?.() || Date.parse(b.event_date) || b.created_at?.toMillis?.() || Date.parse(b.created_at) || 0;
            return timeB - timeA; // desc
        });
        return albums;
    } catch (error) {
        console.error("Error fetching albums:", error);
        return [];
    }
}

/**
 * Fetch featured albums for home
 */
export async function getFeaturedAlbums() {
    try {
        // Query on a single field to avoid composite-index requirements.
        const q = query(collection(db, "albums"), where("is_selected_home", "==", true));
        const querySnapshot = await getDocs(q);
        const albums = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(a => a.access_level === "PUBLIC");
        // Local sort: explicit featured order first, then fallback to newest.
        albums.sort((a, b) => {
            const orderA = Number(a.selected_home_order);
            const orderB = Number(b.selected_home_order);
            const hasA = Number.isFinite(orderA) && orderA > 0;
            const hasB = Number.isFinite(orderB) && orderB > 0;

            if (hasA && hasB) return orderA - orderB; // asc
            if (hasA) return -1;
            if (hasB) return 1;

            const timeA = a.event_date?.toMillis?.() || Date.parse(a.event_date) || a.created_at?.toMillis?.() || Date.parse(a.created_at) || 0;
            const timeB = b.event_date?.toMillis?.() || Date.parse(b.event_date) || b.created_at?.toMillis?.() || Date.parse(b.created_at) || 0;
            return timeB - timeA; // desc
        });
        return albums.slice(0, 4);
    } catch (error) {
        console.error("Error fetching featured albums:", error);
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
