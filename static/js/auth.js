// Authentication Logic for Login
(function() {
    'use strict';

    const BYPASS_AUTH = false;

    const loginMsg = document.getElementById('loginMsg');

    window.togglePw = function(fieldId, element) {
        const field = document.getElementById(fieldId);
        const icon = element.querySelector('i');

        if (field.type === 'password') {
            field.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            field.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    function showMessage(message, type) {
        if (loginMsg) {
            loginMsg.textContent = message;
            loginMsg.className = `form-msg ${type}`;
        }
    }

    // Main login handler
    window.handleLogin = async function() {
        const identifier = document.getElementById('loginIdentifier').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!identifier || !password) {
            showMessage('Please enter username and password', 'error');
            return;
        }

        // Show loading state
        const loginBtn = document.querySelector('.btn-primary');
        const originalText = loginBtn?.innerHTML;
        if (loginBtn) {
            loginBtn.innerHTML = '<span>Signing In...</span><i class="fas fa-spinner fa-spin"></i>';
            loginBtn.disabled = true;
        }

        try {
            // Call Django backend directly
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: identifier,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMessage('Login successful! Redirecting...', 'success');

                // Save session
                if (typeof SessionManager !== 'undefined') {
                    SessionManager.setSession(data.user);
                }

                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin-dashboard.html';
                    } else {
                        window.location.href = '/student-dashboard.html';
                    }
                }, 1000);
            } else {
                showMessage(data.message || 'Invalid credentials', 'error');
                if (loginBtn) {
                    loginBtn.innerHTML = originalText;
                    loginBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please make sure the server is running.', 'error');
            if (loginBtn) {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        }
    };

    // Enter key support
    document.addEventListener('DOMContentLoaded', () => {
        const passwordField = document.getElementById('loginPassword');
        const identifierField = document.getElementById('loginIdentifier');

        if (passwordField) {
            passwordField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }

        if (identifierField) {
            identifierField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }
    });

})();