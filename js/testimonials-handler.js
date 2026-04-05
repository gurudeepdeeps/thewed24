/* testimonials-handler.js - Firebase Implementation */
import { getTestimonials, submitTestimonial, getFeaturedTestimonials } from './firestore.js';

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
    const homeContainer = document.getElementById('homeTestimonialsContainer');

    if (columns.length > 0) {
        try {
            const testimonials = await getTestimonials();
            logBackend('Fetch Testimonials', 'SUCCESS', `Loaded ${testimonials.length} reviews for Marquee`);

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
                        <div class="stars-preview text-primary text-[10px] mb-4">${'★'.repeat(item.rating || 5)}${'☆'.repeat(5 - (item.rating || 5))}</div>
                        <p class="card-body-text italic font-serif">"${item.review_text}"</p>
                        <div class="card-footer">
                            <div class="author-avatar">
                                <span class="material-icons">person</span>
                            </div>
                            <div class="author-info">
                                <span class="author-name-bold uppercase tracking-widest">${item.client_name}</span>
                            </div>
                        </div>
                    </div>
                `;
                columns[colIndex].innerHTML += card;
            });

            // Duplicate for infinite scroll effect
            columns.forEach(col => {
                const clones = col.innerHTML;
                col.innerHTML += clones;
            });

        } catch (err) {
            logBackend('Fetch Testimonials', 'ERROR', 'Could not load client stories', err);
        }
    }

    if (homeContainer) {
        try {
            const featured = await getFeaturedTestimonials();
            logBackend('Fetch Home Testimonials', 'SUCCESS', `Loaded ${featured.length} selected reviews for Home`);

            if (featured.length === 0) {
                homeContainer.innerHTML = '<div class="col-span-full py-12 text-center opacity-40 uppercase tracking-widest text-xs">No selected stories to display</div>';
                return;
            }

            // Only show 4 testimonials on the index page
            const itemsToShow = featured.slice(0, 4);

            homeContainer.innerHTML = itemsToShow.map(item => `
                <div class="testimonial-card-dribbble fade-in">
                    <div class="card-quote-icon">"</div>
                    <div class="stars-preview text-primary text-[10px] mb-4">${'★'.repeat(item.rating || 5)}${'☆'.repeat(5 - (item.rating || 5))}</div>
                    <p class="card-body-text italic font-serif">"${item.review_text}"</p>
                    <div class="card-footer">
                        <div class="author-avatar">
                            <span class="material-icons">person</span>
                        </div>
                        <div class="author-info">
                            <span class="author-name-bold uppercase tracking-widest">${item.client_name}</span>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            logBackend('Fetch Home Testimonials', 'ERROR', 'Could not load home stories', err);
        }
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
        review_text: document.getElementById('userStory').value,
        rating: ratingVal,
        star_rating: ratingVal
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
