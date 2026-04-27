/* home-about-handler.js - Firebase Implementation */
import { getAboutProfile } from './firestore.js';

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

async function initHomeAbout() {
    console.log('[Home About] Starting sync...');

    try {
        const imgEl = document.getElementById('homeAboutImage');
        const bioEl = document.getElementById('homeAboutBio');
        
        // Add skeleton loaders
        if (imgEl) {
            imgEl.parentElement.classList.add('skeleton');
            imgEl.style.opacity = '0';
        }
        if (bioEl) {
            bioEl.innerHTML = `
                <div class="skeleton h-4 w-full mb-2"></div>
                <div class="skeleton h-4 w-full mb-2"></div>
                <div class="skeleton h-4 w-3/4 mb-4"></div>
                <div class="skeleton h-4 w-full mb-2"></div>
                <div class="skeleton h-4 w-5/6"></div>
            `;
        }

        const profile = await getAboutProfile();
        
        if (profile) {
            logBackend('Fetch Home Profile', 'SUCCESS', 'Profile loaded for home page display from Firestore');
            
            const nameEl = document.getElementById('homeAboutName');
            if (nameEl) nameEl.innerText = profile.name;
            
            const subNameEl = document.getElementById('homeAboutSubName');
            if (subNameEl) subNameEl.innerText = profile.sub_name;
            
            const bioEl = document.getElementById('homeAboutBio');
            if (bioEl) {
                const bioHtml = profile.bio
                    .split('\n\n')
                    .filter(p => p.trim())
                    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
                    .join('');
                bioEl.innerHTML = bioHtml;
            }

            const s1v = document.getElementById('homeAboutStat1Val');
            const s1l = document.getElementById('homeAboutStat1Label');
            if (s1v && profile.stat1_val) s1v.innerText = profile.stat1_val;
            if (s1l && profile.stat1_label) s1l.innerText = profile.stat1_label;
            
            const s2v = document.getElementById('homeAboutStat2Val');
            const s2l = document.getElementById('homeAboutStat2Label');
            if (s2v && profile.stat2_val) s2v.innerText = profile.stat2_val;
            if (s2l && profile.stat2_label) s2l.innerText = profile.stat2_label;

            const imgEl = document.getElementById('homeAboutImage');
            if (imgEl && profile.portrait_url) {
                imgEl.src = profile.portrait_url;
                imgEl.onload = () => {
                    imgEl.parentElement.classList.remove('skeleton');
                    imgEl.style.opacity = '1';
                    imgEl.style.transition = 'opacity 0.5s ease';
                };
            }
            
            console.log('[Home About] UI Synced successfully.');
        }
    } catch (err) {
        logBackend('Home About Context Initialization', 'ERROR', 'Unexpected handler failure', err);
    }
}

document.addEventListener('DOMContentLoaded', initHomeAbout);
