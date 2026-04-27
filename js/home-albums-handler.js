import { getFeaturedAlbums } from './firestore.js';

/**
 * Homepage Albums Showcase Integration
 * Fetches the most recent 4 featured public collections for the homepage gallery.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const homeAlbumsContainer = document.getElementById('homeAlbumsContainer');

    if (!homeAlbumsContainer) return;

    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    try {
        // Show skeleton loaders before fetching
        let skeletonsHtml = '';
        for (let i = 0; i < 4; i++) {
            skeletonsHtml += `
                <div class="album-preview-item h-full flex flex-col">
                    <div class="skeleton aspect-video mb-8 w-full"></div>
                    <div class="mt-8">
                        <div class="skeleton h-8 w-2/3 mb-4"></div>
                        <div class="skeleton h-4 w-1/2"></div>
                    </div>
                </div>
            `;
        }
        homeAlbumsContainer.innerHTML = skeletonsHtml;

        const albums = await getFeaturedAlbums();
        
        if (albums && albums.length > 0) {
            // Show only the 4 most recent featured albums for the homepage
            renderHomeAlbums(albums.slice(0, 4));
        } else {
            homeAlbumsContainer.innerHTML = `
                <div class="col-span-full py-20 text-center opacity-30 uppercase tracking-[0.4em] text-[10px]">
                    No featured collections available at the moment.
                </div>
            `;
        }
    } catch (err) {
        console.error('Home Albums Showcase ERROR', err);
        homeAlbumsContainer.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-30 uppercase tracking-[0.4em] text-[10px]">
                Unable to load collections at this time.
            </div>
        `;
    }

    function renderHomeAlbums(albumList) {
        homeAlbumsContainer.innerHTML = '';
        
        albumList.forEach((album, index) => {
            const albumEl = document.createElement('div');
            albumEl.className = 'album-preview-item h-full fade-in flex flex-col group cursor-pointer';
            
            // Note: Since index.html doesn't have the full album-gallery.js lightbox logic,
            // we redirect the user to the album.html page.
            albumEl.className = 'album-preview-item h-full fade-in flex flex-col group';
            
            const coverImage = album.cover_image_url 
                ? `<img src="${album.cover_image_url}"` 
                : '<div class="w-full h-full bg-surface-container flex items-center justify-center"><span class="material-icons opacity-20 text-4xl">photo_album</span></div>';

            const basePage = (String(album.category || '').toUpperCase() === 'ENGAGEMENT') ? 'pre-wedding' : 'album';
            const oneLineText = (album.album_tagline || '').trim();

            albumEl.innerHTML = `
                <div class="relative aspect-video bg-surface-container overflow-hidden mb-3 md:mb-8 cursor-pointer" onclick="window.location.href='${basePage}?id=${album.id}'">
                    ${coverImage} class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                </div>
                <div class="mt-3 md:mt-8">
                    <div class="album-title-action-row">
                        <h3 class="album-title text-3xl italic font-bold font-serif text-primary">${album.title}</h3>
                        <button class="album-action-btn btn btn-outline uppercase tracking-widest whitespace-nowrap shrink-0" onclick="event.stopPropagation(); window.location.href='${basePage}?id=${album.id}'">Full Album</button>
                    </div>
                    ${oneLineText ? `<p class="album-one-line-text">${escapeHtml(oneLineText)}</p>` : ''}
                </div>
            `;

            homeAlbumsContainer.appendChild(albumEl);
            
            // Add staggered delay for the animation
            setTimeout(() => albumEl.classList.add('visible'), 200 * index);
        });
    }
});
