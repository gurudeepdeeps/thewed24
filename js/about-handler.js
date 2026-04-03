import { getAboutProfile } from './firestore.js';

/**
 * about-handler.js - Public side logic for About page
 * Fetches and displays about profile and values from Firebase.
 */

async function initAbout() {
    if (window.aboutInitialized) return;
    window.aboutInitialized = true;

    console.log('[About] Initializing content...');

    try {
        // 1. Fetch Profile
        const profile = await getAboutProfile();
        
        if (profile) {
            if (document.getElementById('aboutNameText')) document.getElementById('aboutNameText').innerText = profile.name || '';
            if (document.getElementById('aboutSubNameText')) document.getElementById('aboutSubNameText').innerText = profile.sub_name || '';
            if (document.getElementById('aboutBioText') && profile.bio) {
                document.getElementById('aboutBioText').innerHTML = `<p>${profile.bio.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
            }
            if (document.getElementById('aboutStat1ValText')) document.getElementById('aboutStat1ValText').innerText = profile.stat1_val || '';
            if (document.getElementById('aboutStat1LabelText')) document.getElementById('aboutStat1LabelText').innerText = profile.stat1_label || '';
            if (document.getElementById('aboutStat2ValText')) document.getElementById('aboutStat2ValText').innerText = profile.stat2_val || '';
            if (document.getElementById('aboutStat2LabelText')) document.getElementById('aboutStat2LabelText').innerText = profile.stat2_label || '';
            if (document.getElementById('aboutManifestoText')) {
                document.getElementById('aboutManifestoText').innerText = profile.manifesto_quote || '';
            }
            // If there's a portrait_url, set it directly
            if (profile.portrait_url && document.getElementById('aboutPortrait')) {
                document.getElementById('aboutPortrait').src = profile.portrait_url;
            }
        }

    } catch (err) {
        console.error('About Content Initialization ERROR', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAbout);
} else {
    initAbout();
}
