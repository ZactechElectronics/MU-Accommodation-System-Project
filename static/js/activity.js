// static/js/activity.js
(function() {
    'use strict';

    let currentFilter = 'all';
    let activitiesData = [];

    function getTimestamp() {
        return new Date().getTime();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(timestamp) {
        if (!timestamp) return 'N/A';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch(e) {
            return timestamp;
        }
    }

    function getActionDetails(action) {
        const actionLower = (action || '').toLowerCase();

        if (actionLower.includes('login')) {
            return { class: 'login', icon: 'fa-sign-in-alt', label: 'LOGIN' };
        } else if (actionLower.includes('logout')) {
            return { class: 'logout', icon: 'fa-sign-out-alt', label: 'LOGOUT' };
        } else if (actionLower.includes('approve')) {
            return { class: 'approve', icon: 'fa-check-circle', label: 'APPROVE' };
        } else if (actionLower.includes('reject')) {
            return { class: 'reject', icon: 'fa-times-circle', label: 'REJECT' };
        } else if (actionLower.includes('create')) {
            return { class: 'create', icon: 'fa-plus-circle', label: 'CREATE' };
        } else if (actionLower.includes('delete')) {
            return { class: 'delete', icon: 'fa-trash-alt', label: 'DELETE' };
        } else if (actionLower.includes('update') || actionLower.includes('edit')) {
            return { class: 'update', icon: 'fa-edit', label: 'UPDATE' };
        } else {
            return { class: 'default', icon: 'fa-info-circle', label: (action || 'INFO').toUpperCase() };
        }
    }

    async function loadActivities() {
        try {
            const response = await fetch(`/api/activities/?t=${getTimestamp()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            const data = await response.json();

            console.log('Activities loaded:', data);

            if (data.success && data.logs) {
                activitiesData = data.logs;
            } else if (Array.isArray(data)) {
                activitiesData = data;
            } else {
                activitiesData = [];
            }

            renderActivities();
        } catch (error) {
            console.error('Error loading activities:', error);
            const container = document.getElementById('activityBody');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading activities</p>
                        <small>${error.message}</small>
                    </div>
                `;
            }
        }
    }

    function renderActivities() {
        const container = document.getElementById('activityBody');
        if (!container) return;

        let filtered = activitiesData;
        if (currentFilter !== 'all') {
            filtered = activitiesData.filter(log => {
                const action = (log.action || '').toLowerCase();
                return action.includes(currentFilter.toLowerCase());
            });
        }

        if (!filtered || filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No activities recorded yet</p>
                    <small>Activities will appear here as users interact with the system</small>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        filtered.forEach(log => {
            const action = log.action || log.action_type || 'info';
            const user = log.user || log.username || log.user_full_name || 'SYSTEM';
            const description = log.description || `${action} operation performed`;
            const timestamp = log.timestamp || log.created_at || new Date().toISOString();
            const entityInfo = log.entity_type && log.entity_type !== 'System' ? ` · ${log.entity_type}` : '';

            const details = getActionDetails(action);

            const item = document.createElement('div');
            item.className = `activity-item ${details.class}`;
            item.innerHTML = `
                <div class="activity-icon ${details.class}">
                    <i class="fas ${details.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-action ${details.class}">
                        ${details.label}
                        <span class="activity-user">(${escapeHtml(user)}${escapeHtml(entityInfo)})</span>
                    </div>
                    <div class="activity-desc">${escapeHtml(description)}</div>
                    <div class="activity-time">${escapeHtml(formatTime(timestamp))}</div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    function filterActivities(filter) {
        currentFilter = filter;

        // Update active button state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active-filter');
            } else {
                btn.classList.remove('active-filter');
            }
        });

        renderActivities();
    }

    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            fetch('/api/auth/logout/', { method: 'POST' })
                .then(() => { window.location.href = '/'; })
                .catch(() => { window.location.href = '/'; });
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Activity monitor initializing...');

        // Set up logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

        // Set up refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadActivities();
            });
        }

        // Set up filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterActivities(btn.getAttribute('data-filter'));
            });
        });

        // Load activities
        loadActivities();

        // Auto-refresh every 10 seconds
        setInterval(loadActivities, 10000);

        // Refresh when page becomes visible
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                loadActivities();
            }
        });
    });
})();