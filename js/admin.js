/**
 * admin.js - Logic for Admin Dashboard SPA (Firebase Version)
 */
import { auth, db, storage } from './firebase.js';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, limit, getDoc,
    getCountFromServer, startAfter
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * Detailed backend logger
 */
const logBackend = (operation, status, details, error = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const styles = {
        SUCCESS: 'background: #064e3b; color: #34d399; padding: 2px 5px; border-radius: 2px; font-weight: bold;',
        ERROR: 'background: #450a0a; color: #f87171; padding: 2px 5px; border-radius: 2px; font-weight: bold;',
        INFO: 'background: #1e3a8a; color: #60a5fa; padding: 2px 5px; border-radius: 2px; font-weight: bold;'
    };

    console.group(`Backend: ${operation} - ${status} (${timestamp})`);
    console.log(`%c${status}`, styles[status] || '', details);
    if (error) {
        if (status === 'ERROR') {
            console.error('Full Error Object:', error);
        } else {
            console.info('Metadata:', error);
        }
    }
    console.groupEnd();
};

document.addEventListener('DOMContentLoaded', async () => {

    // Elements
    const navLinks = document.querySelectorAll('[data-target]');
    const views = document.querySelectorAll('.admin-view');
    const topbarTitle = document.querySelector('.topbar-title');
    const searchBar = document.getElementById('topbarSearch');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const adminSidebar = document.getElementById('adminSidebar');

    // --- ROUTE PROTECTION ---
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            logBackend('Auth Check', 'INFO', 'No active session. Redirecting to login...');
            window.location.replace('login');
            return;
        }
        logBackend('Auth Check', 'SUCCESS', `Session valid for: ${user.email}`);
    });

    // --- LOGOUT LOGIC ---
    async function handleLogout(e) {
        if (e) e.preventDefault();
        console.log("Logging out...");

        try {
            await signOut(auth);
            logBackend('Sign Out', 'SUCCESS', 'Firebase session terminated');
        } catch (err) {
            logBackend('Sign Out', 'ERROR', 'Error during sign out', err);
        } finally {
            window.location.href = 'login';
        }
    }

    const signOutBtn = document.getElementById('signOutBtn');
    const topbarLogoutBtn = document.getElementById('topbarLogoutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', handleLogout);
    if (topbarLogoutBtn) topbarLogoutBtn.addEventListener('click', handleLogout);

    // --- SUPABASE FILMS INTEGRATION ---
    let currentFilmsPage = 0;
    let lastVisibleFilmDoc = null;
    const FILMS_PER_PAGE = 6;
    let currentFilmsFilter = 'ALL';
    window.filmsMap = {};
    let editingFilmId = null;

    async function fetchFilms(reset = true) {
        const listContainer = document.getElementById('filmsList');
        const loadMoreBtn = document.getElementById('loadMoreFilmsBtn');
        if (!listContainer) return;

        if (reset) {
            currentFilmsPage = 0;
            lastVisibleFilmDoc = null;
            window.filmsMap = {};
            listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">LOADING FILMS...</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            if (loadMoreBtn) loadMoreBtn.innerHTML = '<span class="animate-spin material-icons mr-2">refresh</span> LOADING...';
        }

        try {
            // 1. Build Query (with conditional where and startAfter)
            let q;
            const filmsRef = collection(db, "films");
            
            if (currentFilmsFilter === 'DRAFT') {
                q = query(filmsRef, where("status", "==", "DRAFT"), orderBy("created_at", "desc"));
            } else {
                q = query(filmsRef, orderBy("created_at", "desc"));
            }

            // Apply StartAfter for pagination
            if (lastVisibleFilmDoc && !reset) {
                q = query(q, startAfter(lastVisibleFilmDoc), limit(FILMS_PER_PAGE));
            } else {
                q = query(q, limit(FILMS_PER_PAGE));
            }

            // 2. Execute Query
            const querySnapshot = await getDocs(q);
            const films = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Update pagination cursor
            if (querySnapshot.docs.length > 0) {
                lastVisibleFilmDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            }

            logBackend('Fetch Films', 'SUCCESS', `Loaded ${films.length} films (Filter: ${currentFilmsFilter})`);

            // 3. Get Total Count for filtered query
            let countSnap;
            if (currentFilmsFilter === 'DRAFT') {
                countSnap = await getCountFromServer(query(filmsRef, where("status", "==", "DRAFT")));
            } else {
                countSnap = await getCountFromServer(filmsRef);
            }
            const totalCount = countSnap.data().count;
            
            // Update UI Stats
            const fStat = document.getElementById('statTotalFilms');
            if (fStat) fStat.innerHTML = `${totalCount}`;

            if (reset && films.length === 0) {
                listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">NO FILMS IN DB</div>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            // 4. Render HTML
            let html = '';
            films.forEach(film => {
                window.filmsMap[film.id] = film;
                html += `
                    <div class="film-card fade-in">
                        <div class="drag-handle">
                            <input type="checkbox" class="film-bulk-checkbox" value="${film.id}" style="accent-color: var(--color-primary); cursor: pointer; transform: scale(1.2);">
                        </div>
                        <img src="${film.cover_image_url || 'assets/cinematic-frame.jpg'}" class="film-thumb ${film.status === 'DRAFT' ? 'grayscale' : ''}">
                        
                        <div class="film-info">
                            <div class="text-[10px] text-primary tracking-widest uppercase mb-1">FILM TITLE</div>
                             <div class="flex items-center gap-2">
                                <h3 class="font-medium text-lg ${film.status === 'DRAFT' ? 'opacity-50' : ''}">${film.title}</h3>
                                ${film.is_selected_work ? '<span class="material-icons text-primary text-sm" title="Featured on Home Page">stars</span>' : ''}
                                ${film.is_selected_work ? `<span class="text-[10px] tracking-widest uppercase px-2 py-1 border border-primary/30 text-primary/80" style="border-radius: 999px;" title="Featured Order">#${film.selected_work_order || '-'}</span>` : ''}
                            </div>
                        </div>

                        <div class="film-category w-32">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-2">CATEGORY</div>
                            <span class="badge ${film.status === 'DRAFT' ? 'badge-outline opacity-50' : 'badge-outline'}">${film.category}</span>
                        </div>

                        <div class="film-status w-32">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-2">STATUS</div>
                            <span class="badge ${film.status === 'DRAFT' ? 'badge-outline opacity-50' : 'badge-outline'}" 
                                  style="color: ${film.status === 'PUBLISHED' ? '#2ecc71' : 'var(--color-on-surface)'}; border-color: ${film.status === 'PUBLISHED' ? '#2ecc71' : 'var(--color-outline)'};">
                                ${film.status}
                            </span>
                        </div>

                        <div class="film-actions flex gap-4 ml-auto">
                            <button class="icon-btn-small" onclick="editFilm('${film.id}', event)"><span class="material-icons text-sm hover:text-primary transition-colors">edit</span></button>
                            <button class="icon-btn-small" onclick="deleteFilm('${film.id}', event)"><span class="material-icons text-sm text-error hover:text-error transition-colors">delete</span></button>
                        </div>
                    </div>
                `;
            });

            if (reset) {
                listContainer.innerHTML = html;
            } else {
                listContainer.insertAdjacentHTML('beforeend', html);
                if (loadMoreBtn) loadMoreBtn.innerHTML = 'LOAD MORE <span class="material-icons ml-1">expand_more</span>';
            }

            // Bulk Delete Update
            const deleteBtn = document.getElementById('deleteSelectedBtn');
            const countSpn = document.getElementById('selectedCount');
            function updateBulkDeleteUI() {
                const checkedCount = document.querySelectorAll('.film-bulk-checkbox:checked').length;
                if (deleteBtn && countSpn) {
                    deleteBtn.style.display = checkedCount > 0 ? 'flex' : 'none';
                    countSpn.innerText = checkedCount;
                }
            }
            document.querySelectorAll('.film-bulk-checkbox').forEach(cb => cb.addEventListener('change', updateBulkDeleteUI));
            updateBulkDeleteUI();

            // 5. Load More Visibility Check
            const displayed = listContainer.querySelectorAll('.film-card').length;
            if (loadMoreBtn) {
                loadMoreBtn.style.display = (displayed >= totalCount || films.length < FILMS_PER_PAGE) ? 'none' : 'block';
            }

            setTimeout(() => {
                listContainer.querySelectorAll('.fade-in:not(.visible)').forEach(c => c.classList.add('visible'));
            }, 50);

        } catch (err) {
            logBackend('Fetch Films', 'ERROR', `Fetch failed`, err);
            if (reset) {
                listContainer.innerHTML = `<div class="text-error text-center py-8">FAILED TO LOAD: ${err.message}</div>`;
            }
        }
    }

    // Connect Load More Button
    const topLoadMore = document.getElementById('loadMoreFilmsBtn');
    if (topLoadMore) {
        topLoadMore.addEventListener('click', () => {
            fetchFilms(false);
        });
    }

    // Calls will be made at the end of DOMContentLoaded to avoid TDZ errors

    window.deleteFilm = async function (id, event) {
        if (event) event.stopPropagation();

        const film = window.filmsMap[id];
        if (!film) return;

        if (confirm(`Delete '${film.title}' and all its media files?`)) {
            try {
                // 1. Remove from Firestore
                await deleteDoc(doc(db, "films", id));

                // 2. Remove from Storage (Optional - depends on if we have storage path)
                // Note: In Firebase, it's better to store the full path or GS URL
                // If it's a firebase storage URL, it might look like: https://firebasestorage.googleapis.com/v0/b/.../o/films%2FMEDIA_ID...
                // For now, we'll just delete the record. Cleanup of storage can be done via cloud functions or manual if needed.

                logBackend('Delete Film', 'SUCCESS', `Film '${film.title}' (${id}) removed from Firestore`);
                fetchFilms(true);
            } catch (error) {
                logBackend('Delete Film', 'ERROR', `Failed to delete film ${id}`, error);
                alert(`Delete failed: ${error.message}`);
            }
        }
    }

    // --- SUPABASE ALBUMS INTEGRATION ---
    let currentAlbumsPage = 0;
    let lastVisibleAlbumDoc = null;
    const ALBUMS_PER_PAGE = 6;
    let currentAlbumsFilter = 'ALL';
    window.albumsMap = {};
    let editingAlbumId = null;
    let currentManagingAlbumId = null;
    let currentAlbumModalMode = 'ALBUM'; // 'ALBUM' | 'PREWEDDING'

    // --- SUPABASE TESTIMONIALS INTEGRATION ---
    let currentTestimonialsFilter = 'PUBLISHED';
    window.testimonialsMap = {};
    let editingTestimonialId = null;

    async function fetchAlbums(reset = true) {
        const listContainer = document.getElementById('albumsList');
        const loadMoreBtn = document.getElementById('loadMoreAlbumsBtn');
        if (!listContainer) return;

        if (reset) {
            currentAlbumsPage = 0;
            lastVisibleAlbumDoc = null;
            window.albumsMap = {};
            listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">LOADING ALBUMS...</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            if (loadMoreBtn) loadMoreBtn.innerHTML = '<span class="animate-spin material-icons mr-2">refresh</span> LOADING...';
        }

        try {
            // 1. Build Query
            const albumsRef = collection(db, "albums");
            let q = query(albumsRef, orderBy("created_at", "desc"));
            
            if (lastVisibleAlbumDoc && !reset) {
                q = query(q, startAfter(lastVisibleAlbumDoc), limit(ALBUMS_PER_PAGE));
            } else {
                q = query(q, limit(ALBUMS_PER_PAGE));
            }

            const querySnapshot = await getDocs(q);
            const albums = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (querySnapshot.docs.length > 0) {
                lastVisibleAlbumDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            }

            logBackend('Fetch Albums', 'SUCCESS', `Loaded ${albums.length} albums`);

            // 2. Total Count
            const countSnap = await getCountFromServer(albumsRef);
            const totalCount = countSnap.data().count;

            if (reset) {
                // Dashboard stats: split Albums vs Pre-Wedding
                let preweddingCount = 0;
                try {
                    const preweddingSnap = await getCountFromServer(query(albumsRef, where("category", "==", "ENGAGEMENT")));
                    preweddingCount = preweddingSnap.data().count || 0;
                } catch (e) {
                    console.warn("Failed to count pre-wedding albums:", e);
                }

                const clientAlbumsCount = Math.max(0, totalCount - preweddingCount);
                const aStat = document.getElementById('statTotalAlbums');
                if (aStat) aStat.innerHTML = `${clientAlbumsCount}`;

                const pwStat = document.getElementById('statTotalPrewedding');
                if (pwStat) pwStat.innerHTML = `${preweddingCount}`;
            }

            if (reset && albums.length === 0) {
                listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">NO ALBUMS IN DB</div>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            // 3. Render
            let html = '';
            const albumsToRender = albums.filter(a => a.category !== 'ENGAGEMENT');

            if (reset && albumsToRender.length === 0) {
                listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">NO ALBUMS IN DB</div>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            albumsToRender.forEach(album => {
                window.albumsMap[album.id] = album;

                html += `
                    <div class="film-card fade-in">
                        <div class="drag-handle">
                            <input type="checkbox" class="album-bulk-checkbox" value="${album.id}" style="accent-color: var(--color-primary); cursor: pointer; transform: scale(1.2);">
                        </div>
                        <img src="${album.cover_image_url || 'assets/cinematic-frame.jpg'}" class="film-thumb">
                        
                        <div class="film-info">
                            <div class="text-[10px] text-primary tracking-widest uppercase mb-1">ALBUM TITLE</div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-medium text-lg">${album.title}</h3>
                                ${album.is_selected_home ? '<span class="material-icons text-primary text-sm" title="Featured on Home Page">stars</span>' : ''}
                            </div>
                        </div>

                        <div class="film-couple">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-1">CLIENT</div>
                            <div>${album.client_name}</div>
                        </div>

                        <div class="film-category w-32">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-2">PHOTOS</div>
                            <div class="tracking-widest">${album.photo_count || 0} <span class="material-icons text-primary text-xs ml-1">photo</span></div>
                        </div>

                        <div class="film-status w-32">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-2">ACCESS</div>
                            <div class="flex items-center gap-2 text-xs tracking-widest uppercase">
                                <span class="material-icons text-sm opacity-100">${album.access_level === 'PRIVATE' ? 'lock' : 'public'}</span> 
                                ${album.access_level}
                            </div>
                        </div>

                        <div class="film-actions flex gap-4 ml-auto">
                            <button class="icon-btn-small" onclick="manageAlbumImages('${album.id}', event)" title="Manage images"><span class="material-icons text-sm hover:text-primary transition-colors">photo_library</span></button>
                            <button class="icon-btn-small" onclick="editAlbum('${album.id}', event)" title="Edit album details"><span class="material-icons text-sm hover:text-primary transition-colors">edit</span></button>
                            <button class="icon-btn-small" onclick="deleteAlbum('${album.id}', event)" title="Delete album"><span class="material-icons text-sm text-error hover:text-error transition-colors">delete</span></button>
                        </div>
                    </div>
                `;
            });

            if (reset) {
                listContainer.innerHTML = html;
            } else {
                listContainer.insertAdjacentHTML('beforeend', html);
                if (loadMoreBtn) loadMoreBtn.innerHTML = 'LOAD MORE <span class="material-icons ml-1">expand_more</span>';
            }

            // Bulk actions
            const deleteSelectedBtn = document.getElementById('deleteSelectedAlbumsBtn');
            const countSpn = document.getElementById('selectedAlbumsCount');
            function updateBulkUI() {
                const checkedCount = document.querySelectorAll('.album-bulk-checkbox:checked').length;
                if (deleteSelectedBtn) deleteSelectedBtn.style.display = checkedCount > 0 ? 'flex' : 'none';
                if (countSpn) countSpn.innerText = checkedCount;
            }
            document.querySelectorAll('.album-bulk-checkbox').forEach(cb => cb.addEventListener('change', updateBulkUI));
            updateBulkUI();

            // 4. Load More Visibility Check
            const displayedCount = listContainer.querySelectorAll('.film-card').length;
            if (loadMoreBtn) {
                loadMoreBtn.style.display = (displayedCount >= totalCount || albums.length < ALBUMS_PER_PAGE) ? 'none' : 'block';
            }

            setTimeout(() => {
                listContainer.querySelectorAll('.fade-in:not(.visible)').forEach(c => c.classList.add('visible'));
            }, 50);

        } catch (err) {
            logBackend('Fetch Albums', 'ERROR', `Failed to load albums`, err);
            if (reset) {
                listContainer.innerHTML = `<div class="text-error text-center py-8">FAILED TO LOAD: ${err.message}</div>`;
            }
        }
    }

    async function fetchPreweddingAlbums() {
        const listContainer = document.getElementById('preweddingList');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">LOADING PRE-WEDDING...</div>';

        try {
            const q = query(collection(db, "albums"), where("category", "==", "ENGAGEMENT"));
            const querySnapshot = await getDocs(q);
            const albums = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Local sort to avoid composite index requirements
            albums.sort((a, b) => {
                const timeA = a.created_at?.toMillis?.() || Date.parse(a.created_at) || 0;
                const timeB = b.created_at?.toMillis?.() || Date.parse(b.created_at) || 0;
                return timeB - timeA;
            });

            logBackend('Fetch Pre-Wedding Albums', 'SUCCESS', `Loaded ${albums.length} pre-wedding albums`);

            if (albums.length === 0) {
                listContainer.innerHTML = '<div class="opacity-100 text-center py-8 tracking-widest uppercase text-sm">NO PRE-WEDDING ALBUMS IN DB</div>';
                return;
            }

            let html = '';
            albums.forEach(album => {
                window.albumsMap[album.id] = album;

                html += `
                    <div class="film-card fade-in">
                        <div class="drag-handle">
                            <input type="checkbox" class="prewedding-bulk-checkbox" value="${album.id}" style="accent-color: var(--color-primary); cursor: pointer; transform: scale(1.2);">
                        </div>
                        <img src="${album.cover_image_url || 'assets/cinematic-frame.jpg'}" class="film-thumb">

                        <div class="film-info">
                            <div class="text-[10px] text-primary tracking-widest uppercase mb-1">ALBUM</div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-medium text-lg">${album.title}</h3>
                                ${album.is_selected_home ? '<span class="material-icons text-primary text-sm" title="Featured on Home Page">stars</span>' : ''}
                            </div>
                        </div>

                        <div class="film-couple">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-1">CLIENT</div>
                            <div>${album.client_name || '-'}</div>
                        </div>

                        <div class="film-category w-32">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-2">PHOTOS</div>
                            <div class="tracking-widest">${album.photo_count || 0} <span class="material-icons text-primary text-xs ml-1">photo</span></div>
                        </div>

                        <div class="film-status w-32">
                            <div class="text-[10px] opacity-100 tracking-widest uppercase mb-2">ACCESS</div>
                            <div class="flex items-center gap-2 text-xs tracking-widest uppercase">
                                <span class="material-icons text-sm opacity-100">${album.access_level === 'PRIVATE' ? 'lock' : 'public'}</span>
                                ${album.access_level || 'PRIVATE'}
                            </div>
                        </div>

                        <div class="film-actions flex gap-4 ml-auto">
                            <button class="icon-btn-small" onclick="manageAlbumImages('${album.id}', event)" title="Manage images"><span class="material-icons text-sm hover:text-primary transition-colors">photo_library</span></button>
                            <button class="icon-btn-small" onclick="editAlbum('${album.id}', event)" title="Edit album details"><span class="material-icons text-sm hover:text-primary transition-colors">edit</span></button>
                            <button class="icon-btn-small" onclick="deleteAlbum('${album.id}', event)" title="Delete album"><span class="material-icons text-sm text-error hover:text-error transition-colors">delete</span></button>
                        </div>
                    </div>
                `;
            });

            listContainer.innerHTML = html;
            setTimeout(() => {
                listContainer.querySelectorAll('.fade-in:not(.visible)').forEach(c => c.classList.add('visible'));
            }, 50);

        } catch (err) {
            logBackend('Fetch Pre-Wedding Albums', 'ERROR', 'Failed to load pre-wedding albums', err);
            listContainer.innerHTML = `<div class="text-error text-center py-8">FAILED TO LOAD: ${err.message}</div>`;
        }
    }

    function setAlbumCategoryLock(isLocked, forcedValue = null, mode = null) {
        const select = document.getElementById('addAlbumCategory');
        if (!select) return;

        const preweddingOpt = select.querySelector('option[value="ENGAGEMENT"]');
        if (mode && preweddingOpt) {
            if (mode === 'ALBUM') {
                preweddingOpt.hidden = true;
                if (select.value === 'ENGAGEMENT') {
                    select.value = forcedValue || 'WEDDING';
                }
            } else if (mode === 'PREWEDDING') {
                preweddingOpt.hidden = false;
            }
        }

        if (forcedValue) select.value = forcedValue;
        select.disabled = !!isLocked;
        select.style.opacity = isLocked ? '0.6' : '1';
        select.style.cursor = isLocked ? 'not-allowed' : '';
    }


    // --- FIRESTORE TESTIMONIALS LOGIC ---
    async function fetchTestimonials(reset = true) {
        const listContainer = document.getElementById('testimonialsList');
        if (!listContainer) return;

        if (reset) {
            window.testimonialsMap = {};
            listContainer.innerHTML = '<div class="opacity-50 text-center py-8 tracking-widest uppercase text-sm">LOADING REVIEWS...</div>';
        }

        try {
            const q = query(
                collection(db, "testimonials"),
                where("status", "==", currentTestimonialsFilter),
                orderBy("created_at", "desc")
            );
            const querySnapshot = await getDocs(q);
            const testimonials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            logBackend('Fetch Testimonials', 'SUCCESS', `Loaded ${testimonials.length} reviews (${currentTestimonialsFilter}) from Firestore`);

            if (testimonials.length === 0) {
                listContainer.innerHTML = `<div class="opacity-50 text-center py-8 tracking-widest uppercase text-sm">NO ${currentTestimonialsFilter} TESTIMONIALS</div>`;
                return;
            }

            let html = '';
            testimonials.forEach(item => {
                window.testimonialsMap[item.id] = item;
                const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);

                html += `
                    <div class="film-card fade-in">
                        <div class="bulk-select-check flex items-center pr-4 border-r border-outline mr-4" onclick="event.stopPropagation()">
                            <input type="checkbox" class="testi-bulk-checkbox w-4 h-4 cursor-pointer accent-primary" 
                                   value="${item.id}" onchange="updateSelectedTestiCount()">
                        </div>
                        <div class="drag-handle"><span class="material-icons opacity-30">comment</span></div>
                        <div class="film-info">
                            <div class="flex items-center gap-2 mb-1">
                                <div class="text-[10px] text-primary tracking-widest uppercase">CLIENT</div>
                                ${item.is_selected_home ? '<span class="material-icons text-[12px] text-primary" title="Featured on Home Page">stars</span>' : ''}
                            </div>
                            <h3 class="font-medium text-lg">${item.client_name}</h3>
                            <div class="stars-display text-primary/60 text-[10px] mt-1 tracking-widest">${stars}</div>
                        </div>
                        <div class="film-couple" style="flex: 2.5;">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-1">REVIEW</div>
                            <div class="text-xs opacity-80 line-clamp-2">${item.review_text}</div>
                        </div>
                        <div class="film-status w-40">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-2">STATUS</div>
                            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest border ${item.status === 'PUBLISHED' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}">
                                <span class="w-1.5 h-1.5 rounded-full ${item.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'}"></span> 
                                ${item.status}
                            </div>
                        </div>
                        <div class="film-actions flex gap-4 ml-auto items-center">
                            ${item.status === 'PENDING REVIEW' ? `
                            <button class="icon-btn-small" onclick="approveTestimonial('${item.id}', event)" title="Approve & Publish">
                                <span class="material-icons text-sm text-primary hover:scale-110 transition-transform">check_circle</span>
                            </button>` : ''}
                            <button class="icon-btn-small" onclick="editTestimonial('${item.id}', event)" title="Edit testimonial">
                                <span class="material-icons text-sm opacity-50 hover:opacity-100 hover:text-primary transition-all">edit</span>
                            </button>
                            <button class="icon-btn-small" onclick="deleteTestimonial('${item.id}', event)" title="Delete testimonial">
                                <span class="material-icons text-sm opacity-50 hover:opacity-100 hover:text-error transition-all">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            listContainer.innerHTML = html;

        } catch (err) {
            logBackend('Fetch Testimonials', 'ERROR', 'Could not retrieve testimonials', err);
            listContainer.innerHTML = `<div class="text-error text-center py-8 text-xs uppercase">ERROR: ${err.message}</div>`;
        }
    }

    // Connect Filter Tabs for Testimonials
    const testimonialsFilterTabs = document.getElementById('testimonialsFilterTabs');
    if (testimonialsFilterTabs) {
        testimonialsFilterTabs.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                testimonialsFilterTabs.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                currentTestimonialsFilter = link.getAttribute('data-filter') || 'PUBLISHED';
                // Reset bulk selection UI
                const selectAll = document.getElementById('selectAllTestiCheckbox');
                if (selectAll) selectAll.checked = false;
                if (typeof updateSelectedTestiCount === 'function') updateSelectedTestiCount();
                fetchTestimonials(true);
            });
        });
    }

    // --- TESTI BULK DELETE LOGIC ---
    window.updateSelectedTestiCount = function() {
        const checkboxes = document.querySelectorAll('.testi-bulk-checkbox');
        const checked = document.querySelectorAll('.testi-bulk-checkbox:checked');
        const btn = document.getElementById('deleteSelectedTestiBtn');
        const countSpan = document.getElementById('selectedTestiCount');
        const selectAll = document.getElementById('selectAllTestiCheckbox');
        
        // Sync Select All checkbox state
        if (selectAll && checkboxes.length > 0) {
            selectAll.checked = checked.length === checkboxes.length;
        }

        if (btn && countSpan) {
            if (checked.length > 0) {
                btn.style.display = 'flex';
                countSpan.innerText = checked.length;
            } else {
                btn.style.display = 'none';
                countSpan.innerText = '0';
            }
        }
    };

    const selectAllTestiCheckbox = document.getElementById('selectAllTestiCheckbox');
    if (selectAllTestiCheckbox) {
        selectAllTestiCheckbox.addEventListener('change', () => {
            const isChecked = selectAllTestiCheckbox.checked;
            document.querySelectorAll('.testi-bulk-checkbox').forEach(cb => {
                cb.checked = isChecked;
            });
            updateSelectedTestiCount();
        });
    }

    const deleteSelectedTestiBtn = document.getElementById('deleteSelectedTestiBtn');
    if (deleteSelectedTestiBtn) {
        deleteSelectedTestiBtn.addEventListener('click', async () => {
            const checked = document.querySelectorAll('.testi-bulk-checkbox:checked');
            const ids = Array.from(checked).map(cb => cb.value);
            
            if (ids.length === 0) return;
            
            if (confirm(`Are you sure you want to delete ${ids.length} selected testimonials permanently?`)) {
                deleteSelectedTestiBtn.disabled = true;
                deleteSelectedTestiBtn.innerText = 'DELETING...';
                
                try {
                    for (const id of ids) {
                        await deleteDoc(doc(db, "testimonials", id));
                        logBackend('Bulk Delete Testimonial', 'SUCCESS', `Deleted testimonial ${id}`);
                    }
                    deleteSelectedTestiBtn.innerText = 'SUCCESS';
                    setTimeout(() => {
                        deleteSelectedTestiBtn.disabled = false;
                        deleteSelectedTestiBtn.innerHTML = '<span class="material-icons text-sm">delete</span> <span>DELETE SELECTED (<span id="selectedTestiCount">0</span>)</span>';
                        deleteSelectedTestiBtn.style.display = 'none';
                    if (typeof updateSelectedTestiCount === 'function') {
                        const selectAll = document.getElementById('selectAllTestiCheckbox');
                        if (selectAll) selectAll.checked = false;
                        updateSelectedTestiCount();
                    }
                    fetchTestimonials(true);
                }, 1000);
                } catch (err) {
                    logBackend('Bulk Delete Testimonial', 'ERROR', 'Failure during bulk delete', err);
                    alert('Bulk delete failed: ' + err.message);
                    deleteSelectedTestiBtn.disabled = false;
                    deleteSelectedTestiBtn.innerText = 'DELETE SELECTED';
                }
            }
        });
    }

    // Connect Load More for Albums
    const loadMoreAlbumsBtn = document.getElementById('loadMoreAlbumsBtn');
    if (loadMoreAlbumsBtn) {
        loadMoreAlbumsBtn.addEventListener('click', () => {
            fetchAlbums(false);
        });
    }

    // Connect Filter Tabs for Albums
    const albumsFilterTabs = document.getElementById('albumsFilterTabs');
    if (albumsFilterTabs) {
        albumsFilterTabs.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                albumsFilterTabs.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                currentAlbumsFilter = link.getAttribute('data-filter') || 'ALL';
                fetchAlbums(true);
            });
        });
    }

    // Create Album Button
    const createAlbumBtn = document.getElementById('createAlbumBtn');
    if (createAlbumBtn) {
        createAlbumBtn.addEventListener('click', (e) => {
            e.preventDefault();
            editingAlbumId = null;
            currentAlbumModalMode = 'ALBUM';
            document.getElementById('albumModalTitle').innerText = 'Create New Album';
            document.getElementById('saveAlbumBtn').innerText = 'CREATE ALBUM';
            document.getElementById('newAlbumForm').reset();
            document.getElementById('currentAlbumCoverPreview').classList.add('hidden');
            setAlbumCategoryLock(false, 'WEDDING', 'ALBUM');

            const modal = document.getElementById('addAlbumModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 50);
            }
        });
    }

    // Create Pre-Wedding Button
    const createPreweddingBtn = document.getElementById('createPreweddingBtn');
    if (createPreweddingBtn) {
        createPreweddingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            editingAlbumId = null;
            currentAlbumModalMode = 'PREWEDDING';
            document.getElementById('albumModalTitle').innerText = 'Upload Pre-Wedding Album';
            document.getElementById('saveAlbumBtn').innerText = 'CREATE ALBUM';
            document.getElementById('newAlbumForm').reset();
            document.getElementById('currentAlbumCoverPreview').classList.add('hidden');
            const accessSel = document.getElementById('addAlbumAccess');
            if (accessSel) accessSel.value = 'PUBLIC';

            const modal = document.getElementById('addAlbumModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 50);
            }

            // Ensure category defaults to PRE-WEDDING for this flow (even after form reset/animation)
            setAlbumCategoryLock(true, 'ENGAGEMENT', 'PREWEDDING');
            setTimeout(() => {
                setAlbumCategoryLock(true, 'ENGAGEMENT', 'PREWEDDING');
                const accessSel2 = document.getElementById('addAlbumAccess');
                if (accessSel2) accessSel2.value = 'PUBLIC';
            }, 0);
        });
    }

    // Close Album Modal
    const addAlbumModal = document.getElementById('addAlbumModal');
    const closeAlbumModalBtn = document.getElementById('closeAlbumModalBtn');
    const cancelAlbumBtn = document.getElementById('cancelAlbumBtn');

    function closeAddAlbumModal() {
        if (addAlbumModal) {
            addAlbumModal.classList.remove('active');
            setTimeout(() => {
                addAlbumModal.style.display = 'none';
                if (newAlbumForm) newAlbumForm.reset();
                currentAlbumModalMode = 'ALBUM';
                setAlbumCategoryLock(false, 'WEDDING', 'ALBUM');
                const selectedCheckbox = document.getElementById('addAlbumSelected');
                if (selectedCheckbox) selectedCheckbox.checked = false;
                const statusMsg = document.getElementById('albumUploadStatusMsg');
                if (statusMsg) {
                    statusMsg.style.display = 'none';
                    statusMsg.innerText = '';
                }
            }, 300);
        }
    }
    if (closeAlbumModalBtn) closeAlbumModalBtn.onclick = closeAddAlbumModal;
    if (cancelAlbumBtn) cancelAlbumBtn.onclick = closeAddAlbumModal;

    // Save Album
    const newAlbumForm = document.getElementById('newAlbumForm');
    if (newAlbumForm) {
        newAlbumForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveAlbumBtn');
            const statusMsg = document.getElementById('albumUploadStatusMsg');

            const titleClientRaw = document.getElementById('addAlbumTitleClient').value;
            const category = currentAlbumModalMode === 'PREWEDDING' ? 'ENGAGEMENT' : document.getElementById('addAlbumCategory').value;
            const access_level = document.getElementById('addAlbumAccess').value;
            const isFeatured = document.getElementById('addAlbumSelected')?.checked || false;
            const coverFileInput = document.getElementById('addAlbumCover');

            try {
                const parseTitleClient = (raw) => {
                    const value = (raw || '').trim();
                    if (!value) return { title: '', client_name: '' };

                    // Preferred delimiter: Client | Album Title
                    if (value.includes('|')) {
                        const idx = value.indexOf('|');
                        const left = value.slice(0, idx).trim();
                        const right = value.slice(idx + 1).trim();
                        if (left && right) return { client_name: left, title: right };
                    }

                    // Secondary delimiters with spaces to avoid splitting normal hyphenated titles
                    const spacedDelims = [' — ', ' - ', ' – ', ' / '];
                    for (const delim of spacedDelims) {
                        if (value.includes(delim)) {
                            const idx = value.indexOf(delim);
                            const left = value.slice(0, idx).trim();
                            const right = value.slice(idx + delim.length).trim();
                            if (left && right) return { client_name: left, title: right };
                        }
                    }

                    // If user entered a single name, store it for both fields (keeps compatibility across UI)
                    return { client_name: value, title: value };
                };

                const { title, client_name } = parseTitleClient(titleClientRaw);
                if (!title) throw new Error('Album Title / Client Name is required.');

                // Limit Check for featured albums
                if (isFeatured) {
                    const q = query(collection(db, "albums"), where("is_selected_home", "==", true));
                    const snapshot = await getCountFromServer(q);
                    let count = snapshot.data().count;

                    // If editing, and it was already featured, count is effectively one less
                    if (editingAlbumId && window.albumsMap[editingAlbumId].is_selected_home) {
                        count--;
                    }

                    if (count >= 4) {
                        throw new Error(`You can only feature a maximum of 4 albums on the home page. Please unfeature another album first.`);
                    }
                }

                saveBtn.disabled = true;
                saveBtn.innerText = 'SAVING...';
                statusMsg.innerText = 'UPLOADING DATA...';
                statusMsg.style.display = 'block';

                let coverUrl = editingAlbumId ? window.albumsMap[editingAlbumId].cover_image_url : null;

                // Upload cover if provided
                if (coverFileInput.files.length > 0) {
                    const file = coverFileInput.files[0];
                    const fileName = `${Date.now()}_${file.name.replace(/\\s/g, '_')}`;
                    const filePath = `album_covers/${fileName}`;

                    logBackend('Upload Album Cover', 'INFO', `Uploading cover: ${fileName}`);
                    const storageRef = ref(storage, filePath);
                    await uploadBytes(storageRef, file);
                    coverUrl = await getDownloadURL(storageRef);
                    logBackend('Upload Album Cover', 'SUCCESS', 'Cover uploaded successfully');
                }

                const albumData = {
                    title,
                    client_name,
                    category,
                    access_level,
                    is_selected_home: isFeatured,
                    cover_image_url: coverUrl,
                    updated_at: new Date().toISOString()
                };

                let albumId = editingAlbumId;
                if (editingAlbumId) {
                    logBackend('Update Album', 'INFO', `Updating album record: ${editingAlbumId}`, albumData);
                    await updateDoc(doc(db, "albums", editingAlbumId), albumData);
                } else {
                    albumData.created_at = new Date().toISOString();
                    logBackend('Insert Album', 'INFO', 'Inserting new album record', albumData);
                    const docRef = await addDoc(collection(db, "albums"), albumData);
                    albumId = docRef.id;
                }

                logBackend('Save Album Record', 'SUCCESS', `Saved album: ${albumId}`);

                // --- Handle Bulk Gallery Photo Upload ---
                const bulkPhotosInput = document.getElementById('addAlbumPhotosBulk');
                if (bulkPhotosInput && bulkPhotosInput.files.length > 0) {
                    const photos = bulkPhotosInput.files;
                    statusMsg.innerText = `UPLOADING ${photos.length} GALLERY PHOTOS...`;

                    for (let i = 0; i < photos.length; i++) {
                        const file = photos[i];
                        statusMsg.innerText = `UPLOADING (${i + 1}/${photos.length}): ${file.name}...`;

                        const fileName = `${Date.now()}_${file.name.replace(/\\s/g, '_')}`;
                        const filePath = `albums/${albumId}/${fileName}`;
                        const storageRef = ref(storage, filePath);
                        
                        try {
                            await uploadBytes(storageRef, file);
                            const publicUrl = await getDownloadURL(storageRef);
                            await addDoc(collection(db, "album_images"), {
                                album_id: albumId,
                                image_url: publicUrl,
                                storage_path: filePath,
                                order_index: i,
                                created_at: new Date().toISOString()
                            });
                        } catch (err) {
                            console.error("Single image upload failed:", err);
                        }
                    }

                    // Update photo count
                    const qObj = query(collection(db, "album_images"), where("album_id", "==", albumId));
                    const snap = await getCountFromServer(qObj);
                    const countData = snap.data().count;
                    await updateDoc(doc(db, "albums", albumId), { photo_count: countData });
                }

                statusMsg.innerText = 'SUCCESS!';
                logBackend('Save Album', 'SUCCESS', `Full album operation complete for ${albumId}`);
                setTimeout(() => {
                    closeAddAlbumModal();
                    fetchAlbums(true);
                    saveBtn.disabled = false;
                    statusMsg.style.display = 'none';
                }, 1000);

            } catch (err) {
                logBackend('Save Album', 'ERROR', 'Overall album save operation failed', err);
                statusMsg.innerText = 'ERROR: ' + (err.message || 'Unknown error');
                saveBtn.disabled = false;
            }
        });
    }

    // Manage Album Images Global
    window.manageAlbumImages = async function (id, event) {
        if (event) event.stopPropagation();
        const album = window.albumsMap[id];
        if (!album) return;

        currentManagingAlbumId = id;
        document.getElementById('manageImagesSubtitle').innerText = `ALBUM: ${album.title} | CLIENT: ${album.client_name}`;

        // Show Modal
        const modal = document.getElementById('manageImagesModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 50);
        }

        fetchAlbumImages(id);
    }

    async function getAlbumForManage(albumId) {
        try {
            const snap = await getDoc(doc(db, "albums", albumId));
            if (snap.exists()) {
                const data = { id: albumId, ...snap.data() };
                window.albumsMap[albumId] = data;
                return data;
            }
        } catch (err) {
            console.warn("Failed to load album for manage view:", err);
        }
        return window.albumsMap[albumId] || null;
    }

    function updateManageCoverPageRow(album) {
        const thumb = document.getElementById('manageCoverPageThumb');
        const text = document.getElementById('manageCoverPageText');
        const clearBtn = document.getElementById('clearCoverPageBtn');
        if (!thumb || !text || !clearBtn) return;

        const url = album?.cover_page_image_url || null;
        if (url) {
            thumb.innerHTML = `<img src="${url}" alt="Cover Page" class="w-full h-full object-cover">`;
            text.innerHTML = `Set <a href="${url}" target="_blank" class="text-primary hover:underline ml-2">View</a>`;
            clearBtn.style.display = 'inline-flex';
        } else {
            thumb.innerHTML = `<span class="material-icons text-white/40">photo</span>`;
            text.textContent = 'Not set';
            clearBtn.style.display = 'none';
        }
    }

    async function fetchAlbumImages(albumId) {
        const grid = document.getElementById('albumImagesGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="col-span-full opacity-50 text-center py-8 tracking-widest uppercase text-xs">LOADING PHOTOS...</div>';

        try {
            const album = await getAlbumForManage(albumId);
            updateManageCoverPageRow(album);
            const coverPageId = album?.cover_page_image_id || null;
            const coverPageUrl = album?.cover_page_image_url || null;

            const q = query(collection(db, "album_images"), where("album_id", "==", albumId), orderBy("order_index", "asc"));
            const querySnapshot = await getDocs(q);
            const images = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            logBackend('Fetch Album Images', 'SUCCESS', `Loaded ${images.length} images for album ${albumId}`);

            if (images.length === 0) {
                grid.innerHTML = '<div class="col-span-full opacity-50 text-center py-8 tracking-widest uppercase text-xs">NO PHOTOS IN THIS ALBUM. UPLOAD SOME BELOW.</div>';
                await updateDoc(doc(db, "albums", albumId), { photo_count: 0 });
                return;
            }

            await updateDoc(doc(db, "albums", albumId), { photo_count: images.length });

            let html = '';
            images.forEach(img => {
                const isCoverPage = (coverPageId && img.id === coverPageId) || (!coverPageId && coverPageUrl && img.image_url === coverPageUrl);
                html += `
                    <div class="relative group aspect-square bg-surface-lowest overflow-hidden border border-outline" style="${isCoverPage ? 'outline: 2px solid var(--color-primary); outline-offset: -2px;' : ''}">
                        <img src="${img.image_url}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500">
                        ${isCoverPage ? `
                            <div class="absolute top-2 left-2 px-2 py-1 text-[10px] tracking-widest uppercase bg-primary text-white" style="border-radius: 999px;">
                                Cover Page
                            </div>
                        ` : ''}
                        <button onclick="setAlbumCoverPage('${albumId}', '${img.id}', '${encodeURIComponent(img.image_url)}', event)"
                            class="absolute bottom-2 left-2 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            style="background: rgba(0,0,0,0.65); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 999px;">
                            <span class="material-icons" style="font-size: 14px; vertical-align: middle;">${isCoverPage ? 'check_circle' : 'photo_filter'}</span>
                            <span class="ml-2 text-[10px] tracking-widest uppercase">${isCoverPage ? 'Cover' : 'Set Cover'}</span>
                        </button>
                        <button onclick="deleteAlbumImage('${img.id}', event)" class="absolute top-2 right-2 p-1.5 bg-error text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700">
                            <span class="material-icons text-xs">delete</span>
                        </button>
                    </div>
                `;
            });
            grid.innerHTML = html;

        } catch (err) {
            logBackend('Fetch Album Images', 'ERROR', `Failed to load images for album ${albumId}`, err);
            grid.innerHTML = `<div class="col-span-full text-error text-center py-8 text-xs uppercase">ERROR: ${err.message}</div>`;
        }
    }

    window.setAlbumCoverPage = async function (albumId, imageId, encodedUrl, event) {
        if (event) event.stopPropagation();
        if (!albumId) albumId = currentManagingAlbumId;
        if (!albumId || !imageId) return;

        const imageUrl = decodeURIComponent(encodedUrl || '');

        try {
            const album = await getAlbumForManage(albumId);
            const alreadyCover = (album?.cover_page_image_id && album.cover_page_image_id === imageId) ||
                (album?.cover_page_image_url && album.cover_page_image_url === imageUrl);

            const updates = alreadyCover
                ? { cover_page_image_id: null, cover_page_image_url: null, updated_at: new Date().toISOString() }
                : { cover_page_image_id: imageId, cover_page_image_url: imageUrl, updated_at: new Date().toISOString() };

            await updateDoc(doc(db, "albums", albumId), updates);
            window.albumsMap[albumId] = { ...(window.albumsMap[albumId] || { id: albumId }), ...updates };
            updateManageCoverPageRow(window.albumsMap[albumId]);

            logBackend('Set Album Cover Page', 'SUCCESS', `${alreadyCover ? 'Cleared' : 'Set'} cover page for album ${albumId}`);

            fetchAlbumImages(albumId);
            fetchAlbums(true);
        } catch (err) {
            logBackend('Set Album Cover Page', 'ERROR', `Failed to set cover page for album ${albumId}`, err);
            alert('Failed to update cover page: ' + (err.message || 'Unknown error'));
        }
    }

    // Upload Photos to Album
    const uploadAlbumPhotos = document.getElementById('uploadAlbumPhotos');
    if (uploadAlbumPhotos) {
        uploadAlbumPhotos.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files.length || !currentManagingAlbumId) return;

            const status = document.getElementById('photosUploadStatus');
            status.style.display = 'block';
            status.innerText = `UPLOADING ${files.length} PHOTOS...`;

            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                    const filePath = `albums/${currentManagingAlbumId}/${fileName}`;
                    const storageRef = ref(storage, filePath);

                    status.innerText = `UPLOADING ${i + 1}/${files.length}: ${file.name}...`;

                    await uploadBytes(storageRef, file);
                    const publicUrl = await getDownloadURL(storageRef);

                    // Insert into album_images
                    await addDoc(collection(db, "album_images"), {
                        album_id: currentManagingAlbumId,
                        image_url: publicUrl,
                        storage_path: filePath,
                        order_index: i,
                        created_at: new Date().toISOString()
                    });
                }

                status.innerText = 'SUCCESSFULLY UPLOADED ALL PHOTOS';
                logBackend('Batch Gallery Upload', 'SUCCESS', `Uploaded ${files.length} images to album ${currentManagingAlbumId}`);
                setTimeout(() => status.style.display = 'none', 3000);
                uploadAlbumPhotos.value = ''; // Clear input
                fetchAlbumImages(currentManagingAlbumId);
                fetchAlbums(true); // Refresh main list to show count

            } catch (err) {
                logBackend('Batch Gallery Upload', 'ERROR', `Failed during batch upload to ${currentManagingAlbumId}`, err);
                status.innerText = 'UPLOAD FAILED: ' + err.message;
            }
        });
    }

    // Global image delete
    window.deleteAlbumImage = async function (id, event) {
        if (event) event.stopPropagation();
        if (!confirm('Delete this photo permanently?')) return;

        try {
            // 1. Get record to find storage path
            const docRef = doc(db, "album_images", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const imgData = docSnap.data();
                if (imgData.storage_path) {
                    const storageRef = ref(storage, imgData.storage_path);
                    await deleteObject(storageRef).catch(e => console.warn("Storage deletion failed, record will still be removed", e));
                }

                // If this was the cover page, clear it on the album doc
                if (imgData.album_id) {
                    const album = await getAlbumForManage(imgData.album_id);
                    const matchesCover = (album?.cover_page_image_id && album.cover_page_image_id === id) ||
                        (album?.cover_page_image_url && imgData.image_url && album.cover_page_image_url === imgData.image_url);
                    if (matchesCover) {
                        const updates = { cover_page_image_id: null, cover_page_image_url: null, updated_at: new Date().toISOString() };
                        await updateDoc(doc(db, "albums", imgData.album_id), updates);
                        window.albumsMap[imgData.album_id] = { ...(window.albumsMap[imgData.album_id] || { id: imgData.album_id }), ...updates };
                        if (imgData.album_id === currentManagingAlbumId) {
                            updateManageCoverPageRow(window.albumsMap[imgData.album_id]);
                        }
                    }
                }
            }

            // 2. Delete from Firestore
            await deleteDoc(docRef);

            logBackend('Delete Album Image', 'SUCCESS', `Deleted image record ${id}`);
            fetchAlbumImages(currentManagingAlbumId);

        } catch (err) {
            logBackend('Delete Album Image', 'ERROR', `Failed to delete image ${id}`, err);
            alert('Failed to delete photo: ' + err.message);
        }
    }

    // Close Manage Images Modal
    const manageImagesModal = document.getElementById('manageImagesModal');
    const closeManageImagesBtn = document.getElementById('closeManageImagesBtn');
    const doneManageImagesBtn = document.getElementById('doneManageImagesBtn');
    const clearCoverPageBtn = document.getElementById('clearCoverPageBtn');

    if (closeManageImagesBtn) closeManageImagesBtn.onclick = () => {
        manageImagesModal.classList.remove('active');
        setTimeout(() => manageImagesModal.style.display = 'none', 300);
    };
    if (doneManageImagesBtn) doneManageImagesBtn.onclick = () => {
        manageImagesModal.classList.remove('active');
        setTimeout(() => manageImagesModal.style.display = 'none', 300);
    };
    if (clearCoverPageBtn) clearCoverPageBtn.onclick = async (event) => {
        if (event) event.preventDefault();
        if (!currentManagingAlbumId) return;
        if (!confirm('Clear cover page for this album?')) return;

        try {
            const updates = { cover_page_image_id: null, cover_page_image_url: null, updated_at: new Date().toISOString() };
            await updateDoc(doc(db, "albums", currentManagingAlbumId), updates);
            window.albumsMap[currentManagingAlbumId] = { ...(window.albumsMap[currentManagingAlbumId] || { id: currentManagingAlbumId }), ...updates };
            updateManageCoverPageRow(window.albumsMap[currentManagingAlbumId]);
            fetchAlbumImages(currentManagingAlbumId);
            fetchAlbums(true);
        } catch (err) {
            logBackend('Clear Album Cover Page', 'ERROR', `Failed to clear cover page for album ${currentManagingAlbumId}`, err);
            alert('Failed to clear cover page: ' + (err.message || 'Unknown error'));
        }
    };

    // Global edit album
    window.editAlbum = function (id, event) {
        if (event) event.stopPropagation();
        const album = window.albumsMap[id];
        if (!album) return;

        editingAlbumId = id;
        currentAlbumModalMode = album.category === 'ENGAGEMENT' ? 'PREWEDDING' : 'ALBUM';
        document.getElementById('albumModalTitle').innerText = album.category === 'ENGAGEMENT' ? 'Edit Pre-Wedding Album' : 'Edit Album Details';
        document.getElementById('saveAlbumBtn').innerText = 'SAVE CHANGES';

        const combinedInput = document.getElementById('addAlbumTitleClient');
        if (combinedInput) {
            const t = (album.title || '').trim();
            const c = (album.client_name || '').trim();
            combinedInput.value = (t && c && t !== c) ? `${c} | ${t}` : (t || c);
        }
        document.getElementById('addAlbumCategory').value = album.category || 'WEDDING';
        setAlbumCategoryLock(album.category === 'ENGAGEMENT', album.category || 'WEDDING', album.category === 'ENGAGEMENT' ? 'PREWEDDING' : 'ALBUM');
        document.getElementById('addAlbumAccess').value = album.access_level || 'PRIVATE';
        
        const selectedCheckbox = document.getElementById('addAlbumSelected');
        if (selectedCheckbox) {
            selectedCheckbox.checked = album.is_selected_home || false;
        }

        const preview = document.getElementById('currentAlbumCoverPreview');
        if (album.cover_image_url) {
            preview.classList.remove('hidden');
            preview.innerHTML = `Current: <a href="${album.cover_image_url}" target="_blank" class="text-primary hover:underline">View Cover</a>`;
        } else {
            preview.classList.add('hidden');
        }

        const modal = document.getElementById('addAlbumModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 50);
        }
    }

    // Global delete album
    window.deleteAlbum = async function (id, event) {
        if (event) event.stopPropagation();
        const album = window.albumsMap[id];
        if (!album || !confirm(`Delete album '${album.title}' and all its photos?`)) return;

        try {
            // 1. Get all images to clean storage
            const q = query(collection(db, "album_images"), where("album_id", "==", id));
            const querySnapshot = await getDocs(q);
            const images = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Delete storage objects separately
            if (album.cover_image_url && album.cover_image_url.includes('firebasestorage')) {
                try {
                    const coverRef = ref(storage, album.cover_image_url);
                    await deleteObject(coverRef).catch(e => console.warn(e));
                } catch(e) {}
            }

            if (images) {
                for (let img of images) {
                    if (img.image_url && img.image_url.includes('firebasestorage')) {
                        try {
                            const imgRef = ref(storage, img.storage_path || img.image_url);
                            await deleteObject(imgRef).catch(e => console.warn(e));
                        } catch(e) {}
                    }
                    await deleteDoc(doc(db, "album_images", img.id));
                }
            }

            await deleteDoc(doc(db, "albums", id));

            logBackend('Delete Album', 'SUCCESS', `Album '${album.title}' and all content removed`);
            fetchAlbums(true);

        } catch (err) {
            logBackend('Delete Album', 'ERROR', `Critical failure during album deletion ${id}`, err);
            alert('Delete failed: ' + err.message);
        }
    }

    // --- TESTIMONIALS HANDLERS ---
    const addTestimonialBtn = document.getElementById('addTestimonialBtn');
    const addTestimonialModal = document.getElementById('addTestimonialModal');
    const closeTestimonialModalBtn = document.getElementById('closeTestimonialModalBtn');
    const cancelTestiBtn = document.getElementById('cancelTestiBtn');
    const newTestimonialForm = document.getElementById('newTestimonialForm');

    function closeAddTestiModal() {
        if (addTestimonialModal) {
            addTestimonialModal.classList.remove('active');
            setTimeout(() => {
                addTestimonialModal.style.display = 'none';
                if (newTestimonialForm) newTestimonialForm.reset();
                const sel = document.getElementById('testiSelected');
                if (sel) sel.checked = false;
            }, 300);
        }
    }

    if (addTestimonialBtn) {
        addTestimonialBtn.addEventListener('click', () => {
            editingTestimonialId = null;
            document.getElementById('testimonialModalTitle').innerText = 'Add Testimonial';
            document.getElementById('saveTestiBtn').innerText = 'SAVE TESTIMONIAL';
            const modal = document.getElementById('addTestimonialModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 50);
            }
        });
    }

    if (closeTestimonialModalBtn) closeTestimonialModalBtn.onclick = closeAddTestiModal;
    if (cancelTestiBtn) cancelTestiBtn.onclick = closeAddTestiModal;

    if (newTestimonialForm) {
        newTestimonialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveTestiBtn');
            const statusMsg = document.getElementById('testimonialStatusMsg');

            const client_name = document.getElementById('testiClient').value.trim();
            const status = document.getElementById('testiStatus').value;
            const review_text = document.getElementById('testiText').value.trim();
            const is_selected_home = document.getElementById('testiSelected').checked;

            const rating = parseInt(document.getElementById('testiRating').value) || 5;

            try {
                // Limit check for featured testimonials
                if (is_selected_home) {
                    const q = query(collection(db, "testimonials"), where("is_selected_home", "==", true));
                    const snapshot = await getCountFromServer(q);
                    let count = snapshot.data().count;

                    // If editing, and it was already featured, count is effectively one less
                    if (editingTestimonialId && window.testimonialsMap[editingTestimonialId].is_selected_home) {
                        count--;
                    }

                    if (count >= 4) {
                        throw new Error(`You can only feature a maximum of 4 testimonials. Please unfeature another testimonial first.`);
                    }
                }

                saveBtn.disabled = true;
                saveBtn.innerText = 'SAVING...';
                statusMsg.style.display = 'block';
                statusMsg.innerText = 'SAVING TO DATABASE...';

                const testiData = { 
                    client_name, 
                    status, 
                    review_text, 
                    rating, 
                    star_rating: rating,
                    is_selected_home, 
                    updated_at: new Date() 
                };

                if (editingTestimonialId) {
                    logBackend('Update Testimonial', 'INFO', `Updating review ${editingTestimonialId}`, testiData);
                    await updateDoc(doc(db, "testimonials", editingTestimonialId), testiData);
                } else {
                    testiData.created_at = new Date();
                    logBackend('Insert Testimonial', 'INFO', 'Inserting new review', testiData);
                    await addDoc(collection(db, "testimonials"), testiData);
                }

                logBackend('Save Testimonial', 'SUCCESS', 'Review saved successfully');

                statusMsg.innerText = 'SUCCESS!';
                setTimeout(() => {
                    closeAddTestiModal();
                    fetchTestimonials(true);
                    saveBtn.disabled = false;
                    statusMsg.style.display = 'none';
                }, 1000);

            } catch (err) {
                logBackend('Save Testimonial', 'ERROR', 'Failed to save review', err);
                if (statusMsg) {
                    statusMsg.style.display = 'block';
                    statusMsg.style.color = 'var(--color-error)';
                    statusMsg.innerText = 'ERROR: ' + err.message;
                }
                saveBtn.disabled = false;
            }
        });
    }

    window.editTestimonial = function (id, event) {
        if (event) event.stopPropagation();
        const item = window.testimonialsMap[id];
        if (!item) return;

        editingTestimonialId = id;
        document.getElementById('testimonialModalTitle').innerText = 'Edit Testimonial';
        document.getElementById('saveTestiBtn').innerText = 'SAVE CHANGES';

        document.getElementById('testiClient').value = item.client_name;
        document.getElementById('testiStatus').value = item.status || 'PUBLISHED';
        document.getElementById('testiRating').value = item.rating || 5;
        document.getElementById('testiText').value = item.review_text;

        const sel = document.getElementById('testiSelected');
        if (sel) sel.checked = item.is_selected_home || false;

        const modal = document.getElementById('addTestimonialModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 50);
        }
    };

    window.deleteTestimonial = async function (id, event) {
        if (event) event.stopPropagation();
        if (!confirm('Delete this testimonial permanently?')) return;

        try {
            await deleteDoc(doc(db, "testimonials", id));
            logBackend('Delete Testimonial', 'SUCCESS', `Deleted testimonial ${id}`);
            fetchTestimonials(true);
        } catch (err) {
            logBackend('Delete Testimonial', 'ERROR', `Failed to delete testimonial ${id}`, err);
            alert('Delete failed: ' + err.message);
        }
    };

    window.approveTestimonial = async function (id, event) {
        if (event) event.stopPropagation();
        try {
            await updateDoc(doc(db, "testimonials", id), { 
                status: 'PUBLISHED',
                updated_at: new Date()
            });
            logBackend('Approve Testimonial', 'SUCCESS', `Published testimonial ${id}`);
            fetchTestimonials(true);
        } catch (err) {
            logBackend('Approve Testimonial', 'ERROR', `Failed to approve testimonial ${id}`, err);
            alert('Approval failed: ' + err.message);
        }
    };

    // Bulk Delete logic
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const checkedBoxes = document.querySelectorAll('.film-bulk-checkbox:checked');
            const idsToDelete = Array.from(checkedBoxes).map(cb => cb.value);

            if (idsToDelete.length === 0) return;

            if (confirm(`Delete ${idsToDelete.length} selected films permanently?`)) {
                deleteSelectedBtn.innerText = 'DELETING...';

                try {
                    for (const id of idsToDelete) {
                        await deleteDoc(doc(db, "films", id));
                    }
                    logBackend('Bulk Delete', 'SUCCESS', `Successfully deleted ${idsToDelete.length} films`);
                } catch (err) {
                    logBackend('Bulk Delete', 'ERROR', 'Failed to delete records from Firestore', err);
                }

                deleteSelectedBtn.style.display = 'none';
                deleteSelectedBtn.innerText = 'DELETE SELECTED';

                fetchFilms(true);
            }
        });
    }

    // Upload Film (New)
    const uploadFilmBtn = document.getElementById('uploadFilmBtn');
    if (uploadFilmBtn) {
        uploadFilmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            editingFilmId = null;

            const titleEl = document.getElementById('filmModalTitle');
            if (titleEl) titleEl.innerText = 'Upload New Film';

            const btnEl = document.getElementById('saveFilmBtn');
            if (btnEl) btnEl.innerText = 'SAVE FILM';

            const featuredWrap = document.getElementById('filmFeaturedOrderWrap');
            const featuredOrder = document.getElementById('addFilmFeaturedOrder');
            if (featuredWrap) featuredWrap.classList.add('hidden');
            if (featuredOrder) featuredOrder.value = '';

            // Clear HTML previews implicitly
            const modal = document.getElementById('addFilmModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 50);
            }

        });
    }

    // Edit Film (Global)
    window.editFilm = function (id, event) {
        if (event) event.stopPropagation();
        const film = window.filmsMap[id];
        if (!film) return;

        editingFilmId = id;

        // Pre-fill form
        document.getElementById('addFilmTitle').value = film.title || '';



        document.getElementById('addFilmCategory').value = film.category || 'WEDDING FILM';
        document.getElementById('addFilmStatus').value = film.status || 'PUBLISHED';

        const selectedCheckbox = document.getElementById('addFilmSelected');
        if (selectedCheckbox) {
            selectedCheckbox.checked = film.is_selected_work || false;
        }

        const featuredWrap = document.getElementById('filmFeaturedOrderWrap');
        const featuredOrder = document.getElementById('addFilmFeaturedOrder');
        if ((film.is_selected_work || false) && featuredWrap) {
            featuredWrap.classList.remove('hidden');
        } else if (featuredWrap) {
            featuredWrap.classList.add('hidden');
        }
        if (featuredOrder) {
            featuredOrder.value = (film.selected_work_order != null) ? String(film.selected_work_order) : '';
        }
        // File inputs cannot be pre-filled due to browser security

        const titleEl = document.getElementById('filmModalTitle');
        if (titleEl) titleEl.innerText = 'Edit Film';

        const btnEl = document.getElementById('saveFilmBtn');
        if (btnEl) btnEl.innerText = 'SAVE CHANGES';

        // Show current data helper texts


        const videoLabel = document.getElementById('currentVideoLabel');
        const videoPreview = document.getElementById('currentVideoPreview');
        const videoInput = document.getElementById('addFilmVideoUrl');
        if (videoInput) {
            videoInput.value = film.video_url || '';
            // Trigger input event to show preview
            videoInput.dispatchEvent(new Event('input'));
        }
        if (videoPreview && videoLabel) {
            if (film.video_url) {
                videoLabel.classList.remove('hidden');
                videoPreview.classList.remove('hidden');
                videoPreview.innerHTML = `Current URL: <a href="${film.video_url}" target="_blank" class="text-primary hover:underline">${film.video_url}</a>`;
            } else {
                videoLabel.classList.add('hidden');
                videoPreview.classList.add('hidden');
                videoPreview.innerText = '';
            }
        }

        // Show Modal
        const modal = document.getElementById('addFilmModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 50);
        }
    };

    const addFilmModal = document.getElementById('addFilmModal');
    const closeFilmModalBtn = document.getElementById('closeFilmModalBtn');
    const cancelFilmBtn = document.getElementById('cancelFilmBtn');
    const newFilmForm = document.getElementById('newFilmForm');

    function closeAddFilmModal() {
        if (addFilmModal) {
            addFilmModal.classList.remove('active');
            setTimeout(() => {
                addFilmModal.style.display = 'none';
                if (newFilmForm) newFilmForm.reset();
                const ytPreview = document.getElementById('ytUrlPreview');
                if (ytPreview) ytPreview.classList.add('hidden');
                const ytFrame = document.getElementById('addFilmYtPreview');
                if (ytFrame) ytFrame.src = '';

                // Reset select explicitly if needed or rely on reset()
                const selectedCheckbox = document.getElementById('addFilmSelected');
                if (selectedCheckbox) selectedCheckbox.checked = false;
                const featuredWrap = document.getElementById('filmFeaturedOrderWrap');
                const featuredOrder = document.getElementById('addFilmFeaturedOrder');
                if (featuredWrap) featuredWrap.classList.add('hidden');
                if (featuredOrder) featuredOrder.value = '';

                // Explicitly clear additional fields if reset() misses them (though it shouldn't)
                ['addFilmTitle', 'addFilmVideoUrl'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });

                const statusMsg = document.getElementById('uploadStatusMsg');
                if (statusMsg) {
                    statusMsg.style.display = 'none';
                    statusMsg.innerText = '';
                }
            }, 300);
        }
    }

    if (closeFilmModalBtn) closeFilmModalBtn.addEventListener('click', closeAddFilmModal);
    if (cancelFilmBtn) cancelFilmBtn.addEventListener('click', closeAddFilmModal);

    // Featured order UI toggle
    const addFilmSelected = document.getElementById('addFilmSelected');
    const featuredWrap = document.getElementById('filmFeaturedOrderWrap');
    const featuredOrder = document.getElementById('addFilmFeaturedOrder');
    if (addFilmSelected) {
        addFilmSelected.addEventListener('change', () => {
            if (addFilmSelected.checked) {
                if (featuredWrap) featuredWrap.classList.remove('hidden');
            } else {
                if (featuredWrap) featuredWrap.classList.add('hidden');
                if (featuredOrder) featuredOrder.value = '';
            }
        });
    }

    // Youtube Preview Logic
    const filmVideoUrlInput = document.getElementById('addFilmVideoUrl');
    if (filmVideoUrlInput) {
        filmVideoUrlInput.addEventListener('input', () => {
            const url = filmVideoUrlInput.value.trim();
            const previewContainer = document.getElementById('ytUrlPreview');
            const frame = document.getElementById('addFilmYtPreview');
            
            if (!url) {
                if (previewContainer) previewContainer.classList.add('hidden');
                if (frame) frame.src = '';
                return;
            }

            const getYouTubeId = (url) => {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = url.match(regExp);
                return (match && match[2].length === 11) ? match[2] : null;
            };

            const ytId = getYouTubeId(url);
            if (ytId) {
                if (previewContainer) previewContainer.classList.remove('hidden');
                if (frame) frame.src = `https://www.youtube.com/embed/${ytId}`;
            } else {
                if (previewContainer) previewContainer.classList.add('hidden');
                if (frame) frame.src = '';
            }
        });
    }

    if (newFilmForm) {
        newFilmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveFilmBtn');
            const statusMsg = document.getElementById('uploadStatusMsg');
            const originalText = saveBtn.innerText;

            if (statusMsg) {
                statusMsg.style.display = 'block';
                statusMsg.style.color = 'var(--color-primary)';
                statusMsg.innerText = 'INITIALIZING UPLOAD...';
            }
            saveBtn.innerText = 'UPLOADING...';
            saveBtn.disabled = true;

            const title = document.getElementById('addFilmTitle').value.trim();
            const category = document.getElementById('addFilmCategory').value.trim();
            const status = document.getElementById('addFilmStatus').value;
            const isFeatured = document.getElementById('addFilmSelected').checked;
            const featuredOrderRaw = document.getElementById('addFilmFeaturedOrder')?.value || '';
            const videoUrlInput = document.getElementById('addFilmVideoUrl');

            try {
                const featuredOrder = featuredOrderRaw ? Number(featuredOrderRaw) : null;

                // Limit + Order Check for featured films
                if (isFeatured) {
                    if (!featuredOrder || Number.isNaN(featuredOrder) || featuredOrder < 1 || featuredOrder > 4) {
                        throw new Error('Please select a Featured Order between 1 and 4.');
                    }

                    const featuredSnap = await getDocs(query(collection(db, "films"), where("is_selected_work", "==", true)));
                    const featuredFilms = featuredSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const featuredWithoutSelf = featuredFilms.filter(f => !editingFilmId || f.id !== editingFilmId);

                    if (featuredWithoutSelf.length >= 4) {
                        throw new Error(`You can only feature a maximum of 4 films. Please unfeature another film first.`);
                    }

                    const conflict = featuredWithoutSelf.find(f => Number(f.selected_work_order) === featuredOrder);
                    if (conflict) {
                        throw new Error(`Featured Order ${featuredOrder} is already used by another film. Choose a different order.`);
                    }
                }

                // Helper to extract YT ID
                const getYouTubeId = (url) => {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                    const match = url.match(regExp);
                    return (match && match[2].length === 11) ? match[2] : null;
                };

                const videoUrl = videoUrlInput.value.trim();
                const ytId = getYouTubeId(videoUrl);
                if (!ytId) throw new Error("A valid YouTube URL is required to extract a cover image.");

                let coverImageUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
                
                // Fallback check can be added if needed, but for now we set the URL
                logBackend('Cover Extraction', 'SUCCESS', `Extracted cover from YouTube: ${ytId}`);

                const filmData = {
                    title,


                    category,
                    status,
                    is_selected_work: isFeatured,
                    selected_work_order: isFeatured ? featuredOrder : null,
                    cover_image_url: coverImageUrl,
                    video_url: videoUrl,
                    updated_at: new Date().toISOString()
                };

                if (editingFilmId) {
                    logBackend('Update Film', 'INFO', `Updating film: ${editingFilmId}`, filmData);
                    await updateDoc(doc(db, "films", editingFilmId), filmData);
                } else {
                    filmData.created_at = new Date().toISOString();
                    logBackend('Insert Film', 'INFO', 'Inserting new film', filmData);
                    await addDoc(collection(db, "films"), filmData);
                }

                logBackend('Save Film', 'SUCCESS', `Film record saved successfully`);
                closeAddFilmModal();
                fetchFilms(true);
            } catch (err) {
                logBackend('Save Film', 'ERROR', 'Overall film save operation failed', err);
                if (statusMsg) {
                    statusMsg.style.color = 'var(--color-error)';
                    statusMsg.innerText = 'ERROR: ' + err.message;
                }
            } finally {
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    // View Titles Mapping
    const viewTitles = {
        'dashboard': 'KIRANA A N | <span class="tracking-widest font-sans text-sm font-medium">ADMIN</span>',
        'films': 'FILMS MANAGER',
        'albums': 'CLIENT ALBUMS MANAGER',
        'prewedding': 'PRE-WEDDING ALBUMS MANAGER',
        'packages': 'PACKAGES MANAGER',
        'about': 'ABOUT PAGE MANAGER',
        'testimonials': 'TESTIMONIALS MANAGER',
        'enquiries': 'ENQUIRIES INBOX'
    };

    // Tab switching logic
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(nav => nav.classList.remove('active'));

            // Add active class to clicked link
            link.classList.add('active');

            // Get target view id
            const targetId = link.getAttribute('data-target');

            // Hide all views
            views.forEach(view => {
                view.style.display = 'none';
                view.classList.remove('fade-in');
            });

            // Show target view
            const targetView = document.getElementById(`view-${targetId}`);
            if (targetView) {
                targetView.style.display = 'block';
                // Trigger reflow to restart animation
                void targetView.offsetWidth;
                targetView.classList.add('fade-in');
            }

            // Update Topbar Title
            if (viewTitles[targetId] && topbarTitle) {
                topbarTitle.innerHTML = viewTitles[targetId];
            }

            // Show/Hide search bar based on view
            if (searchBar) {
                if (targetId === 'films' || targetId === 'albums' || targetId === 'prewedding') {
                    searchBar.style.display = 'flex';
                    const input = searchBar.querySelector('input');
                    if (input) input.placeholder = `Search ${targetId}...`;
                } else {
                    searchBar.style.display = 'none';
                }
            }

            // Fetch data if needed
            if (targetId === 'films') {
                fetchFilms(true);
            } else if (targetId === 'albums') {
                fetchAlbums(true);
            } else if (targetId === 'prewedding') {
                fetchPreweddingAlbums();
            } else if (targetId === 'testimonials') {
                fetchTestimonials(true);
            } else if (targetId === 'packages') {
                fetchPackages(true);
            } else if (targetId === 'about') {
                fetchAboutProfile();
            } else if (targetId === 'enquiries') {
                fetchEnquiries();
            }

            // On mobile, close sidebar after clicking
            if (window.innerWidth <= 768) {
                adminSidebar.classList.remove('open');
            }
        });
    });

    // Mobile menu toggle
    // The elements mobileMenuBtn and adminSidebar are already declared at the top.
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    if (mobileMenuBtn && adminSidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            adminSidebar.classList.toggle('open');
        });
    }

    if (closeSidebarBtn && adminSidebar) {
        closeSidebarBtn.addEventListener('click', () => {
            adminSidebar.classList.remove('open');
        });
    }

    // Logout logic moved to top

    // --- Modal Logic for Prototype Interactions ---
    const modal = document.getElementById('actionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeBtns = [
        document.getElementById('closeModalBtn'),
        document.getElementById('cancelModalBtn'),
        document.getElementById('confirmModalBtn')
    ];

    function showModal(title, message) {
        if (!modal) return;
        if (modalTitle) modalTitle.innerText = title;
        if (modalMessage) modalMessage.innerText = message;
        modal.classList.add('active');
    }

    function hideModal() {
        if (modal) modal.classList.remove('active');
    }

    closeBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', hideModal);
    });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });
    }

    // Attach prototype click handlers to UI buttons (excluding integrated ones)
    const activeBtnIds = [
        '#mobileMenuBtn', '#closeSidebarBtn', '#uploadFilmBtn',
        '#cancelModalBtn', '#confirmModalBtn', '#saveFilmBtn',
        '#cancelFilmBtn', '#closeFilmModalBtn', '#loadMoreFilmsBtn',
        '#signOutBtn', '#topbarLogoutBtn', '#deleteSelectedBtn',
        '#createAlbumBtn', '#saveAlbumBtn', '#cancelAlbumBtn',
        '#closeAlbumModalBtn', '#loadMoreAlbumsBtn', '#deleteSelectedAlbumsBtn',
        '#createPreweddingBtn', '#deleteSelectedPreweddingBtn',
        '#doneManageImagesBtn', '#closeManageImagesBtn',
        '#addTestimonialBtn', '#saveTestiBtn', '#cancelTestiBtn',
        '#addPackageBtn', '#savePkgBtn', '#cancelPkgBtn', '#closePackageModalBtn',
        '#saveAboutProfileBtn'
    ];
    document.querySelectorAll(`button:not(.modal-close):not([onclick])${activeBtnIds.map(id => `:not(${id})`).join('')}`).forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Extract meaningful action text from button
            let actionText = '';

            // Try to get text nodes directly
            Array.from(btn.childNodes).forEach(node => {
                if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                    actionText += node.textContent.trim() + ' ';
                }
            });

            actionText = actionText.trim();

            // If no text, use the material icon name
            if (!actionText && btn.querySelector('.material-icons')) {
                let iconName = btn.querySelector('.material-icons').innerText.trim();
                // Map icon names to friendly actions
                const iconMap = {
                    'edit': 'Edit Item',
                    'delete': 'Delete Item',
                    'link': 'Share Link',
                    'notifications': 'View Notifications',
                    'settings': 'Admin Settings',
                    'mark_email_read': 'Mark as Read',
                    'archive': 'Archive Message'
                };
                actionText = iconMap[iconName] || iconName;
            }

            if (!actionText) {
                actionText = 'Action';
            }

            showModal(actionText.toUpperCase(), `You clicked the "${actionText}" button. Since this is a UI prototype, backend integration is not currently connected.`);
        });
    });

    // --- ABOUT MANAGER LOGIC ---
    const aboutTabs = document.querySelectorAll('#aboutTabs .tab-link');
    aboutTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const target = tab.getAttribute('data-target');
            document.querySelectorAll('.tab-content-about').forEach(tc => tc.style.display = 'none');
            document.getElementById(`${target}-section`).style.display = 'block';
            aboutTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // --- Image Preview Logic ---
    const aboutPortraitFile = document.getElementById('aboutPortraitFile');
    if (aboutPortraitFile) {
        aboutPortraitFile.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('aboutPortraitPreview').src = e.target.result;
                    document.getElementById('aboutPortraitPreview').style.opacity = '1';
                }
                reader.readAsDataURL(file);
            }
        });
    }

    async function fetchAboutProfile() {
        try {
            const q = query(collection(db, "about_profile"), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                logBackend('Fetch About Profile', 'INFO', 'No profile record found');
                return;
            }

            const data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            logBackend('Fetch About Profile', 'SUCCESS', 'Profile record loaded');

            document.getElementById('aboutName').value = data.name || '';
            document.getElementById('aboutSubName').value = data.sub_name || '';
            document.getElementById('aboutPortraitUrl').value = data.portrait_url || '';
            if (data.portrait_url) {
                document.getElementById('aboutPortraitPreview').src = data.portrait_url;
                document.getElementById('aboutPortraitPreview').style.opacity = '1';
            }
            document.getElementById('aboutBio').value = data.bio || '';
            document.getElementById('aboutStat1Val').value = data.stat1_val || '';
            document.getElementById('aboutStat1Label').value = data.stat1_label || '';
            document.getElementById('aboutStat2Val').value = data.stat2_val || '';
            document.getElementById('aboutStat2Label').value = data.stat2_label || '';
            document.getElementById('aboutManifesto').value = data.manifesto_quote || '';

            // Store ID for update
            window.currentProfileId = data.id;

        } catch (err) {
            console.error('[About] Error fetching profile:', err);
        }
    }


    const profileForm = document.getElementById('aboutProfileForm');
    if (profileForm) {
        console.log('[About] Attaching submit listener to form...');
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[About] Form submission triggered');

            const status = document.getElementById('aboutProfileStatus');
            const submitBtn = document.getElementById('saveAboutProfileBtn');
            if (status) status.innerText = '';

            if (!db) {
                if (status) {
                    status.style.color = 'var(--color-error)';
                    status.innerText = 'DATABASE NOT CONNECTED';
                }
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.innerText = 'SAVING...';
                    submitBtn.disabled = true;
                }
                if (status) status.innerText = 'SAVING...';

                let portraitUrl = document.getElementById('aboutPortraitUrl').value;

                // 1. Upload logic if file selected
                const fileInput = document.getElementById('aboutPortraitFile');
                if (fileInput && fileInput.files.length > 0) {
                    if (status) status.innerText = 'UPLOADING IMAGE...';
                    const file = fileInput.files[0];
                    const fileName = `portrait_${Date.now()}_${file.name}`;
                    const filePath = `about/${fileName}`;

                    const storageRef = ref(storage, filePath);
                    await uploadBytes(storageRef, file);
                    portraitUrl = await getDownloadURL(storageRef);
                }

                const profileData = {
                    name: document.getElementById('aboutName').value.trim(),
                    sub_name: document.getElementById('aboutSubName').value.trim(),
                    portrait_url: portraitUrl,
                    bio: document.getElementById('aboutBio').value.trim(),
                    stat1_val: document.getElementById('aboutStat1Val').value.trim(),
                    stat1_label: document.getElementById('aboutStat1Label').value.trim(),
                    stat2_val: document.getElementById('aboutStat2Val').value.trim(),
                    stat2_label: document.getElementById('aboutStat2Label').value.trim(),
                    manifesto_quote: document.getElementById('aboutManifesto').value.trim(),
                    updated_at: new Date().toISOString()
                };

                console.log('[About] Executing Firebase update/insert', profileData);

                if (window.currentProfileId && window.currentProfileId !== '') {
                    logBackend('Update Profile', 'INFO', `Updating profile record: ${window.currentProfileId}`, profileData);
                    await updateDoc(doc(db, "about_profile", window.currentProfileId), profileData);
                } else {
                    logBackend('Insert Profile', 'INFO', 'Creating new profile record', profileData);
                    profileData.created_at = new Date().toISOString();
                    const docRef = await addDoc(collection(db, "about_profile"), profileData);
                    window.currentProfileId = docRef.id;
                }

                logBackend('Save Profile', 'SUCCESS', 'Profile saved to database');

                if (status) {
                    status.style.color = '#2ecc71';
                    status.innerText = 'PROFILE UPDATED SUCCESSFULLY!';
                    setTimeout(() => { if (status) status.innerText = ''; }, 3000);
                }
            } catch (err) {
                console.error('[About] Save failed:', err);
                if (status) {
                    status.style.color = 'var(--color-error)';
                    status.innerText = 'SAVE FAILED: ' + err.message;
                }
            } finally {
                if (submitBtn) {
                    submitBtn.innerText = 'SAVE CHANGES';
                    submitBtn.disabled = false;
                }
            }
        });
    }


    // --- Enquiries variables (must be before fetch calls) ---
    let enquiries = [];
    let activeEnquiryFilter = 'ALL';

    // --- INITIAL FETCH CYCLE ---
    async function startApp() {
        try {
            await fetchFilms();
        } catch (e) {
            console.error('Initial Films Fetch Failed:', e);
        }

        try {
            await fetchEnquiries();
        } catch (e) {
            console.error('Initial Enquiries Fetch Failed:', e);
        }


        try {
            await fetchAlbums();
        } catch (e) {
            console.error('Initial Albums Fetch Failed:', e);
        }

        // Handle hash on load (optional direct linking to views)
        if (window.location.hash) {
            const hashTarget = window.location.hash.substring(1);
            const link = document.querySelector(`[data-target="${hashTarget}"]`);
            if (link) {
                link.click();
            }
        }
    }

    startApp();

    // --- Enquiries Manager Logic ---

    async function fetchEnquiries() {
        const list = document.getElementById('enquiriesList');
        if (!list) return;

        try {
            list.innerHTML = `<div class="p-8 text-center opacity-100 uppercase text-[10px] tracking-widest">Loading Enquiries...</div>`;

            let q = query(collection(db, "enquiries"), orderBy("created_at", "desc"));

            if (activeEnquiryFilter === 'UNREAD') q = query(q, where('status', '==', 'UNREAD'));
            else if (activeEnquiryFilter === 'READ') q = query(q, where('status', '==', 'READ'));
            else if (activeEnquiryFilter === 'ARCHIVED') q = query(q, where('status', '==', 'ARCHIVED'));

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            logBackend('Fetch Enquiries', 'SUCCESS', `Loaded ${data.length} messages (Filter: ${activeEnquiryFilter})`);

            // Update Stats - Count UNREAD Specifically
            const unreadQ = query(collection(db, "enquiries"), where("status", "==", "UNREAD"));
            const unreadSnapshot = await getCountFromServer(unreadQ);
            const unreadCount = unreadSnapshot.data().count;

            const eStat = document.getElementById('statPendingInquiries');
            if (eStat) {
                logBackend('Fetch Unread Count', 'SUCCESS', `Current unread: ${unreadCount}`);
                eStat.innerHTML = `${unreadCount}`;
            }

            enquiries = data || [];
            renderEnquiryList();
            renderDashboardEnquiries();
        } catch (err) {
            console.error('[Enquiries] Fetch error:', err);
            list.innerHTML = '<div class="text-error p-8 text-center">FAILED TO LOAD</div>';
        }
    }

    function renderEnquiryList() {
        const list = document.getElementById('enquiriesList');
        if (!list) return;

        if (enquiries.length === 0) {
            list.innerHTML = `<div class="p-12 text-center opacity-100 uppercase text-[10px] tracking-widest">No enquiries found</div>`;
            return;
        }

        list.innerHTML = enquiries.map(enq => {
            const date = enq.created_at ? (enq.created_at.toDate ? enq.created_at.toDate() : new Date(enq.created_at)) : new Date();
            const timeStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const isUnread = enq.status === 'UNREAD';
            const isActive = document.querySelector('.enquiry-item.active')?.getAttribute('data-id') === enq.id;

            return `
                <div class="enquiry-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}" 
                     data-id="${enq.id}" onclick="showEnquiryDetails('${enq.id}')">
                    <div class="enquiry-item-meta">
                        <span>${enq.package_interest || 'ENQUIRY'}</span>
                        <span>${timeStr}</span>
                    </div>
                    <h4 class="enquiry-item-title font-serif">${enq.client_name}</h4>
                    <div class="enquiry-item-excerpt">${enq.message}</div>
                    ${isUnread ? '<div class="unread-dot"></div>' : ''}
                </div>
            `;
        }).join('');
    }

    function renderDashboardEnquiries() {
        const list = document.getElementById('dashboardEnquiriesList');
        if (!list) return;

        // Take top 5 recent
        const recent = enquiries.slice(0, 5);

        if (recent.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="text-center py-8 opacity-40 uppercase tracking-widest text-[10px]">No new enquiries</td></tr>';
            return;
        }

        list.innerHTML = recent.map(enq => {
            const date = enq.created_at ? (enq.created_at.toDate ? enq.created_at.toDate() : new Date(enq.created_at)) : new Date();
            const timeStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            return `
                <tr>
                    <td>
                        <div class="font-medium">${enq.client_name}</div>
                        <div class="text-[10px] text-primary tracking-widest uppercase mt-1 opacity-100">${enq.category || 'INQUIRY'}</div>
                    </td>
                    <td class="text-sm opacity-100">${timeStr}</td>
                    <td class="text-xs uppercase tracking-widest">${enq.package_interest || 'N/A'}</td>
                    <td><span class="badge badge-outline" style="font-size: 9px; padding: 0.2rem 0.5rem;">${enq.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    window.showEnquiryDetails = async (id) => {
        const enq = enquiries.find(e => e.id === id);
        if (!enq) return;

        // Mark as READ in UI and DB immediately if UNREAD
        if (enq.status === 'UNREAD') {
            logBackend('Mark Enquiry Read', 'INFO', `Updating status to READ for: ${id}`);
            try {
                await updateDoc(doc(db, "enquiries", id), { status: 'READ' });
                logBackend('Mark Enquiry Read', 'SUCCESS', 'Status updated in DB');
                enq.status = 'READ';
                renderEnquiryList();
            } catch (error) {
                logBackend('Mark Enquiry Read', 'ERROR', 'Could not update status', error);
            }
        }

        // Highlight active in list
        document.querySelectorAll('.enquiry-item').forEach(card => {
            card.classList.remove('active');
            if (card.getAttribute('data-id') === id) card.classList.add('active');
        });

        const details = document.getElementById('enquiryDetails');
        if (!details) return;

        const date = enq.created_at ? (enq.created_at.toDate ? enq.created_at.toDate() : new Date(enq.created_at)) : new Date();
        const timeStr = date.toLocaleString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const reasonsStr = Array.isArray(enq.reasons) ? enq.reasons.join(', ') : (enq.package_interest || 'General Inquiry');

        details.innerHTML = `
            <div class="fade-in animate-slide-up h-full flex flex-col relative enquiry-details-inner p-12 md:p-16">
                <!-- New Flex Header for Actions -->
                <div class="flex justify-between items-start mb-10 w-full border-b border-outline pb-8">
                    <div class="flex flex-col">
                        <div class="text-primary text-[10px] tracking-[0.6em] uppercase mb-2 opacity-100">Enquiry Received</div>
                        <h2 class="font-serif text-2xl">${enq.client_name}</h2>
                    </div>
                    
                    <div class="flex gap-3 mt-2">
                        <button class="inbox-action-btn" onclick="updateEnquiryStatus('${enq.id}', '${enq.status === 'ARCHIVED' ? 'READ' : 'ARCHIVED'}')">
                            <span class="material-icons text-sm">${enq.status === 'ARCHIVED' ? 'unarchive' : 'archive'}</span>
                            <span class="text-[8px]">${enq.status === 'ARCHIVED' ? 'UNARCHIVE' : 'ARCHIVE'}</span>
                        </button>
                        <button class="inbox-action-btn delete-btn" onclick="deleteEnquiry('${enq.id}')">
                            <span class="material-icons text-sm">delete</span>
                            <span class="text-[8px]">DELETE</span>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto pr-4 mb-8 custom-scrollbar">
                    <div class="enquiry-form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Email Address</label>
                            <div class="enquiry-form-value text-sm underline decoration-primary/20 underline-offset-4">${enq.email}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Phone Number</label>
                            <div class="enquiry-form-value text-sm">${enq.phone || 'Not Provided'}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Wedding Location</label>
                            <div class="enquiry-form-value text-sm uppercase tracking-wider">${enq.wedding_location || 'Not Provided'}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Wedding Date</label>
                            <div class="enquiry-form-value text-sm">${enq.wedding_date || 'Not Provided'}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Interest Package</label>
                            <div class="enquiry-form-value text-primary font-bold uppercase tracking-widest text-[10px]">${reasonsStr}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Date Received</label>
                            <div class="enquiry-form-value opacity-100 text-sm">${timeStr}</div>
                        </div>
                    </div>

                    <div class="enquiry-message-area mt-4">
                        <label class="enquiry-form-label mb-3 block opacity-100">Private Message</label>
                        <div class="enquiry-form-value leading-relaxed whitespace-pre-wrap" style="min-height: 200px; align-items: flex-start; padding: 1.5rem 1.75rem;">
                            ${enq.message}
                        </div>
                    </div>
                </div>

                <div class="mt-auto pt-8 border-t border-outline flex flex-wrap gap-4">
                    <a href="mailto:${enq.email}?subject=Regarding your enquiry - The Wed 24" class="reply-btn reply-btn-email flex-1 justify-center">
                        <span class="material-icons">mail</span> SEND EMAIL
                    </a>
                    
                    ${enq.phone ? `
                    <a href="https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}?text=Hello ${encodeURIComponent(enq.client_name)}, this is Kirana (The Wed 24) regarding your enquiry for ${encodeURIComponent(reasonsStr)}." 
                       target="_blank" 
                       class="reply-btn reply-btn-whatsapp flex-1 justify-center">
                        <span class="material-icons">chat</span> WHATSAPP CHAT
                    </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    window.updateEnquiryStatus = async (id, status) => {
        try {
            logBackend('Update Enquiry Status', 'INFO', `Setting status to ${status} for: ${id}`);
            await updateDoc(doc(db, "enquiries", id), { status });
            logBackend('Update Enquiry Status', 'SUCCESS', `Status updated to ${status}`);

            // Re-fetch to update list and details view
            await fetchEnquiries();
            if (status === 'ARCHIVED') {
                document.getElementById('enquiryDetails').innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full opacity-30 text-center">
                        <span class="material-icons text-5xl mb-4">mail_outline</span>
                        <p class="uppercase tracking-[0.3em] text-xs">Enquiry Archived</p>
                    </div>
                `;
            } else {
                showEnquiryDetails(id);
            }
        } catch (err) {
            logBackend('Update Enquiry Status', 'ERROR', `Failed to update status for ${id}`, err);
            alert('Update failed: ' + err.message);
        }
    };

    window.deleteEnquiry = async (id) => {
        if (!confirm('Are you sure you want to PERMANENTLY delete this enquiry?')) return;
        try {
            logBackend('Delete Enquiry', 'INFO', `Deleting enquiry record: ${id}`);
            await deleteDoc(doc(db, "enquiries", id));
            logBackend('Delete Enquiry', 'SUCCESS', 'Enquiry record removed');

            await fetchEnquiries();
            document.getElementById('enquiryDetails').innerHTML = `
                <div class="flex flex-col items-center justify-center h-full opacity-30 text-center">
                    <span class="material-icons text-5xl mb-4">delete_forever</span>
                    <p class="uppercase tracking-[0.3em] text-xs">Deleted</p>
                </div>
            `;
        } catch (err) {
            logBackend('Delete Enquiry', 'ERROR', `Could not delete enquiry: ${id}`, err);
            alert('Delete failed: ' + err.message);
        }
    };

    // Filter Tabs for Enquiries
    document.querySelectorAll('#enquiriesFilterTabs .tab-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('#enquiriesFilterTabs .tab-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            activeEnquiryFilter = link.getAttribute('data-filter');
            fetchEnquiries();
        };
    });
});
