/**
 * preloader.js - Advanced Loading Narrative for The Wed 24
 * Ensures a cinematic experience by waiting for key visual assets.
 */

class LuxuryPreloader {
    constructor() {
        this.preloader = document.getElementById('preloader');
        this.progressBar = document.querySelector('.preloader-bar');
        this.statusText = document.querySelector('.preloader-status');
        
        this.startTime = Date.now();
        this.minDisplayTime = 2000; // 2 seconds minimum to show the branding
        this.maxWaitTime = 10000;   // 10 seconds timeout
        
        this.assetsToTrack = [];
        this.loadedCount = 0;
        this.isFinished = false;

        this.init();
    }

    init() {
        if (!this.preloader) return;

        console.log("Preloader: Narrative initialized...");

        // 1. Initial critical assets (always tracked)
        this.trackStaticAssets();

        // 2. Watch for dynamic content injection
        this.setupObservers();

        // 3. Set a safety timeout
        setTimeout(() => this.finish(), this.maxWaitTime);

        // 4. Start progress animation loop
        this.updateProgress();
    }

    trackStaticAssets() {
        // Hero Image
        const hero = document.querySelector('.hero-image');
        if (hero) this.addAsset(hero);

        // About section image (usually empty src initially, we wait for it to get one)
        const aboutImg = document.getElementById('homeAboutImage');
        if (aboutImg) {
            // We'll track it once it has a src
            const observer = new MutationObserver(() => {
                if (aboutImg.src && !aboutImg.src.includes('data:')) {
                    this.addAsset(aboutImg);
                    observer.disconnect();
                }
            });
            observer.observe(aboutImg, { attributes: true, attributeFilter: ['src'] });
        }
    }

    setupObservers() {
        const containers = [
            'homeSelectedWorksContainer',
            'homeAlbumsContainer'
        ];

        containers.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check for images in the new content
                            const imgs = node.querySelectorAll('img');
                            imgs.forEach(img => this.addAsset(img));
                            
                            // Check for videos (posters)
                            const videos = node.querySelectorAll('video[poster]');
                            videos.forEach(video => {
                                if (video.poster) {
                                    const img = new Image();
                                    img.src = video.poster;
                                    this.addAsset(img);
                                }
                            });
                        }
                    });
                });
            });

            observer.observe(el, { childList: true, subtree: true });
        });
    }

    addAsset(img) {
        if (this.assetsToTrack.includes(img)) return;
        
        this.assetsToTrack.push(img);
        
        const onLoaded = () => {
            this.loadedCount++;
            this.checkCompletion();
        };

        if (img.complete) {
            onLoaded();
        } else {
            img.addEventListener('load', onLoaded);
            img.addEventListener('error', onLoaded); // Error counts as loaded for progress
        }
    }

    updateProgress() {
        if (this.isFinished) return;

        const total = Math.max(this.assetsToTrack.length, 5); // Fallback to 5 assets if none found
        const percentage = Math.min((this.loadedCount / total) * 100, 95); // Capped at 95 until checkCompletion
        
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }
        
        requestAnimationFrame(() => this.updateProgress());
    }

    checkCompletion() {
        const total = this.assetsToTrack.length;
        if (total > 0 && this.loadedCount >= total) {
            this.finish();
        }
    }

    finish() {
        if (this.isFinished) return;
        
        const elapsedTime = Date.now() - this.startTime;
        const delay = Math.max(0, this.minDisplayTime - elapsedTime);

        setTimeout(() => {
            if (this.isFinished) return;
            this.isFinished = true;

            if (this.progressBar) this.progressBar.style.width = '100%';
            if (this.statusText) this.statusText.textContent = 'Curated narratives ready';

            setTimeout(() => {
                this.preloader.classList.add('fade-out');
                
                // Extra cinematic effects once page is visible
                document.body.classList.add('page-ready');
                
                setTimeout(() => {
                    this.preloader.remove(); // Clean up DOM
                }, 1000);
            }, 400);

        }, delay);
    }
}

// Instantiate preloader
document.addEventListener('DOMContentLoaded', () => {
    window.luxuryPreloader = new LuxuryPreloader();
});
