// static/js/on-campus.js
(function() {
    'use strict';

    async function loadHostels() {
        try {
            const response = await fetch('/api/hostels/');
            const data = await response.json();

            if (data.success && data.hostels) {
                // Group hostels by location
                const upschool = data.hostels.filter(h => h.location === 'upschool');
                const downschool = data.hostels.filter(h => h.location === 'downschool');
                const freshers = data.hostels.filter(h => h.location === 'freshers');

                renderHostelGrid('upschoolGrid', upschool);
                renderHostelGrid('downschoolGrid', downschool);
                renderHostelGrid('freshersGrid', freshers);

                document.getElementById('upschoolCount').innerText = upschool.length + ' Hostels';
                document.getElementById('downschoolCount').innerText = downschool.length + ' Hostels';
                document.getElementById('freshersCount').innerText = freshers.length + ' Hostels';
            }
        } catch (error) {
            console.error('Error loading hostels:', error);
        }
    }

    function renderHostelGrid(gridId, hostels) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        if (hostels.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i><h3>No Hostels Found</h3></div>';
            return;
        }

        grid.innerHTML = hostels.map(h => `
            <div class="hostel-card">
                <div class="hostel-info">
                    <div class="hostel-name">${h.name}</div>
                    <div class="hostel-details">
                        <div class="detail-row"><i class="fas fa-venus-mars"></i> ${h.gender_policy}</div>
                        <div class="detail-row"><i class="fas fa-bed"></i> Capacity: ${h.total_capacity}</div>
                        <div class="detail-row"><i class="fas fa-user"></i> Occupied: ${h.current_occupancy}</div>
                    </div>
                    <div class="hostel-actions">
                        <button class="hostel-action-btn edit" onclick="editHostel(${h.id})">Edit</button>
                        <button class="hostel-action-btn delete" onclick="deleteHostel(${h.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.editHostel = function(id) {
        alert('Edit hostel ID: ' + id);
    };

    window.deleteHostel = function(id) {
        if (confirm('Delete this hostel?')) {
            alert('Delete hostel ID: ' + id);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadHostels();
    });
})();