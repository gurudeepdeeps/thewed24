import { getFilms } from './firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('video-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loader = document.getElementById('loader-container');
    
    let currentPage = 0;
    const FILMS_PER_PAGE = 6;
    let allFilms = [];
    
    async function loadFilms(reset = false) {
        if (reset) {
            currentPage = 0;
            grid.innerHTML = '';
            if (loader) loader.classList.add('active');
            
            try {
                // Fetch all films from Firebase via our helper
                allFilms = await getFilms();
                // Filter only PUBLISHED
                allFilms = allFilms.filter(film => film.status === 'PUBLISHED');
            } catch (e) {
                console.error("Error loading films from Firebase", e);
                if (loader) loader.classList.remove('active');
                return;
            }
        }
        
        try {
            if (reset && loadMoreBtn) {
                loadMoreBtn.style.display = 'none';
            } else if (loadMoreBtn) {
                loadMoreBtn.innerText = 'LOADING MORE...';
            }
            
            if (allFilms.length === 0 && reset) {
                grid.innerHTML = '<div class="col-span-full text-center opacity-50 text-xl font-serif">More films coming soon...</div>';
                if(loadMoreBtn) loadMoreBtn.style.display = 'none';
                if (loader) loader.classList.remove('active');
                return;
            }
            
            const from = currentPage * FILMS_PER_PAGE;
            const to = from + FILMS_PER_PAGE;
            const filmsToRender = allFilms.slice(from, to);
            
            let html = '';
            filmsToRender.forEach(film => {
                // Extracted poster & video. We remove default fallbacks as requested.
                const videoSrc = film.video_url ? `src="${film.video_url}"` : '';
                const posterAttr = film.cover_image_url ? `poster="${film.cover_image_url}"` : '';
                
                html += `
                    <div class="video-item fade-in visible">
                        <div class="video-wrapper aspect-video bg-surface-container overflow-hidden relative">
                            <video ${videoSrc} controls class="w-full h-full object-cover" ${posterAttr} preload="metadata" playsinline onclick="if (event.offsetY < this.offsetHeight * 0.85) { event.preventDefault(); this.paused ? this.play() : this.pause(); }"></video>
                        </div>
                        <div class="mt-8">
                            <h3 class="text-2xl italic font-serif">${film.couple_name || film.title || ''}</h3>
                            <p class="text-xs tracking-widest uppercase text-primary opacity-60 mt-3">${film.category || ''}</p>
                        </div>
                    </div>
                `;
            });
            
            if (reset) {
                grid.innerHTML = html;
                if (loader) loader.classList.remove('active');
            } else {
                grid.insertAdjacentHTML('beforeend', html);
            }
            
            // Check if there are more
            if (to >= allFilms.length) {
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            } else {
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = 'inline-block';
                    loadMoreBtn.innerText = 'LOAD MORE FILMS';
                }
            }
            
            currentPage++;
            
        } catch(e) {
            console.error('Fetch Gallery Films ERROR', e);
            if (loadMoreBtn) loadMoreBtn.innerText = 'ERROR LOADING';
            if (loader) loader.classList.remove('active');
        }
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadFilms(false);
        });
    }
    
    loadFilms(true);
});
