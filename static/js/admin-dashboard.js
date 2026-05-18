// static/js/admin-dashboard.js
(function() {
    'use strict';

    async function loadDashboard() {
        try {
            // Fetch dashboard stats with cache-busting
            const response = await fetch('/api/dashboard/stats/?t=' + Date.now());
            const data = await response.json();
            console.log('Dashboard data:', data);

            if (data.success) {
                // Update KPI cards
                const totalStudents = document.getElementById('totalStudents');
                const accommodatedCount = document.getElementById('accommodatedCount');
                const pendingApps = document.getElementById('pendingApps');
                const approvedApps = document.getElementById('approvedApps');

                if (totalStudents) totalStudents.innerText = data.total_students || 0;
                if (accommodatedCount) accommodatedCount.innerText = data.accommodated_students || 0;
                if (pendingApps) pendingApps.innerText = data.pending_applications || 0;
                if (approvedApps) approvedApps.innerText = data.approved_applications || 0;

                // Update Rooms & Hostels section
                const totalOnCampusRooms = document.getElementById('totalOnCampusRooms');
                const availableOnCampusRooms = document.getElementById('availableOnCampusRooms');
                const takenOnCampusRooms = document.getElementById('takenOnCampusRooms');
                const totalOffCampusHouses = document.getElementById('totalOffCampusHouses');
                const availableOffCampusBeds = document.getElementById('availableOffCampusBeds');
                const takenOffCampusBeds = document.getElementById('takenOffCampusBeds');

                if (totalOnCampusRooms) totalOnCampusRooms.innerText = data.on_campus?.total_rooms || 0;
                if (availableOnCampusRooms) availableOnCampusRooms.innerText = data.on_campus?.available || 0;
                if (takenOnCampusRooms) takenOnCampusRooms.innerText = data.on_campus?.taken || 0;
                if (totalOffCampusHouses) totalOffCampusHouses.innerText = data.off_campus?.total_houses || 0;
                if (availableOffCampusBeds) availableOffCampusBeds.innerText = data.off_campus?.available || 0;
                if (takenOffCampusBeds) takenOffCampusBeds.innerText = data.off_campus?.taken || 0;
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async function loadRecentStudents() {
        try {
            const response = await fetch('/api/students/?t=' + Date.now());
            const data = await response.json();
            console.log('Students data:', data);

            if (data.success && data.students) {
                const tbody = document.getElementById('recentStudentsBody');
                if (tbody && data.students.length > 0) {
                    tbody.innerHTML = data.students.slice(0, 5).map(s => `
                        <tr>
                            <td>${s.id || 'N/A'}</td>
                            <td>${s.student_id || 'N/A'}</td>
                            <td>${s.first_name || ''} ${s.last_name || ''}</td>
                            <td>${s.email || 'N/A'}</td>
                            <td>${s.program || 'N/A'}</td>
                            <td><i class="fas fa-eye action-icon" onclick="viewStudent(${s.id})" style="cursor:pointer; color:#3b82f6;"></i></td>
                        </tr>
                    `).join('');
                } else if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;">No students found</td></tr>';
                }
            }
        } catch (error) {
            console.error('Error loading students:', error);
            const tbody = document.getElementById('recentStudentsBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;">Error loading students</td></tr>';
            }
        }
    }

    function viewStudent(id) {
        alert('View student ID: ' + id);
    }

    // Make refresh function available globally
    window.refreshDashboard = function() {
        console.log('Manual refresh triggered');
        loadDashboard();
        loadRecentStudents();
    };

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Admin dashboard initialized');
        loadDashboard();
        loadRecentStudents();

        // Refresh every 15 seconds
        setInterval(() => {
            console.log('Auto-refreshing dashboard...');
            loadDashboard();
            loadRecentStudents();
        }, 15000);
    });

    // Also refresh when page becomes visible (coming back from another tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('Page visible - refreshing');
            loadDashboard();
            loadRecentStudents();
        }
    });

    window.viewStudent = viewStudent;
})();