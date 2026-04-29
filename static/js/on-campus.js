// On-Campus Accommodation Management
(function() {
    'use strict';

    // ---------- AUTHENTICATION CHECK ----------
    const BYPASS_AUTH = true;
    
    if (!BYPASS_AUTH && typeof SessionManager !== 'undefined' && !SessionManager.protectPage(['admin'])) {
        return;
    }

    // ---------- IMAGE UPLOAD HANDLING ----------
    let currentImageData = null;

    function initImageUpload() {
        const fileInput = document.getElementById('hostelImageUpload');
        const fileNameSpan = document.getElementById('selectedFileName');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('imagePreview');
        const imageDataInput = document.getElementById('hostelImageData');
        
        if (!fileInput) return;
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Image size should be less than 5MB', 'error');
                    fileInput.value = '';
                    return;
                }
                
                if (!file.type.startsWith('image/')) {
                    showToast('Please select an image file', 'error');
                    fileInput.value = '';
                    return;
                }
                
                if (fileNameSpan) fileNameSpan.textContent = file.name;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentImageData = event.target.result;
                    if (previewImg) previewImg.src = event.target.result;
                    if (previewContainer) previewContainer.style.display = 'block';
                    if (imageDataInput) imageDataInput.value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    window.removeSelectedImage = function() {
        const fileInput = document.getElementById('hostelImageUpload');
        const fileNameSpan = document.getElementById('selectedFileName');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const imageDataInput = document.getElementById('hostelImageData');
        
        if (fileInput) fileInput.value = '';
        if (fileNameSpan) fileNameSpan.textContent = 'No file chosen';
        if (previewContainer) previewContainer.style.display = 'none';
        if (imageDataInput) imageDataInput.value = '';
        currentImageData = null;
    };

    function setExistingImage(imageData) {
        if (!imageData) return;
        
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('imagePreview');
        const imageDataInput = document.getElementById('hostelImageData');
        const fileNameSpan = document.getElementById('selectedFileName');
        
        currentImageData = imageData;
        if (previewImg) previewImg.src = imageData;
        if (previewContainer) previewContainer.style.display = 'block';
        if (imageDataInput) imageDataInput.value = imageData;
        if (fileNameSpan) fileNameSpan.textContent = 'Existing image';
    }

    function getImageData() {
        return document.getElementById('hostelImageData')?.value || currentImageData || '';
    }

    // ---------- DATABASE SIMULATION (via API) ----------
    const OnCampusDB = {
        hostels: [],
        
        async init() {
            try {
                const result = await accommodationService.getAllHostels();
                if (result.success) {
                    this.hostels = result.hostels;
                }
            } catch (error) {
                console.error('Failed to load hostels:', error);
            }
        },
        
        getHostelsBySection(section) {
            return this.hostels.filter(h => h.section === section);
        },
        
        getHostelById(id) {
            return this.hostels.find(h => h.id == id);
        },
        
        async addHostel(hostelData) {
            const result = await accommodationService.createHostel(hostelData);
            if (result.success) {
                this.hostels.push(result.hostel);
                return result.hostel;
            }
            throw new Error(result.message);
        },
        
        async updateHostel(id, updates) {
            const result = await accommodationService.updateHostel(id, updates);
            if (result.success) {
                const hostel = this.hostels.find(h => h.id == id);
                if (hostel) Object.assign(hostel, updates);
                return true;
            }
            return false;
        },
        
        async deleteHostel(id) {
            const result = await accommodationService.deleteHostel(id);
            if (result.success) {
                this.hostels = this.hostels.filter(h => h.id != id);
                return true;
            }
            return false;
        },
        
        async addRoom(hostelId, roomData) {
            const result = await accommodationService.addRoom(hostelId, roomData, false);
            if (result.success) {
                const hostel = this.hostels.find(h => h.id == hostelId);
                if (hostel) {
                    if (!hostel.rooms) hostel.rooms = [];
                    hostel.rooms.push(result.room);
                }
                return result.room;
            }
            return null;
        },
        
        async deleteRoom(hostelId, roomId) {
            const result = await accommodationService.deleteRoom(hostelId, roomId, false);
            if (result.success) {
                const hostel = this.hostels.find(h => h.id == hostelId);
                if (hostel && hostel.rooms) {
                    hostel.rooms = hostel.rooms.filter(r => r.id != roomId);
                }
                return true;
            }
            return false;
        }
    };

    // ---------- STATE ----------
    let currentSection = 'upschool';
    let currentHostelId = null;
    let deleteType = null;
    let deleteId = null;
    let currentRoomHostelId = null;

    // ---------- HELPER FUNCTIONS ----------
    function showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            const toastEl = document.getElementById('toast');
            if (toastEl) {
                toastEl.textContent = message;
                toastEl.className = `toast ${type}`;
                toastEl.classList.remove('hidden');
                setTimeout(() => toastEl.classList.add('hidden'), 3000);
            }
        }
    }

    function getGenderIcon(gender) {
        const icons = {
            'male': '<i class="fas fa-mars"></i>',
            'female': '<i class="fas fa-venus"></i>',
            'mixed': '<i class="fas fa-venus-mars"></i>'
        };
        return icons[gender] || '<i class="fas fa-users"></i>';
    }

    function getGenderLabel(gender) {
        const labels = {
            'male': 'Male Only',
            'female': 'Female Only',
            'mixed': 'Mixed'
        };
        return labels[gender] || gender;
    }

    // ---------- RENDER SECTIONS ----------
    function renderAllSections() {
        renderSection('upschool');
        renderSection('downschool');
        renderSection('freshers');
        renderSection('sabbaticals');
        updateCounts();
    }

    function renderSection(section) {
        const hostels = OnCampusDB.getHostelsBySection(section);
        const grid = document.getElementById(`${section}Grid`);
        
        if (!grid) return;
        
        if (hostels.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h3>No Hostels Found</h3>
                    <p>Click "Add New Hostel" to add accommodation.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        hostels.forEach(hostel => {
            const totalRooms = (hostel.rooms || []).length;
            const totalCapacity = (hostel.rooms || []).reduce((sum, r) => sum + (r.capacity || 0), 0);
            const totalOccupied = (hostel.rooms || []).reduce((sum, r) => sum + (r.occupied || 0), 0);
            const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
            
            html += `
                <div class="hostel-card">
                    <div class="hostel-image">
                        ${hostel.image ? 
                            `<img src="${hostel.image}" alt="${hostel.name}">` : 
                            `<div class="hostel-image-placeholder"><i class="fas fa-building"></i></div>`
                        }
                        <span class="gender-badge ${hostel.gender || 'mixed'}">
                            ${getGenderIcon(hostel.gender)} ${getGenderLabel(hostel.gender)}
                        </span>
                    </div>
                    <div class="hostel-info">
                        <div class="hostel-name">
                            ${hostel.name}
                            <span class="hostel-type-badge">${hostel.type === 'sabbatical' ? `House #${hostel.houseNumber || ''}` : 'Hostel'}</span>
                        </div>
                        <div class="hostel-details">
                            <div class="detail-row">
                                <i class="fas fa-door-open"></i>
                                <span>${totalRooms} Rooms</span>
                            </div>
                            <div class="detail-row">
                                <i class="fas fa-users"></i>
                                <span>Capacity: ${totalCapacity} students</span>
                            </div>
                        </div>
                        <div class="room-summary">
                            <div class="room-stats">
                                <div class="room-stat">
                                    <span class="room-stat-value">${totalOccupied}</span>
                                    <span class="room-stat-label">Occupied</span>
                                </div>
                                <div class="room-stat">
                                    <span class="room-stat-value">${totalCapacity - totalOccupied}</span>
                                    <span class="room-stat-label">Available</span>
                                </div>
                                <div class="room-stat">
                                    <span class="room-stat-value">${occupancyRate}%</span>
                                    <span class="room-stat-label">Occupancy</span>
                                </div>
                            </div>
                        </div>
                        <div class="hostel-actions">
                            <button class="hostel-action-btn rooms" onclick="manageRooms(${hostel.id})">
                                <i class="fas fa-door-open"></i> Rooms
                            </button>
                            <button class="hostel-action-btn edit" onclick="editHostel(${hostel.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="hostel-action-btn delete" onclick="confirmDelete('hostel', ${hostel.id}, '${hostel.name.replace(/'/g, "\\'")}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    }

    function updateCounts() {
        document.getElementById('upschoolCount').textContent = `${OnCampusDB.getHostelsBySection('upschool').length} Hostels`;
        document.getElementById('downschoolCount').textContent = `${OnCampusDB.getHostelsBySection('downschool').length} Hostels`;
        document.getElementById('freshersCount').textContent = `${OnCampusDB.getHostelsBySection('freshers').length} Hostels`;
        document.getElementById('sabbaticalsCount').textContent = `${OnCampusDB.getHostelsBySection('sabbaticals').length} Houses`;
    }

    // ---------- MODAL FUNCTIONS ----------
    function openHostelModal(section = currentSection, hostelData = null) {
        const modal = document.getElementById('hostelModal');
        const modalTitle = document.getElementById('modalTitle');
        const hostelSection = document.getElementById('hostelSection');
        const hostelType = document.getElementById('hostelType');
        const sabbaticalOptions = document.getElementById('sabbaticalOptions');
        
        window.removeSelectedImage();
        
        if (hostelData) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Hostel';
            document.getElementById('hostelId').value = hostelData.id;
            document.getElementById('hostelName').value = hostelData.name || '';
            hostelSection.value = hostelData.section;
            hostelType.value = hostelData.type || 'hostel';
            document.getElementById('hostelGender').value = hostelData.gender || 'mixed';
            document.getElementById('hostelCapacity').value = hostelData.capacity || 50;
            document.getElementById('hostelDescription').value = hostelData.description || '';
            
            if (hostelData.image) {
                setExistingImage(hostelData.image);
            }
            
            if (hostelData.type === 'sabbatical') {
                sabbaticalOptions.style.display = 'grid';
                document.getElementById('hasServantQuarter').value = hostelData.hasServantQuarter || 'no';
                document.getElementById('houseNumber').value = hostelData.houseNumber || '';
            } else {
                sabbaticalOptions.style.display = 'none';
            }
        } else {
            modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Hostel';
            document.getElementById('hostelId').value = '';
            document.getElementById('hostelName').value = '';
            hostelSection.value = section;
            hostelType.value = 'hostel';
            document.getElementById('hostelGender').value = 'mixed';
            document.getElementById('hostelCapacity').value = '50';
            document.getElementById('hostelDescription').value = '';
            sabbaticalOptions.style.display = 'none';
        }
        
        modal.classList.add('show');
    }

    window.closeHostelModal = function() {
        document.getElementById('hostelModal').classList.remove('show');
    };

    async function saveHostel() {
        const id = document.getElementById('hostelId').value;
        const hostelData = {
            name: document.getElementById('hostelName').value.trim(),
            section: document.getElementById('hostelSection').value,
            type: document.getElementById('hostelType').value,
            gender: document.getElementById('hostelGender').value,
            capacity: parseInt(document.getElementById('hostelCapacity').value) || 50,
            image: getImageData(),
            description: document.getElementById('hostelDescription').value.trim()
        };
        
        if (!hostelData.name) {
            showToast('Please enter a hostel name', 'error');
            return;
        }
        
        if (hostelData.type === 'sabbatical') {
            hostelData.hasServantQuarter = document.getElementById('hasServantQuarter').value;
            hostelData.houseNumber = document.getElementById('houseNumber').value;
        }
        
        try {
            window.showLoading?.(true);
            
            if (id) {
                const result = await accommodationService.updateHostel(parseInt(id), hostelData);
                if (result.success) {
                    await OnCampusDB.init();
                    showToast('Hostel updated successfully', 'success');
                } else {
                    showToast(result.message, 'error');
                    return;
                }
            } else {
                const result = await accommodationService.createHostel(hostelData);
                if (result.success) {
                    await OnCampusDB.init();
                    showToast('Hostel added successfully', 'success');
                } else {
                    showToast(result.message, 'error');
                    return;
                }
            }
            
            closeHostelModal();
            renderAllSections();
        } catch (error) {
            showToast('Failed to save hostel', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- ROOM MANAGEMENT ----------
    window.manageRooms = function(hostelId) {
        const hostel = OnCampusDB.getHostelById(hostelId);
        if (!hostel) return;
        
        currentRoomHostelId = hostelId;
        document.getElementById('roomHostelName').textContent = hostel.name;
        
        renderRoomsList(hostel);
        document.getElementById('roomManagementModal').classList.add('show');
    };

    function renderRoomsList(hostel) {
        const roomsList = document.getElementById('roomsList');
        
        if (!hostel.rooms || hostel.rooms.length === 0) {
            roomsList.innerHTML = `
                <div class="empty-state" style="padding: 40px;">
                    <i class="fas fa-door-closed"></i>
                    <h3>No Rooms Added</h3>
                    <p>Click "Add Room" to add rooms.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        hostel.rooms.forEach(room => {
            const occupancyPercent = room.capacity > 0 ? ((room.occupied || 0) / room.capacity) * 100 : 0;
            
            html += `
                <div class="room-item">
                    <div class="room-info">
                        <span class="room-number">${room.roomNumber}</span>
                        <div class="room-details">
                            <span><i class="fas fa-layer-group"></i> ${room.floor || 'N/A'}</span>
                            <span><i class="fas fa-user"></i> Capacity: ${room.capacity}</span>
                        </div>
                    </div>
                    <div class="room-occupancy">
                        <span>${room.occupied || 0}/${room.capacity}</span>
                        <div class="occupancy-bar">
                            <div class="occupancy-fill" style="width: ${occupancyPercent}%;"></div>
                        </div>
                    </div>
                    <div class="room-actions">
                        <button class="room-action-btn delete" onclick="deleteRoom(${room.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        roomsList.innerHTML = html;
    }

    window.closeRoomModal = function() {
        document.getElementById('roomManagementModal').classList.remove('show');
        hideAddRoomForm();
        currentRoomHostelId = null;
    };

    window.showAddRoomForm = function() {
        document.getElementById('addRoomForm').style.display = 'block';
        document.getElementById('newRoomNumber').value = '';
        document.getElementById('newRoomCapacity').value = '2';
        document.getElementById('newRoomFloor').value = '';
    };

    window.hideAddRoomForm = function() {
        document.getElementById('addRoomForm').style.display = 'none';
    };

    async function saveRoom() {
        if (!currentRoomHostelId) return;
        
        const roomData = {
            roomNumber: document.getElementById('newRoomNumber').value.trim(),
            capacity: parseInt(document.getElementById('newRoomCapacity').value) || 2,
            floor: document.getElementById('newRoomFloor').value.trim()
        };
        
        if (!roomData.roomNumber) {
            showToast('Please enter a room number', 'error');
            return;
        }
        
        try {
            const result = await accommodationService.addRoom(currentRoomHostelId, roomData, false);
            if (result.success) {
                showToast('Room added successfully', 'success');
                
                const hostel = OnCampusDB.getHostelById(currentRoomHostelId);
                if (hostel) {
                    if (!hostel.rooms) hostel.rooms = [];
                    hostel.rooms.push(result.room);
                }
                renderRoomsList(hostel);
                hideAddRoomForm();
                renderAllSections();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Failed to add room', 'error');
        }
    }

    window.deleteRoom = async function(roomId) {
        if (!currentRoomHostelId) return;
        
        if (!confirm('Are you sure you want to delete this room?')) return;
        
        try {
            const result = await accommodationService.deleteRoom(currentRoomHostelId, roomId, false);
            if (result.success) {
                showToast('Room deleted successfully', 'success');
                
                const hostel = OnCampusDB.getHostelById(currentRoomHostelId);
                if (hostel && hostel.rooms) {
                    hostel.rooms = hostel.rooms.filter(r => r.id != roomId);
                }
                renderRoomsList(hostel);
                renderAllSections();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Failed to delete room', 'error');
        }
    };

    // ---------- DELETE CONFIRMATION ----------
    window.confirmDelete = function(type, id, name) {
        deleteType = type;
        deleteId = id;
        document.getElementById('deleteItemName').textContent = name;
        document.getElementById('deleteModal').classList.add('show');
    };

    window.closeDeleteModal = function() {
        document.getElementById('deleteModal').classList.remove('show');
        deleteType = null;
        deleteId = null;
    };

    async function executeDelete() {
        if (deleteType === 'hostel' && deleteId) {
            try {
                const result = await accommodationService.deleteHostel(deleteId);
                if (result.success) {
                    await OnCampusDB.init();
                    showToast('Hostel deleted successfully', 'success');
                    renderAllSections();
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                showToast('Failed to delete hostel', 'error');
            }
        }
        closeDeleteModal();
    }

    // ---------- EDIT HOSTEL ----------
    window.editHostel = function(hostelId) {
        const hostel = OnCampusDB.getHostelById(hostelId);
        if (hostel) {
            openHostelModal(hostel.section, hostel);
        }
    };

    // ---------- LOGOUT ----------
    async function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            showToast('Logging out...');
            if (typeof authService !== 'undefined') {
                await authService.logout();
            }
            SessionManager?.clearSession();
            setTimeout(() => window.location.href = 'index.html', 1000);
        }
    }

    // ---------- EVENT LISTENERS ----------
    function initEventListeners() {
        initImageUpload();
        
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.section-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                currentSection = tab.dataset.section;
                document.getElementById(`${currentSection}Section`).classList.add('active');
            });
        });
        
        document.getElementById('addHostelBtn').addEventListener('click', () => {
            openHostelModal(currentSection);
        });
        
        document.getElementById('hostelType').addEventListener('change', (e) => {
            document.getElementById('sabbaticalOptions').style.display = 
                e.target.value === 'sabbatical' ? 'grid' : 'none';
        });
        
        document.getElementById('saveHostelBtn').addEventListener('click', saveHostel);
        document.getElementById('addRoomBtn').addEventListener('click', showAddRoomForm);
        document.getElementById('saveRoomBtn').addEventListener('click', saveRoom);
        document.getElementById('confirmDeleteBtn').addEventListener('click', executeDelete);
        
        document.querySelector('.logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    // Make functions globally available
    window.manageRooms = manageRooms;
    window.closeRoomModal = closeRoomModal;
    window.showAddRoomForm = showAddRoomForm;
    window.hideAddRoomForm = hideAddRoomForm;
    window.deleteRoom = deleteRoom;
    window.editHostel = editHostel;
    window.confirmDelete = confirmDelete;
    window.closeDeleteModal = closeDeleteModal;

    // ---------- INITIALIZATION ----------
    (async function init() {
        await OnCampusDB.init();
        renderAllSections();
        initEventListeners();
        
        if (typeof SessionManager !== 'undefined') {
            const session = SessionManager.getSession();
            if (session) {
                const welcomeMsg = document.querySelector('.page-title p');
                if (welcomeMsg) {
                    welcomeMsg.textContent = `Welcome back, ${session.firstName}!`;
                }
            }
        }
    })();

})();