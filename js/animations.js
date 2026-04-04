/* animations.js - Intersection Observer for Reveal Animations & Premium Interactions */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Reveal Animations with Staggered Support
    const fadeElems = document.querySelectorAll('.fade-in');
    
    // Check for containers that should have staggered children
    const staggerContainers = document.querySelectorAll('.stagger-container');
    staggerContainers.forEach(container => {
        const children = container.querySelectorAll('.fade-in');
        children.forEach((child, index) => {
            child.style.transitionDelay = `${index * 0.15}s`;
        });
    });

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

    // 2. Mobile Menu Toggle
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

    // 3. Hero Parallax Effect (Subtle)
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        window.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            heroContent.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    }

    // 4. Contact Form Submission Handling
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
