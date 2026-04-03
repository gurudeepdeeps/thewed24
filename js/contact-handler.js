/* contact-handler.js - Firebase Implementation */
import { submitInquiry } from './firestore.js';

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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('inquiry-form');
    const successMsg = document.getElementById('form-success-msg');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;

            try {
                submitBtn.disabled = true;
                submitBtn.innerText = "SENDING...";

                // Collect Form Data
                const fullName = form.querySelector('input[placeholder="Enter your Name"]').value.trim();
                const email = form.querySelector('input[type="email"]').value.trim();
                const phone = form.querySelector('input[type="tel"]').value.trim();
                const message = form.querySelector('textarea').value.trim();

                // Collect Checkboxes (Reasons)
                const reasonCheckboxes = form.querySelectorAll('input[name="reason"]:checked');
                const reasons = Array.from(reasonCheckboxes).map(cb => cb.value);

                const inquiryData = {
                    client_name: fullName,
                    email: email,
                    phone: phone,
                    message: message,
                    package_interest: reasons.length > 0 ? reasons.join(', ').toUpperCase() : 'GENERAL',
                    reasons: reasons
                };

                // Save to Firestore
                logBackend('Submit Enquiry', 'INFO', `Submitting enquiry for ${fullName}`, inquiryData);
                const result = await submitInquiry(inquiryData);

                if (result.success) {
                    logBackend('Submit Enquiry', 'SUCCESS', 'Enquiry recorded in Firestore');
                    // Success State
                    form.style.display = 'none';
                    successMsg.style.display = 'block';
                    successMsg.classList.add('fade-in');
                } else {
                    throw result.error;
                }

            } catch (err) {
                logBackend('Submit Enquiry', 'ERROR', 'Could not complete enquiry submission', err);
                alert(`Sorry, there was an error: ${err.message}. Please try again or contact us via WhatsApp.`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        });
    }
});
