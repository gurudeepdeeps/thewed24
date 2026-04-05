/**
 * admin.js - Logic for Admin Dashboard SPA (Firebase Version)
 */
import { auth, db, storage } from './firebase.js';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, limit, getDoc,
    getCountFromServer
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
            window.filmsMap = {};
            listContainer.innerHTML = '<div class="opacity-50 text-center py-8 tracking-widest uppercase text-sm">LOADING BACKEND...</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }

        try {
            let q;
            if (currentFilmsFilter === 'DRAFT') {
                q = query(collection(db, "films"), where("status", "==", "DRAFT"), orderBy("created_at", "desc"), limit(FILMS_PER_PAGE));
            } else {
                q = query(collection(db, "films"), orderBy("created_at", "desc"), limit(FILMS_PER_PAGE));
            }

            // Simple pagination (for module, we'd use startAfter, but for this refactor we'll just fetch)
            const querySnapshot = await getDocs(q);
            const films = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            logBackend('Fetch Films', 'SUCCESS', `Loaded ${films.length} films from Firestore (Filter: ${currentFilmsFilter})`);

            // Update Stats
            const snapshot = await getCountFromServer(collection(db, "films"));
            const filmCount = snapshot.data().count;
            const fStat = document.getElementById('statTotalFilms');
            if (fStat) fStat.innerHTML = `${filmCount}`;

            if (reset && films.length === 0) {
                listContainer.innerHTML = '<div class="opacity-50 text-center py-8 tracking-widest uppercase text-sm">NO FILMS IN DB. CLICK UPLOAD.</div>';
                return;
            }

            let html = '';
            films.forEach(film => {
                window.filmsMap[film.id] = film;
                const statusClass = film.status === 'PUBLISHED' ? 'success' : 'draft';
                let dateStr = 'N/A';
                const dateVal = film.created_at;
                if (dateVal && dateVal.toDate) {
                    const start = dateVal.toDate();
                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    dateStr = `${months[start.getMonth()]}<br>${String(start.getDate()).padStart(2, '0')},<br>${start.getFullYear()}`;
                }

                html += `
                    <div class="film-card fade-in">
                        <div class="drag-handle">
                            <input type="checkbox" class="film-bulk-checkbox" value="${film.id}" style="accent-color: var(--color-primary); cursor: pointer; transform: scale(1.2);">
                        </div>
                        <img src="${film.cover_image_url || 'assets/cinematic-frame.jpg'}" class="film-thumb ${film.status === 'DRAFT' ? 'grayscale' : ''}">
                        
                        <div class="film-info">
                            <div class="text-[10px] text-primary tracking-widest uppercase mb-1">FILM TITLE</div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-medium text-lg ${film.status === 'DRAFT' ? 'text-white/50' : ''}">${film.title}</h3>
                                ${film.is_selected_work ? '<span class="material-icons text-primary text-sm" title="Featured on Home Page">stars</span>' : ''}
                            </div>
                            ${film.is_selected_work ? '<div class="text-[8px] text-primary uppercase tracking-widest font-bold">Featured on Home</div>' : ''}
                        </div>
                        
                        <div class="film-couple">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-1">COUPLE</div>
                            <div class="${film.status === 'DRAFT' ? 'text-white/50' : ''}">${film.couple_name}</div>
                        </div>

                        <div class="film-category w-32">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-2">CATEGORY</div>
                            <span class="badge ${film.status === 'DRAFT' ? 'badge-outline opacity-50' : 'badge-outline'}">${film.category}</span>
                        </div>

                        <div class="film-status w-32">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-2">STATUS</div>
                            <span class="badge ${film.status === 'DRAFT' ? 'badge-outline opacity-50' : 'badge-outline'}" 
                                  style="color: ${film.status === 'PUBLISHED' ? '#2ecc71' : 'var(--color-text)'}; border-color: ${film.status === 'PUBLISHED' ? '#2ecc71' : 'var(--color-outline)'};">
                                ${film.status}
                            </span>
                        </div>

                        <div class="film-date text-xs opacity-50 tracking-widest w-24">
                            ${dateStr}
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
            }

            setTimeout(() => {
                const newCards = listContainer.querySelectorAll('.fade-in:not(.visible)');
                newCards.forEach(c => c.classList.add('visible'));
            }, 50);

            const deleteBtn = document.getElementById('deleteSelectedBtn');
            const countSpn = document.getElementById('selectedCount');

            function updateBulkDeleteUI() {
                const checkedCount = document.querySelectorAll('.film-bulk-checkbox:checked').length;
                if (deleteBtn && countSpn) {
                    if (checkedCount > 0) {
                        deleteBtn.style.display = 'flex';
                        countSpn.innerText = checkedCount;
                    } else {
                        deleteBtn.style.display = 'none';
                    }
                }
            }

            document.querySelectorAll('.film-bulk-checkbox').forEach(cb => {
                cb.addEventListener('change', updateBulkDeleteUI);
            });
            updateBulkDeleteUI();

            currentFilmsPage++;

            if (loadMoreBtn) {
                loadMoreBtn.style.display = films.length < FILMS_PER_PAGE ? 'none' : 'block';
            }

        } catch (err) {
            logBackend('Fetch Films', 'ERROR', `Failed to load films (Filter: ${currentFilmsFilter})`, err);
            if (reset) {
                listContainer.innerHTML = `<div class="text-error text-center py-8 tracking-widest uppercase text-sm">FAILED TO FETCH: ${err.message}</div>`;
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
    const ALBUMS_PER_PAGE = 6;
    let currentAlbumsFilter = 'ALL';
    window.albumsMap = {};
    let editingAlbumId = null;
    let currentManagingAlbumId = null;

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
            window.albumsMap = {};
            listContainer.innerHTML = '<div class="opacity-50 text-center py-8 tracking-widest uppercase text-sm">LOADING ALBUMS...</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }

        try {
            const q = query(collection(db, "albums"), orderBy("created_at", "desc"), limit(ALBUMS_PER_PAGE));
            const querySnapshot = await getDocs(q);
            const albums = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            logBackend('Fetch Albums', 'SUCCESS', `Loaded ${albums.length} albums from Firestore`);

            // Update Stats
            const snapshotCount = await getCountFromServer(collection(db, "albums"));
            const albumCount = snapshotCount.data().count;
            const aStat = document.getElementById('statTotalAlbums');
            if (aStat) aStat.innerHTML = `${albumCount}`;

            if (reset && albums.length === 0) {
                listContainer.innerHTML = '<div class="opacity-50 text-center py-8 tracking-widest uppercase text-sm">NO ALBUMS IN DB. CLICK CREATE.</div>';
                return;
            }

            let html = '';
            albums.forEach(album => {
                window.albumsMap[album.id] = album;

                let dateStr = 'N/A';
                const dateVal = album.event_date || album.created_at;
                if (dateVal && dateVal.toDate) {
                    const start = dateVal.toDate();
                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    dateStr = `${months[start.getMonth()]}<br>${String(start.getDate()).padStart(2, '0')},<br>${start.getFullYear()}`;
                }

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
                            ${album.is_selected_home ? '<div class="text-[8px] text-primary uppercase tracking-widest font-bold">Featured on Home</div>' : ''}
                        </div>
                        
                        <div class="film-couple">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-1">CLIENT</div>
                            <div>${album.client_name}</div>
                        </div>

                        <div class="film-category w-32">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-2">PHOTOS</div>
                            <div class="tracking-widest">${album.photo_count || 0} <span class="material-icons text-primary text-xs ml-1">photo</span></div>
                        </div>

                        <div class="film-status w-32">
                            <div class="text-[10px] opacity-50 tracking-widest uppercase mb-2">ACCESS</div>
                            <div class="flex items-center gap-2 text-xs tracking-widest uppercase">
                                <span class="material-icons text-sm opacity-50">${album.access_level === 'PRIVATE' ? 'lock' : 'public'}</span> 
                                ${album.access_level}
                            </div>
                        </div>

                        <div class="film-date text-xs opacity-50 tracking-widest w-24">
                            ${dateStr}
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
            }

            setTimeout(() => {
                const newCards = listContainer.querySelectorAll('.fade-in:not(.visible)');
                newCards.forEach(c => c.classList.add('visible'));
            }, 50);

            const deleteSelectedBtn = document.getElementById('deleteSelectedAlbumsBtn');
            const countSpn = document.getElementById('selectedAlbumsCount');

            function updateAlbumBulkDeleteUI() {
                const checkedCount = document.querySelectorAll('.album-bulk-checkbox:checked').length;
                if (deleteSelectedBtn && countSpn) {
                    if (checkedCount > 0) {
                        deleteSelectedBtn.style.display = 'flex';
                        countSpn.innerText = checkedCount;
                    } else {
                        deleteSelectedBtn.style.display = 'none';
                    }
                }
            }

            document.querySelectorAll('.album-bulk-checkbox').forEach(cb => cb.addEventListener('change', updateAlbumBulkDeleteUI));
            updateAlbumBulkDeleteUI();

            currentAlbumsPage++;

            if (loadMoreBtn) {
                loadMoreBtn.style.display = albums.length < ALBUMS_PER_PAGE ? 'none' : 'block';
            }

        } catch (err) {
            logBackend('Fetch Albums', 'ERROR', `Failed to load albums`, err);
            if (reset) {
                listContainer.innerHTML = `<div class="text-error text-center py-8 tracking-widest uppercase text-sm">FAILED TO FETCH: ${err.message}</div>`;
            }
        }
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
                fetchTestimonials(true);
            });
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
            document.getElementById('albumModalTitle').innerText = 'Create New Album';
            document.getElementById('saveAlbumBtn').innerText = 'CREATE ALBUM';
            document.getElementById('newAlbumForm').reset();
            document.getElementById('currentAlbumCoverPreview').classList.add('hidden');

            const modal = document.getElementById('addAlbumModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 50);
            }
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

            const title = document.getElementById('addAlbumTitle').value;
            const client_name = document.getElementById('addAlbumClient').value;
            const category = document.getElementById('addAlbumCategory').value;
            const event_date = document.getElementById('addAlbumDate').value;
            const access_level = document.getElementById('addAlbumAccess').value;
            const isFeatured = document.getElementById('addAlbumSelected')?.checked || false;
            const coverFileInput = document.getElementById('addAlbumCover');

            try {
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
                    event_date: event_date || null,
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

    async function fetchAlbumImages(albumId) {
        const grid = document.getElementById('albumImagesGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="col-span-full opacity-50 text-center py-8 tracking-widest uppercase text-xs">LOADING PHOTOS...</div>';

        try {
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
                html += `
                    <div class="relative group aspect-square bg-surface-lowest overflow-hidden border border-outline">
                        <img src="${img.image_url}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500">
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

    if (closeManageImagesBtn) closeManageImagesBtn.onclick = () => {
        manageImagesModal.classList.remove('active');
        setTimeout(() => manageImagesModal.style.display = 'none', 300);
    };
    if (doneManageImagesBtn) doneManageImagesBtn.onclick = () => {
        manageImagesModal.classList.remove('active');
        setTimeout(() => manageImagesModal.style.display = 'none', 300);
    };

    // Global edit album
    window.editAlbum = function (id, event) {
        if (event) event.stopPropagation();
        const album = window.albumsMap[id];
        if (!album) return;

        editingAlbumId = id;
        document.getElementById('albumModalTitle').innerText = 'Edit Album Details';
        document.getElementById('saveAlbumBtn').innerText = 'SAVE CHANGES';

        document.getElementById('addAlbumTitle').value = album.title;
        document.getElementById('addAlbumClient').value = album.client_name;
        document.getElementById('addAlbumCategory').value = album.category || 'WEDDING';
        document.getElementById('addAlbumDate').value = album.event_date || '';
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
                statusMsg.innerText = 'ERROR: ' + err.message;
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

            // Clear HTML previews implicitly
            const lblC = document.getElementById('currentCoverLabel');
            if (lblC) lblC.classList.add('hidden');
            const prC = document.getElementById('currentCoverPreview');
            if (prC) prC.classList.add('hidden');
            const lblV = document.getElementById('currentVideoLabel');
            if (lblV) lblV.classList.add('hidden');
            const prV = document.getElementById('currentVideoPreview');
            if (prV) prV.classList.add('hidden');

            const modal = document.getElementById('addFilmModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 50);
            }

            // Clear YouTube preview
            const ytPreview = document.getElementById('ytUrlPreview');
            if (ytPreview) ytPreview.classList.add('hidden');
            const ytFrame = document.getElementById('addFilmYtPreview');
            if (ytFrame) ytFrame.src = '';
        });
    }

    // Edit Film (Global)
    window.editFilm = function (id, event) {
        if (event) event.stopPropagation();
        const film = window.filmsMap[id];
        if (!film) return;

        editingFilmId = id;

        // Pre-fill form
        document.getElementById('addFilmCouple').value = film.couple_name || film.title || '';
        document.getElementById('addFilmCategory').value = film.category || 'WEDDING FILM';
        document.getElementById('addFilmStatus').value = film.status || 'PUBLISHED';

        const selectedCheckbox = document.getElementById('addFilmSelected');
        if (selectedCheckbox) {
            selectedCheckbox.checked = film.is_selected_work || false;
        }
        // File inputs cannot be pre-filled due to browser security

        const titleEl = document.getElementById('filmModalTitle');
        if (titleEl) titleEl.innerText = 'Edit Film';

        const btnEl = document.getElementById('saveFilmBtn');
        if (btnEl) btnEl.innerText = 'SAVE CHANGES';

        // Show current data helper texts
        const coverLabel = document.getElementById('currentCoverLabel');
        const coverPreview = document.getElementById('currentCoverPreview');
        if (coverPreview && coverLabel) {
            if (film.cover_image_url && film.cover_image_url !== 'assets/cinematic-frame.jpg') {
                coverLabel.classList.remove('hidden');
                coverPreview.classList.remove('hidden');
                coverPreview.innerHTML = `Current: <a href="${film.cover_image_url}" target="_blank" class="text-primary hover:underline">View Image</a>`;
            } else {
                coverLabel.classList.add('hidden');
                coverPreview.classList.add('hidden');
                coverPreview.innerText = '';
            }
        }

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

            const coupleName = document.getElementById('addFilmCouple').value.trim();
            const title = coupleName;
            const category = document.getElementById('addFilmCategory').value.trim();
            const status = document.getElementById('addFilmStatus').value;
            const isFeatured = document.getElementById('addFilmSelected').checked;

            const coverInput = document.getElementById('addFilmCover');
            const videoUrlInput = document.getElementById('addFilmVideoUrl');

            try {
                // Limit Check for featured films
                if (isFeatured) {
                    const q = query(collection(db, "films"), where("is_selected_work", "==", true));
                    const snapshot = await getCountFromServer(q);
                    let count = snapshot.data().count;

                    // If editing, and it was already featured, count is effectively one less
                    if (editingFilmId && window.filmsMap[editingFilmId].is_selected_work) {
                        count--;
                    }

                    if (count >= 4) {
                        throw new Error(`You can only feature a maximum of 4 films. Please unfeature another film first.`);
                    }
                }

                let coverImageUrl = editingFilmId ? window.filmsMap[editingFilmId].cover_image_url : 'assets/cinematic-frame.jpg';
                let videoUrl = (editingFilmId && window.filmsMap[editingFilmId].video_url) ? window.filmsMap[editingFilmId].video_url : '';

                // 1. Upload Cover Image
                if (coverInput && coverInput.files.length > 0) {
                    if (statusMsg) statusMsg.innerText = 'UPLOADING COVER IMAGE...';
                    const file = coverInput.files[0];
                    const fileName = `cover_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                    const storageRef = ref(storage, `films/covers/${fileName}`);
                    await uploadBytes(storageRef, file);
                    coverImageUrl = await getDownloadURL(storageRef);
                    logBackend('Upload Film Cover', 'SUCCESS', `Cover uploaded: ${coverImageUrl}`);
                }

                // 2. Get Video URL from Input
                if (videoUrlInput && videoUrlInput.value.trim() !== '') {
                    videoUrl = videoUrlInput.value.trim();
                    logBackend('Film Video URL', 'SUCCESS', `Using URL: ${videoUrl}`);
                }

                const filmData = {
                    title,
                    couple_name: coupleName,
                    category,
                    status,
                    is_selected_work: isFeatured,
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
                if (targetId === 'films' || targetId === 'albums') {
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
            list.innerHTML = `<div class="p-8 text-center opacity-40 uppercase text-[10px] tracking-widest">Loading Enquiries...</div>`;

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
            list.innerHTML = '<div class="p-12 text-center opacity-30 uppercase text-[10px] tracking-widest">No enquiries found</div>';
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
                        <div class="font-medium text-white">${enq.client_name}</div>
                        <div class="text-[10px] text-primary tracking-widest uppercase mt-1 opacity-80">${enq.category || 'INQUIRY'}</div>
                    </td>
                    <td class="text-sm opacity-60">${timeStr}</td>
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
                        <div class="text-primary text-[10px] tracking-[0.6em] uppercase mb-2 opacity-70">Enquiry Received</div>
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
                    <div class="enquiry-form-grid">
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Email Address</label>
                            <div class="enquiry-form-value text-sm underline decoration-primary/20 underline-offset-4">${enq.email}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Phone Number</label>
                            <div class="enquiry-form-value text-sm">${enq.phone || 'Not Provided'}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Interest Package</label>
                            <div class="enquiry-form-value text-primary font-bold uppercase tracking-widest text-[10px]">${reasonsStr}</div>
                        </div>
                        <div class="enquiry-form-field">
                            <label class="enquiry-form-label">Date Received</label>
                            <div class="enquiry-form-value opacity-60 text-sm">${timeStr}</div>
                        </div>
                    </div>

                    <div class="enquiry-message-area mt-4">
                        <label class="enquiry-form-label mb-3 block opacity-50">Private Message</label>
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
