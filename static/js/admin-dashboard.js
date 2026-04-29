// Admin Dashboard - Real Data from API
(function() {
    'use strict';

    // Function to fetch and update dashboard stats
    async function loadDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats/');
            const data = await response.json();

            console.log('Dashboard data loaded:', data);

            // Update KPI Cards
            document.getElementById('totalStudents').textContent = data.total_students || 0;
            document.getElementById('accommodatedCount').textContent = data.accommodated_students || 0;
            document.getElementById('pendingApps').textContent = data.pending_applications || 0;
            document.getElementById('approvedApps').textContent = data.approved_applications || 0;

            // Update Rooms & Hostels section
            document.getElementById('totalOnCampusRooms').textContent = data.on_campus?.total_rooms || 0;
            document.getElementById('availableOnCampusRooms').textContent = data.on_campus?.available || 0;
            document.getElementById('takenOnCampusRooms').textContent = data.on_campus?.taken || 0;

            document.getElementById('totalOffCampusHouses').textContent = data.off_campus?.total_houses || 0;
            document.getElementById('availableOffCampusBeds').textContent = data.off_campus?.available || 0;
            document.getElementById('takenOffCampusBeds').textContent = data.off_campus?.taken || 0;

            // Also update analytics page if it exists
            if (document.getElementById('totalCapacity')) {
                const totalCapacity = (data.on_campus?.total_capacity || 0) + (data.off_campus?.total_capacity || 0);
                const currentOccupancy = (data.on_campus?.taken || 0) + (data.off_campus?.taken || 0);

                document.getElementById('totalCapacity').textContent = totalCapacity;
                document.getElementById('currentOccupancy').textContent = currentOccupancy;
                document.getElementById('waitlistCount').textContent = data.pending_applications || 0;

                // Update occupancy rates
                const onCampusRate = data.on_campus?.total_capacity > 0 ?
                    Math.round((data.on_campus.taken / data.on_campus.total_capacity) * 100) : 0;
                const offCampusRate = data.off_campus?.total_capacity > 0 ?
                    Math.round((data.off_campus.taken / data.off_campus.total_capacity) * 100) : 0;

                const onFill = document.getElementById('onCampusOccupancyFill');
                const onRate = document.getElementById('onCampusOccupancyRate');
                const offFill = document.getElementById('offCampusOccupancyFill');
                const offRate = document.getElementById('offCampusOccupancyRate');

                if (onFill) onFill.style.width = `${onCampusRate}%`;
                if (onRate) onRate.textContent = `${onCampusRate}%`;
                if (offFill) offFill.style.width = `${offCampusRate}%`;
                if (offRate) offRate.textContent = `${offCampusRate}%`;
            }

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showToast('Failed to load dashboard data', 'error');
        }
    }

    // Load students
    async function loadStudents() {
        try {
            const response = await fetch('/api/students/');
            const students = await response.json();

            const recentBody = document.getElementById('recentStudentsBody');
            const allBody = document.getElementById('allStudentsBody');

            if (recentBody) {
                const recentStudents = students.slice(0, 5);
                recentBody.innerHTML = recentStudents.map(s => `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.student_id || 'N/A'}</td>
                        <td>${s.first_name} ${s.last_name}</td>
                        <td>${s.email}</td>
                        <td><span class="status-badge active">Active</span></td>
                        <td><i class="fas fa-eye action-icon" onclick="viewStudent(${s.id})"></i></td>
                    </tr>
                `).join('');
            }

            if (allBody) {
                allBody.innerHTML = students.map(s => `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.student_id || 'N/A'}</td>
                        <td>${s.first_name} ${s.last_name}</td>
                        <td>${s.email}</td>
                        <td>${s.program || 'N/A'}</td>
                        <td><span class="status-badge active">Active</span></td>
                        <td>-</td>
                        <td><i class="fas fa-eye action-icon" onclick="viewStudent(${s.id})"></i></td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    // Load applications
    async function loadApplications() {
        try {
            const response = await fetch('/api/applications/');
            const apps = await response.json();

            // Update application stats if on applications page
            if (document.getElementById('totalApplications')) {
                document.getElementById('totalApplications').textContent = apps.length;
                document.getElementById('pendingApplications').textContent = apps.filter(a => a.status === 'pending').length;
                document.getElementById('approvedApplications').textContent = apps.filter(a => a.status === 'approved').length;
                document.getElementById('rejectedApplications').textContent = apps.filter(a => a.status === 'rejected').length;
            }
        } catch (error) {
            console.error('Error loading applications:', error);
        }
    }

    // Toast message
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }
    }

    // Logout function
    async function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                await fetch('/api/auth/logout/', { method: 'POST' });
            } catch(e) {}
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    }

    // Initialize everything
    async function init() {
        await loadDashboardStats();
        await loadStudents();
        await loadApplications();

        // Setup logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

        // Setup quick action buttons
        const addHostelBtn = document.getElementById('quickAddHostelRoom');
        if (addHostelBtn) {
            addHostelBtn.addEventListener('click', () => {
                window.location.href = '/on-campus.html';
            });
        }

        const processAppsBtn = document.getElementById('quickProcessApp');
        if (processAppsBtn) {
            processAppsBtn.addEventListener('click', () => {
                window.location.href = '/applications.html';
            });
        }

        // Refresh every 30 seconds
        setInterval(loadDashboardStats, 30000);
    }

    // Make functions global for onclick handlers
    window.viewStudent = function(id) {
        showToast(`View student ${id}`, 'info');
    };

    window.revokeAccommodation = function(id) {
        showToast(`Revoke accommodation for student ${id}`, 'warning');
    };

    // Start the app
    init();
})();