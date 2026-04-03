/* packages-handler.js - Firebase Implementation */
import { getPackages } from './firestore.js';

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

async function initPackages() {
    const container = document.getElementById('packagesContainer');
    if (!container) return;

    try {
        const packages = await getPackages();
        
        logBackend('Fetch Packages', 'SUCCESS', `Loaded ${packages.length} options from Firestore`);

        if (!packages || packages.length === 0) {
            container.innerHTML = '<div class="col-span-full py-20 text-center opacity-40 uppercase tracking-widest text-xs">Packages are being updated...</div>';
            return;
        }

        let html = '';
        packages.forEach(pkg => {
            const inclusions = pkg.inclusions ? pkg.inclusions.map(inc => `<li class="flex items-center gap-4 opacity-70">
                <span class="w-1.5 h-px bg-primary opacity-40"></span>
                ${inc}
            </li>`).join('') : '';

            html += `
                <div class="package-item p-12 bg-surface border border-outline relative fade-in group visible">
                    ${pkg.badge ? `<div class="absolute top-0 right-0 bg-primary/10 px-4 py-1 text-[10px] tracking-widest uppercase text-primary font-medium">${pkg.badge}</div>` : ''}
                    <h3 class="text-3xl italic font-serif mb-3">${pkg.name}</h3>
                    <p class="text-xs tracking-widest uppercase text-primary mb-12">${pkg.price_label || ''}</p>
                    <ul class="space-y-6 text-sm mb-16 h-[200px] overflow-y-auto custom-scrollbar">
                        ${inclusions}
                    </ul>
                    <a href="https://wa.me/918073522194?text=${encodeURIComponent(pkg.whatsapp_message || 'Hello! I am interested in your services.')}" target="_blank"
                       class="btn btn-outline w-full text-center group-hover:bg-primary group-hover:text-black">
                        Enquire Now
                    </a>
                </div>
            `;
        });

        container.innerHTML = html;

        if (typeof window.triggerGlobalAnimations === 'function') {
            window.triggerGlobalAnimations();
        }

    } catch (err) {
        logBackend('Fetch Packages', 'ERROR', 'Could not retrieve offerings', err);
        container.innerHTML = '<div class="col-span-full py-20 text-center text-primary/60 uppercase tracking-widest text-xs">Unable to load packages</div>';
    }
}

document.addEventListener('DOMContentLoaded', initPackages);
