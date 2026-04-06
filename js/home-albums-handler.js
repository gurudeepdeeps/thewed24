import { getFeaturedAlbums } from './firestore.js';

/**
 * Homepage Albums Showcase Integration
 * Fetches the most recent 4 featured public collections for the homepage gallery.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const homeAlbumsContainer = document.getElementById('homeAlbumsContainer');

    if (!homeAlbumsContainer) return;

    try {
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
            const date = new Date(album.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });

            const albumEl = document.createElement('div');
            albumEl.className = 'album-preview-item h-full fade-in flex flex-col group cursor-pointer';
            
            // Note: Since index.html doesn't have the full album-gallery.js lightbox logic,
            // we redirect the user to the album.html page.
            albumEl.className = 'album-preview-item h-full fade-in flex flex-col group';
            
            const coverImage = album.cover_image_url 
                ? `<img src="${album.cover_image_url}"` 
                : '<div class="w-full h-full bg-surface-container flex items-center justify-center"><span class="material-icons opacity-20 text-4xl">photo_album</span></div>';

            albumEl.innerHTML = `
                <div class="relative aspect-video bg-surface-container overflow-hidden mb-8 cursor-pointer" onclick="window.location.href='album?id=${album.id}'">
                    ${coverImage} class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                </div>
                <div class="mt-8">
                    <div class="flex items-center justify-between gap-4">
                        <h3 class="text-3xl italic font-bold font-serif text-primary truncate flex-1">${album.title}</h3>
                        <button class="btn btn-outline py-2 px-4 text-[10px] uppercase tracking-widest whitespace-nowrap shrink-0" onclick="event.stopPropagation(); window.location.href='album?id=${album.id}'">View Full Album</button>
                    </div>
                    <p class="text-[10px] tracking-[0.3em] uppercase text-primary/60 mt-3">${date}</p>
                </div>
            `;

            homeAlbumsContainer.appendChild(albumEl);
            
            // Add staggered delay for the animation
            setTimeout(() => albumEl.classList.add('visible'), 200 * index);
        });
    }
});
