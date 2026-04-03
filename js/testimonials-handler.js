/* testimonials-handler.js - Firebase Implementation */
import { getTestimonials, submitTestimonial } from './firestore.js';

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
    const columns = document.querySelectorAll('.marquee-col');
    if (!columns || columns.length === 0) return;

    try {
        const testimonials = await getTestimonials();
        logBackend('Fetch Testimonials', 'SUCCESS', `Loaded ${testimonials.length} reviews from Firestore`);

        if (!testimonials || testimonials.length === 0) {
            columns[0].innerHTML = '<div class="testimonial-card-dribbble opacity-30 text-center uppercase tracking-widest text-[9px] py-12">No stories yet...</div>';
            return;
        }

        // Clear columns
        columns.forEach(col => col.innerHTML = '');

        // Distribute testimonials across 3 columns
        testimonials.forEach((item, index) => {
            const colIndex = index % columns.length;
            const card = `
                <div class="testimonial-card-dribbble">
                    <div class="card-quote-icon">"</div>
                    <p class="card-body-text italic font-serif">"${item.testimonial_text || item.review_text}"</p>
                    <div class="card-footer">
                        <div class="author-avatar">
                            <span class="material-icons">person</span>
                        </div>
                        <div class="author-info">
                            <span class="author-name-bold uppercase tracking-widest">${item.couple_name || item.client_name}</span>
                            <span class="author-title-sub uppercase tracking-tighter text-[9px] opacity-40">${item.location || 'Wedding Story'}</span>
                        </div>
                    </div>
                </div>
            `;
            columns[colIndex].innerHTML += card;
        });

        // Duplicate for infinite scroll effect (since it's a vertical marquee)
        columns.forEach(col => {
            if (col.children.length > 0) {
                const clones = col.innerHTML;
                col.innerHTML += clones;
            }
        });

        if (typeof window.triggerGlobalAnimations === 'function') {
            window.triggerGlobalAnimations();
        }

    } catch (err) {
        logBackend('Fetch Testimonials', 'ERROR', 'Could not load client stories', err);
        columns[0].innerHTML = '<div class="col-span-full py-20 text-center text-primary/60 uppercase tracking-widest text-xs">Unable to load stories</div>';
    }
}

async function handleSubmission(e) {
    e.preventDefault();
    const form = e.target;
    const formContent = document.getElementById('formContent');
    const successMsg = document.getElementById('successMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    const ratingVal = parseInt(form.querySelector('input[name="rating"]:checked')?.value || '5');
    const data = {
        client_name: document.getElementById('userName').value,
        couple_name: document.getElementById('userName').value,
        review_text: document.getElementById('userStory').value,
        testimonial_text: document.getElementById('userStory').value,
        rating: ratingVal,
        star_rating: ratingVal,
        location: 'Wedding Story'
    };

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = 'SENDING...';
        logBackend('Submit Testimonial', 'INFO', `Sending to Firestore content for ${data.client_name}`);

        const result = await submitTestimonial(data);
        if (result.success) {
            logBackend('Submit Testimonial', 'SUCCESS', 'Review submitted for approval');
            formContent.style.opacity = '0';
            setTimeout(() => {
                formContent.style.display = 'none';
                successMsg.style.display = 'block';
                successMsg.classList.add('fade-in');
            }, 700);
        } else {
            throw result.error;
        }
    } catch (err) {
        logBackend('Submit Testimonial', 'ERROR', 'Submission failed', err);
        alert('Could not submit. Please try again: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Perspective';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTestimonials();
    const form = document.getElementById('testimonialForm');
    if (form) form.addEventListener('submit', handleSubmission);
});
