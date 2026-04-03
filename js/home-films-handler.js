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

    try {
        const films = await getFeaturedFilms();
        
        logBackend('Fetch Selected Works', 'SUCCESS', `Loaded ${films.length} featured films from Firestore`);

        if (!films || films.length === 0) {
            container.innerHTML = '<div class="col-span-full py-20 text-center opacity-40 uppercase tracking-widest text-xs">More cinematic works coming soon...</div>';
            return;
        }

        let html = '';
        films.forEach(film => {
            html += `
                <div class="video-item fade-in visible">
                    <div class="video-wrapper aspect-video bg-surface-container overflow-hidden relative">
                            <video 
                                src="${film.video_url || ''}" 
                                controls 
                                class="w-full h-full object-cover" 
                                poster="${film.cover_image_url || 'assets/cinematic-frame.jpg'}"
                                preload="metadata"
                                playsinline
                                onclick="if (event.offsetY < this.offsetHeight * 0.85) { event.preventDefault(); this.paused ? this.play() : this.pause(); }">
                            </video>
                    </div>
                    <div class="mt-8">
                        <h3 class="text-2xl italic font-serif">${film.couple_name || film.title}</h3>
                        <p class="text-xs tracking-widest uppercase text-primary opacity-60 mt-3">${film.category || 'FILM'}</p>
                    </div>
                </div>
            `;
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
