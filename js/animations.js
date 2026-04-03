/* animations.js - Intersection Observer for Reveal Animations */

document.addEventListener('DOMContentLoaded', () => {
    const fadeElems = document.querySelectorAll('.fade-in');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    fadeElems.forEach(elem => {
        observer.observe(elem);
    });

    // Mobile Menu Toggle
    const menuOpen = document.getElementById('menu-open');
    const menuClose = document.getElementById('menu-close');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuOpen && menuClose && mobileMenu) {
        menuOpen.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        menuClose.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        });

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // Contact Form Submission success message handler
    const contactForm = document.getElementById('inquiry-form');
    const successMsg = document.getElementById('form-success-msg');

    if (contactForm && successMsg) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            btn.textContent = 'Sending...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            setTimeout(() => {
                contactForm.style.display = 'none';
                successMsg.style.display = 'block';
                successMsg.classList.add('fade-in');
                setTimeout(() => { successMsg.classList.add('visible'); }, 50);
            }, 1000); // simulate short network delay
        });
    }
});
