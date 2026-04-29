// Shared Application Utilities
(function() {
    'use strict';

    // ---------- DEVELOPMENT MODE ----------
    const DEV_MODE = true;

    // ---------- SESSION MANAGER (kept for session handling) ----------
    const SessionManager = {
        setSession(user) {
            const sessionData = {
                userId: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                studentId: user.studentId || null,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(AppConfig.STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
            return sessionData;
        },
        
        getSession() {
            const session = localStorage.getItem(AppConfig.STORAGE_KEYS.SESSION);
            return session ? JSON.parse(session) : null;
        },
        
        isAuthenticated() {
            return this.getSession() !== null;
        },
        
        isAdmin() {
            const session = this.getSession();
            return session && session.role === 'admin';
        },
        
        isStudent() {
            const session = this.getSession();
            return session && session.role === 'student';
        },
        
        clearSession() {
            localStorage.removeItem(AppConfig.STORAGE_KEYS.SESSION);
            localStorage.removeItem(AppConfig.STORAGE_KEYS.TOKEN);
        },
        
        redirectToDashboard() {
            const session = this.getSession();
            if (!session) {
                window.location.href = 'index.html';
                return;
            }
            
            if (session.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else if (session.role === 'student') {
                window.location.href = 'student-dashboard.html';
            }
        },
        
        protectPage(allowedRoles = []) {
            const session = this.getSession();
            
            if (!session) {
                window.location.href = 'index.html';
                return false;
            }
            
            if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
                this.redirectToDashboard();
                return false;
            }
            
            return true;
        }
    };

    window.SessionManager = SessionManager;

    // ---------- UTILITY FUNCTIONS ----------
    window.showToast = function(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut .3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    window.formatDate = function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Loading spinner
    window.showLoading = function(show) {
        let loader = document.getElementById('global-loader');
        if (!loader && show) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = '<div class="spinner"></div>';
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;';
            document.body.appendChild(loader);
        }
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    };

    // ---------- PAGE PROTECTION ----------
    document.addEventListener('DOMContentLoaded', () => {
        if (DEV_MODE) {
            console.warn('🔓 DEV MODE: Authentication checks bypassed');
            
            const session = SessionManager.getSession();
            if (!session) {
                // Create mock admin session for development
                SessionManager.setSession({
                    userId: 1001,
                    email: 'admin@mulungushi.edu',
                    role: 'admin',
                    firstName: 'Dev',
                    lastName: 'Admin',
                    studentId: null
                });
            }
            return;
        }
        
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || currentPage === '') {
            return;
        }
        
        const adminPages = ['admin-dashboard.html', 'applications.html', 'on-campus.html', 'off-campus.html', 'students.html', 'analytics.html', 'activity.html', 'settings.html'];
        const studentPages = ['student-dashboard.html'];
        
        const session = SessionManager.getSession();
        
        if (!session) {
            if (adminPages.includes(currentPage) || studentPages.includes(currentPage)) {
                window.location.href = 'index.html';
            }
            return;
        }
        
        if (adminPages.includes(currentPage) && session.role !== 'admin') {
            SessionManager.redirectToDashboard();
        }
        
        if (studentPages.includes(currentPage) && session.role !== 'student') {
            SessionManager.redirectToDashboard();
        }
    });

})();