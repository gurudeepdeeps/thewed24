import { getAlbums, getAlbumImages } from './firestore.js';

/**
 * Album Gallery Integration with Firebase
 * Handles fetching public albums and individual photos.
 */

document.addEventListener('DOMContentLoaded', async () => {

    const albumGrid = document.getElementById('album-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const closeLightboxBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');

    let albums = [];
    let currentAlbumPhotos = [];
    let currentPhotoIndex = 0;
    let currentAlbumTitle = '';

    // Initial fetch of public albums
    async function fetchPublicAlbums() {
        try {
            const data = await getAlbums();

            albums = data;
            renderAlbums(data);
        } catch (err) {
            console.error('Fetch Public Albums ERROR', err);
            albumGrid.innerHTML = `<p class="col-span-full text-center opacity-50">FAILED TO LOAD COLLECTIONS</p>`;
        }
    }

    function renderAlbums(albumList) {
        albumGrid.innerHTML = '';

        if (albumList.length === 0) {
            albumGrid.innerHTML = `<p class="col-span-full text-center opacity-50 py-20">NO PUBLIC COLLECTIONS YET</p>`;
            return;
        }

        albumList.forEach(album => {
            const date = new Date(album.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const albumEl = document.createElement('div');
            albumEl.className = 'album-item fade-in';
            const coverImage = album.cover_image_url ? `src="${album.cover_image_url}"` : '';
            albumEl.innerHTML = `
                <div class="image-wrapper aspect-video bg-surface-container overflow-hidden relative group cursor-pointer" onclick="openAlbum('${album.id}')">
                    <img ${coverImage} 
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                        <span class="material-icons text-white opacity-0 group-hover:opacity-100 transition-opacity text-4xl">collections</span>
                    </div>
                </div>
                <div class="mt-8">
                    <div class="flex items-center justify-between gap-6 flex-wrap">
                        <h3 class="text-2xl italic font-serif">${album.title}</h3>
                        <button class="btn btn-outline py-2 px-4 text-[10px] uppercase tracking-widest whitespace-nowrap ml-auto" onclick="openAlbum('${album.id}')">View Full Album</button>
                    </div>
                    <p class="text-[10px] tracking-[0.3em] uppercase text-primary/60 mt-3">${date}</p>
                </div>
            `;
            albumGrid.appendChild(albumEl);

            // Trigger animation
            setTimeout(() => albumEl.classList.add('visible'), 50);
        });
    }

    // Open an album and fetch its images
    window.openAlbum = async (albumId) => {
        const album = albums.find(a => a.id === albumId);
        currentAlbumTitle = album ? album.title : 'Album Gallery';

        try {
            const data = await getAlbumImages(albumId);

            if (data && data.length > 0) {
                currentAlbumPhotos = data;
                currentPhotoIndex = 0;
                showLightbox();
            } else {
                alert("This album has no images yet.");
            }
        } catch (err) {
            console.error('Fetch Album Images ERROR', err);
        }
    };

    function showLightbox() {
        if (!currentAlbumPhotos.length) return;

        updateLightboxContent();
        lightbox.classList.add('active');
        lightbox.style.opacity = '1';
        lightbox.style.pointerEvents = 'auto';
        document.body.style.overflow = 'hidden';
    }

    function updateLightboxContent() {
        const photo = currentAlbumPhotos[currentPhotoIndex];
        lightboxImg.src = photo.image_url;
        lightboxTitle.innerText = currentAlbumTitle;
        lightboxCounter.innerText = `${(currentPhotoIndex + 1).toString().padStart(2, '0')} / ${currentAlbumPhotos.length.toString().padStart(2, '0')}`;

        // Removed artificial delay/fade effect for truly instant switching
        lightboxImg.style.opacity = '1';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.style.opacity = '0';
        lightbox.style.pointerEvents = 'none';
        document.body.style.overflow = '';
    }

    function nextPhoto() {
        currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbumPhotos.length;
        updateLightboxContent();
    }

    function prevPhoto() {
        currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbumPhotos.length) % currentAlbumPhotos.length;
        updateLightboxContent();
    }

    // Event Listeners
    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
    if (nextBtn) nextBtn.addEventListener('click', nextPhoto);
    if (prevBtn) prevBtn.addEventListener('click', prevPhoto);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight' && lightbox.classList.contains('active')) nextPhoto();
        if (e.key === 'ArrowLeft' && lightbox.classList.contains('active')) prevPhoto();
    });

    // Close on overlay click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });

    // Touch Swipe Detection for Mobile
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const threshold = 50; // min distance for swipe
        if (touchEndX < touchStartX - threshold) {
            // Swiped Left -> Show Next
            nextPhoto();
        } else if (touchEndX > touchStartX + threshold) {
            // Swiped Right -> Show Prev
            prevPhoto();
        }
    }

    // Initial load
    fetchPublicAlbums();
});
