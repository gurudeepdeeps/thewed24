import { getFilms } from './firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('video-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loader = document.getElementById('loader-container');
    
    let currentPage = 0;
    const FILMS_PER_PAGE = 6;
    let allFilms = [];
    
    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    async function loadFilms(reset = false) {
        if (reset) {
            currentPage = 0;
            if (grid) {
                let skeletonsHtml = '';
                for (let i = 0; i < 6; i++) {
                    skeletonsHtml += `
                        <div class="video-item mb-12 break-inside-avoid">
                            <div class="skeleton aspect-video mb-6 w-full"></div>
                            <div>
                                <div class="skeleton h-8 w-2/3 mb-4"></div>
                                <div class="skeleton h-4 w-1/2"></div>
                            </div>
                        </div>
                    `;
                }
                grid.innerHTML = skeletonsHtml;
            }
            if (loader) loader.classList.add('active');
            
            try {
                // Fetch all films from Firebase via our helper
                allFilms = await getFilms();
                // Filter only PUBLISHED
                allFilms = allFilms.filter(film => film.status === 'PUBLISHED');

                // Sort: Featured (Selected Works) first, then by featured order, then newest
                const toTime = (v) => {
                    if (!v) return 0;
                    if (typeof v?.toMillis === 'function') return v.toMillis();
                    const parsed = Date.parse(v);
                    return Number.isNaN(parsed) ? 0 : parsed;
                };
                allFilms.sort((a, b) => {
                    const aFeatured = !!a.is_selected_work;
                    const bFeatured = !!b.is_selected_work;
                    if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;

                    if (aFeatured && bFeatured) {
                        const orderA = Number(a.selected_work_order);
                        const orderB = Number(b.selected_work_order);
                        const aHas = Number.isFinite(orderA) ? orderA : 999;
                        const bHas = Number.isFinite(orderB) ? orderB : 999;
                        if (aHas !== bHas) return aHas - bHas; // asc
                    }

                    const timeA = toTime(a.created_at);
                    const timeB = toTime(b.created_at);
                    return timeB - timeA; // desc
                });
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
                const ytId = getYouTubeId(film.video_url);
                const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autohide=1&showinfo=0` : '';
                
                if (ytId) {
                    html += `
                        <div class="video-item fade-in visible">
                            <div class="video-wrapper aspect-video bg-surface-container overflow-hidden relative shadow-2xl">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src="${embedUrl}" 
                                    title="Wedding Film" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowfullscreen
                                    class="absolute inset-0 w-full h-full">
                                </iframe>
                            </div>
                            <div class="mt-8">
                                <h3 class="text-2xl italic font-serif">${film.couple_name || film.title || ''}</h3>
                                ${film.film_tagline ? `<p class="text-sm italic opacity-70 mt-2">${film.film_tagline}</p>` : ''}
                                <p class="text-xs tracking-widest uppercase text-primary opacity-60 mt-3">${film.category || ''}</p>
                            </div>
                        </div>
                    `;
                }
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
