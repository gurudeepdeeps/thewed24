/* contact-handler.js - Web3Forms + Firebase Implementation */
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

                const formData = new FormData(form);
                const reasons = formData.getAll('reason');
                
                // Prepare object for Web3Forms (including reasons as a string)
                const web3Data = Object.fromEntries(formData);
                web3Data.reasons_list = reasons.join(', '); // Add explicit string for better email readability
                
                // Prepare data for Firestore (Admin Enquiries)
                const inquiryData = {
                    client_name: web3Data.name,
                    email: web3Data.email,
                    phone: web3Data.phone,
                    wedding_location: web3Data.wedding_location || 'NOT SPECIFIED',
                    wedding_date: web3Data.wedding_date || 'NOT SPECIFIED',
                    message: web3Data.message,
                    package_interest: reasons.length > 0 ? reasons.join(', ').toUpperCase() : 'GENERAL',
                    reasons: reasons,
                    category: 'INQUIRY',
                    submitted_at: new Date().toISOString()
                };

                logBackend('Submit Enquiry', 'INFO', `Dual Submission: Firestore + Web3Forms`, { web3Data, inquiryData });

                // Perform both submissions in parallel for speed
                const [web3Response, firestoreResult] = await Promise.all([
                    fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(web3Data)
                    }),
                    submitInquiry(inquiryData)
                ]);

                const web3Result = await web3Response.json();

                if (web3Response.status === 200 && firestoreResult.success) {
                    logBackend('Submit Enquiry', 'SUCCESS', 'Dual recording completed successfully');
                    // Success State
                    form.style.display = 'none';
                    successMsg.style.display = 'block';
                    successMsg.classList.add('fade-in');
                    form.reset();
                } else {
                    if (web3Response.status !== 200) throw new Error(web3Result.message || 'Web3Forms failed');
                    if (!firestoreResult.success) throw firestoreResult.error;
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
