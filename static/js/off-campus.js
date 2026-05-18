// static/js/off-campus.js
(function() {
    'use strict';

    async function loadBoardingHouses() {
        try {
            const response = await fetch('/api/off-campus/');
            const data = await response.json();

            if (data.success && data.houses) {
                const grid = document.getElementById('boardingHousesGrid');
                if (grid) {
                    if (data.houses.length === 0) {
                        grid.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><h3>No Boarding Houses Found</h3></div>';
                    } else {
                        grid.innerHTML = data.houses.map(h => `
                            <div class="hostel-card">
                                <div class="hostel-info">
                                    <div class="hostel-name">${h.name}</div>
                                    <div class="hostel-details">
                                        <div class="detail-row"><i class="fas fa-map-marker-alt"></i> ${h.address || 'No address'}</div>
                                        <div class="detail-row"><i class="fas fa-bed"></i> Bedspaces: ${h.total_bedspaces}</div>
                                        <div class="detail-row"><i class="fas fa-user"></i> Occupied: ${h.current_occupancy || 0}</div>
                                    </div>
                                    <div class="hostel-actions">
                                        <button class="hostel-action-btn edit" onclick="editHouse(${h.id})">Edit</button>
                                        <button class="hostel-action-btn delete" onclick="deleteHouse(${h.id})">Delete</button>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    }
                }
                document.getElementById('boardingHousesCount').innerText = data.houses.length + ' Houses';
            }
        } catch (error) {
            console.error('Error loading boarding houses:', error);
        }
    }

    window.editHouse = function(id) {
        alert('Edit house ID: ' + id);
    };

    window.deleteHouse = function(id) {
        if (confirm('Delete this boarding house?')) {
            alert('Delete house ID: ' + id);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadBoardingHouses();
    });
})();