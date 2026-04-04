/* login.js - Firebase Implementation */
import { loginAdmin, checkAuth } from './auth.js';

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

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if(!email || !password) return;

            loginError.style.display = 'none';
            loginSubmitBtn.innerText = 'AUTHENTICATING...';
            loginSubmitBtn.disabled = true;

            try {
                const result = await loginAdmin(email, password);

                if (result.success) {
                    logBackend('Sign In', 'SUCCESS', `User ${email} authenticated successfully via Firebase`);
                    loginSubmitBtn.innerText = 'ACCESS GRANTED';
                    setTimeout(() => {
                        window.location.href = 'admin';
                    }, 500);
                } else {
                    logBackend('Sign In', 'ERROR', `Failed login attempt for ${email}`, result.error);
                    loginError.innerText = result.error.message;
                    loginError.style.display = 'block';
                    loginSubmitBtn.innerText = 'AUTHENTICATE';
                    loginSubmitBtn.disabled = false;
                }
            } catch (err) {
                logBackend('Sign In', 'ERROR', 'Unexpected error during authentication', err);
                loginError.innerText = "Error: " + err.message;
                loginError.style.display = 'block';
                loginSubmitBtn.innerText = 'AUTHENTICATE';
                loginSubmitBtn.disabled = false;
            }
        });
    }

    // Check if already logged in
    checkAuth((user) => {
        if (user) {
            logBackend('Session Check', 'SUCCESS', `Active Firebase session found for ${user.email}`);
            window.location.href = 'admin';
        } else {
            logBackend('Session Check', 'INFO', 'No active Firebase session found');
        }
    });
});
