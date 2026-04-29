(function() {
    'use strict';
    
    const BYPASS_AUTH = true;
    if (!BYPASS_AUTH && typeof SessionManager !== 'undefined' && !SessionManager.protectPage(['admin'])) {
        return;
    }
    
    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            if (typeof SessionManager !== 'undefined') {
                SessionManager.clearSession();
            }
            window.location.href = 'index.html';
        }
    }
    
    document.querySelector('.logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
})();