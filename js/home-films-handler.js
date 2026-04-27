/* home-films-handler.js - Firebase Implementation */
import { getFeaturedFilms } from './firestore.js';

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
    if (error) console.error('Full Error Object:', error);
    console.groupEnd();
};

async function initHomeSelectedWorks() {
    const container = document.getElementById('homeSelectedWorksContainer');
    if (!container) return;

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    try {
        if (container) {
            let skeletonsHtml = '';
            for (let i = 0; i < 4; i++) {
                skeletonsHtml += `
                    <div class="video-item mb-12">
                        <div class="skeleton aspect-video mb-6 w-full"></div>
                        <div>
                            <div class="skeleton h-8 w-2/3 mb-4"></div>
                            <div class="skeleton h-4 w-1/2"></div>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = skeletonsHtml;
        }

        const films = await getFeaturedFilms();
        
        logBackend('Fetch Selected Works', 'SUCCESS', `Loaded ${films.length} featured films from Firestore`);

        if (!films || films.length === 0) {
            container.innerHTML = '<div class="col-span-full py-20 text-center opacity-40 uppercase tracking-widest text-xs">More cinematic works coming soon...</div>';
            return;
        }

        let html = '';
        films.forEach(film => {
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
                            <h3 class="text-2xl italic font-serif">${film.couple_name || film.title}</h3>
                            ${film.film_tagline ? `<p class="text-sm italic opacity-70 mt-2">${film.film_tagline}</p>` : ''}
                            <p class="text-xs tracking-widest uppercase text-primary opacity-60 mt-3">${film.category || 'FILM'}</p>
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;

        // Trigger animations if the animation handler is globally available
        if (typeof window.triggerGlobalAnimations === 'function') {
            window.triggerGlobalAnimations();
        }

    } catch (err) {
        logBackend('Fetch Selected Works', 'ERROR', 'Could not retrieve featured portfolio', err);
        container.innerHTML = '<div class="col-span-full py-20 text-center text-primary/60 uppercase tracking-widest text-xs">Unable to load curated portfolio</div>';
    }
}

document.addEventListener('DOMContentLoaded', initHomeSelectedWorks);
