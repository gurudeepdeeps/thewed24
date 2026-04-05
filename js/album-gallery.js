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

    // Scroll to Top Logic
    const scrollTopBtn = document.getElementById('scrollToTop');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.style.opacity = '1';
            scrollTopBtn.style.transform = 'translateY(0)';
            scrollTopBtn.style.pointerEvents = 'auto';
        } else {
            scrollTopBtn.style.opacity = '0';
            scrollTopBtn.style.transform = 'translateY(40px)';
            scrollTopBtn.style.pointerEvents = 'none';
        }
    });

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Initial fetch of public albums
    async function fetchPublicAlbums() {
        try {
            const data = await getAlbums();

            albums = data;
            
            // NEW: Handle Separate Detail Page Mode
            const urlParams = new URLSearchParams(window.location.search);
            const sharedAlbumId = urlParams.get('id');

            if (sharedAlbumId) {
                renderDetailView(sharedAlbumId);
            } else {
                renderAlbums(data);
            }
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
                <div class="image-wrapper aspect-video bg-surface-container overflow-hidden relative group cursor-pointer" onclick="window.location.href='album?id=${album.id}'">
                    <img ${coverImage} 
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                </div>
                <div class="mt-8">
                    <div class="flex items-center justify-between gap-6 flex-wrap">
                        <h3 class="text-2xl italic font-semibold font-serif text-primary">${album.title}</h3>
                        <button class="btn btn-outline py-2 px-4 text-[10px] uppercase tracking-widest whitespace-nowrap ml-auto" onclick="window.location.href='album?id=${album.id}'">View Full Album</button>
                    </div>
                    <p class="text-[10px] tracking-[0.3em] uppercase text-primary/60 mt-3">${date}</p>
                </div>
            `;
            albumGrid.appendChild(albumEl);

            // Trigger animation
            setTimeout(() => albumEl.classList.add('visible'), 50);
        });
    }

    async function renderDetailView(albumId) {
        // Reset scroll to top when opening an album
        window.scrollTo(0, 0);

        const gridSection = document.getElementById('album-grid-section');
        const detailView = document.getElementById('album-detail-view');
        const detailGrid = document.getElementById('detail-image-grid');
        const detailTitle = document.getElementById('detail-album-title');
        const detailDate = document.getElementById('detail-album-date');
        const headerSection = document.querySelector('.album-header');

        // Toggle sections
        if (gridSection) gridSection.style.display = 'none';
        if (headerSection) headerSection.style.display = 'none';
        if (detailView) detailView.style.display = 'block';

        // Find album info
        const album = albums.find(a => a.id === albumId);
        if (album) {
            detailTitle.innerText = album.title;
            const formattedDate = new Date(album.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            detailDate.innerText = formattedDate;
        }

        // Fetch and render images
        try {
            detailGrid.innerHTML = `
                <div class="col-span-full py-40 text-center flex flex-col items-center justify-center">
                    <div class="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-8"></div>
                </div>`;

            const images = await getAlbumImages(albumId);
            detailGrid.innerHTML = '';

            if (!images || images.length === 0) {
                detailGrid.innerHTML = `<p class="col-span-full text-center opacity-30 py-20">No images in this collection yet.</p>`;
                return;
            }

            images.forEach((img, index) => {
                const imgWrapper = document.createElement('div');
                const staggerClass = index < 12 ? `reveal-delay-${index + 1}` : '';
                
                imgWrapper.className = `reveal-in mb-[58px] inline-block w-full ${staggerClass}`;
                imgWrapper.style.breakInside = 'avoid';
                imgWrapper.style.marginBottom = '58px';
                
                imgWrapper.innerHTML = `
                    <div class="cursor-pointer" onclick="openLightboxAt(${index})">
                        <img src="${img.image_url}" alt="Wedding Photograph" class="w-full h-auto shadow-sm hover:shadow-2xl transition-all duration-700 cursor-zoom-in">
                    </div>
                `;
                
                detailGrid.appendChild(imgWrapper);
                
                // Tiny timeout to ensure the browser has time to register the element before animating
                requestAnimationFrame(() => {
                    setTimeout(() => imgWrapper.classList.add('visible'), 50);
                });
            });

            // Keep reference for lightbox if user still clicks an image
            currentAlbumPhotos = images;
            currentAlbumTitle = album ? album.title : 'Album Gallery';

        } catch (err) {
            console.error('Render Detail View ERROR', err);
            detailGrid.innerHTML = `<p class="col-span-full text-center opacity-50 py-20">FAILED TO LOAD IMAGES</p>`;
        }
    }

    // Helper for lightbox on separate page
    window.openLightboxAt = (index) => {
        currentPhotoIndex = index;
        showLightbox();
    };

    // Keep existing openAlbum for compatibility or quick look
    window.openAlbum = async (albumId) => {
        window.location.href = `album?id=${albumId}`;
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
