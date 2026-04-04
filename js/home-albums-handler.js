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
            albumEl.onclick = () => window.location.href = 'album';

            const coverImage = album.cover_image_url 
                ? `<img src="${album.cover_image_url}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy">` 
                : '<div class="w-full h-full bg-surface-container flex items-center justify-center"><span class="material-icons opacity-20 text-4xl">photo_album</span></div>';

            albumEl.innerHTML = `
                <div class="relative aspect-[3/4] bg-surface-container overflow-hidden mb-12">
                    ${coverImage}
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center">
                        <span class="btn-primary w-14 h-14 rounded-full flex items-center justify-center">
                            <span class="material-icons text-white">collections</span>
                        </span>
                    </div>
                </div>
                <div class="flex flex-col flex-grow">
                    <span class="text-[10px] tracking-[0.4em] text-primary/60 uppercase mb-4">${date}</span>
                    <h3 class="text-3xl font-normal leading-tight">${album.title}</h3>
                    <div class="w-8 h-px bg-primary/20 my-6 transition-all group-hover:w-16"></div>
                    <div class="mt-auto flex items-center gap-4 text-xs uppercase tracking-widest opacity-60 group-hover:text-primary group-hover:opacity-100 transition-all">
                        <span>Explore Narrative</span>
                        <span class="material-icons text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </div>
                </div>
            `;

            homeAlbumsContainer.appendChild(albumEl);
            
            // Add staggered delay for the animation
            setTimeout(() => albumEl.classList.add('visible'), 200 * index);
        });
    }
});
