/* testimonials-handler.js - Firebase Implementation */
import { getTestimonials } from './firestore.js';

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

async function initTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    try {
        const testimonials = await getTestimonials();
        
        logBackend('Fetch Testimonials', 'SUCCESS', `Loaded ${testimonials.length} reviews from Firestore`);

        if (!testimonials || testimonials.length === 0) {
            container.innerHTML = '<div class="col-span-full py-20 text-center opacity-40 uppercase tracking-widest text-xs">Testimonials are being processed...</div>';
            return;
        }

        let html = '';
        testimonials.forEach(item => {
            html += `
                <div class="p-12 bg-surface border border-outline fade-in visible">
                    <div class="flex gap-1 mb-8 text-primary">
                        ${Array(item.star_rating || 5).fill('<svg class="w-4 h-4 fill-current"><use href="assets/icons/sprite.svg#star"></use></svg>').join('')}
                    </div>
                    <p class="text-xl mb-8 opacity-80 leading-relaxed italic font-serif">"${item.testimonial_text}"</p>
                    <div>
                        <p class="font-medium tracking-widest uppercase text-xs">${item.couple_name}</p>
                        <p class="text-[10px] opacity-40 uppercase tracking-[0.2em] mt-2">${item.location}</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        if (typeof window.triggerGlobalAnimations === 'function') {
            window.triggerGlobalAnimations();
        }

    } catch (err) {
        logBackend('Fetch Testimonials', 'ERROR', 'Could not load client stories', err);
        container.innerHTML = '<div class="col-span-full py-20 text-center text-primary/60 uppercase tracking-widest text-xs">Unable to load stories</div>';
    }
}

document.addEventListener('DOMContentLoaded', initTestimonials);
