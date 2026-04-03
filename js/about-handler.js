(function() {
    /**
     * about-handler.js - Public side logic for About page
     * Fetches and displays about profile and values from Supabase.
     */

    let sbClient = window.supabaseClient;

    if (!sbClient && window.supabase) {
        const SUPABASE_URL = 'https://lmtjqneyfebhnzvgdwui.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdGpxbmV5ZmViaG56dmdkd3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDkzNzEsImV4cCI6MjA4OTYyNTM3MX0._gemg7d30T3uFDXRJ2We9itBFncioGkQ93rQElqU2lM';
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

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

    async function initAbout() {
        if (window.aboutInitialized) return;
        window.aboutInitialized = true;

        if (!sbClient) return;

        console.log('[About] Initializing content...');

        try {
            // 1. Fetch Profile
            const { data: profile, error: pError } = await sbClient
                .from('about_profile')
                .select('*')
                .single();
            
            if (pError) {
                logBackend('Fetch About Profile', 'ERROR', 'Could not retrieve about profile', pError);
            } else if (profile) {
                logBackend('Fetch About Profile', 'SUCCESS', 'Profile loaded');
                if (document.getElementById('aboutNameText')) document.getElementById('aboutNameText').innerText = profile.name;
                if (document.getElementById('aboutSubNameText')) document.getElementById('aboutSubNameText').innerText = profile.sub_name;
                if (document.getElementById('aboutBioText')) {
                    document.getElementById('aboutBioText').innerHTML = `<p>${profile.bio.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
                }
                if (document.getElementById('aboutStat1ValText')) document.getElementById('aboutStat1ValText').innerText = profile.stat1_val;
                if (document.getElementById('aboutStat1LabelText')) document.getElementById('aboutStat1LabelText').innerText = profile.stat1_label;
                if (document.getElementById('aboutStat2ValText')) document.getElementById('aboutStat2ValText').innerText = profile.stat2_val;
                if (document.getElementById('aboutStat2LabelText')) document.getElementById('aboutStat2LabelText').innerText = profile.stat2_label;
                if (document.getElementById('aboutManifestoText')) {
                    // Split the quote to wrap last word or specific parts in span if we want, but let's keep it simple
                    document.getElementById('aboutManifestoText').innerText = profile.manifesto_quote;
                }
                if (profile.portrait_url && document.getElementById('aboutPortrait')) {
                    document.getElementById('aboutPortrait').src = profile.portrait_url;
                }
            }

            // 2. Fetch Values
            const { data: values, error: vError } = await sbClient
                .from('about_values')
                .select('*')
                .order('display_order', { ascending: true });
            
            if (vError) {
                logBackend('Fetch About Values', 'ERROR', 'Could not retrieve values list', vError);
            } else if (values && values.length > 0) {
                logBackend('Fetch About Values', 'SUCCESS', `Loaded ${values.length} values`);
                const grid = document.getElementById('aboutValuesGrid');
                if (grid) {
                    grid.innerHTML = values.map((val, index) => `
                        <div class="collection-card fade-in ${val.is_featured ? 'featured' : ''}" style="animation-delay: ${index * 0.1}s">
                            ${val.is_featured ? '<div class="featured-badge">Core Intent</div>' : ''}
                            <h4>${val.title}</h4>
                            <p class="description">${val.description}</p>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {
            logBackend('About Content Initialization', 'ERROR', 'Unexpected failure', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAbout);
    } else {
        initAbout();
    }
})();
