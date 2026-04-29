// Off-Campus Accommodation Management
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
    const OffCampusDB = {
        houses: [],
        
        async init() {
            try {
                const result = await accommodationService.getAllBoardingHouses();
                if (result.success) {
                    this.houses = result.houses;
                }
            } catch (error) {
                console.error('Failed to load boarding houses:', error);
            }
        },
        
        getHousesBySection(section) {
            return this.houses.filter(h => h.section === section);
        },
        
        getHouseById(id) {
            return this.houses.find(h => h.id == id);
        },
        
        async addHouse(houseData) {
            const result = await accommodationService.createBoardingHouse(houseData);
            if (result.success) {
                this.houses.push(result.house);
                return result.house;
            }
            throw new Error(result.message);
        },
        
        async updateHouse(id, updates) {
            const result = await accommodationService.updateBoardingHouse(id, updates);
            if (result.success) {
                const house = this.houses.find(h => h.id == id);
                if (house) Object.assign(house, updates);
                return true;
            }
            return false;
        },
        
        async deleteHouse(id) {
            const result = await accommodationService.deleteBoardingHouse(id);
            if (result.success) {
                this.houses = this.houses.filter(h => h.id != id);
                return true;
            }
            return false;
        },
        
        async addRoom(houseId, roomData) {
            const result = await accommodationService.addRoom(houseId, roomData, true);
            if (result.success) {
                const house = this.houses.find(h => h.id == houseId);
                if (house) {
                    if (!house.rooms) house.rooms = [];
                    house.rooms.push(result.room);
                }
                return result.room;
            }
            return null;
        },
        
        async deleteRoom(houseId, roomId) {
            const result = await accommodationService.deleteRoom(houseId, roomId, true);
            if (result.success) {
                const house = this.houses.find(h => h.id == houseId);
                if (house && house.rooms) {
                    house.rooms = house.rooms.filter(r => r.id != roomId);
                }
                return true;
            }
            return false;
        }
    };

    // ---------- STATE ----------
    const currentSection = 'boardingHouses';
    let deleteType = null;
    let deleteId = null;
    let currentRoomHouseId = null;

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
        renderSection('boardingHouses');
        updateCounts();
    }

    function renderSection(section) {
        const houses = OffCampusDB.getHousesBySection(section);
        const grid = document.getElementById(`${section}Grid`);
        
        if (!grid) return;
        
        if (houses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-home"></i>
                    <h3>No Boarding Houses Found</h3>
                    <p>Click "Add New Boarding House" to add accommodation.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        houses.forEach(house => {
            const totalRooms = (house.rooms || []).length;
            const totalCapacity = (house.rooms || []).reduce((sum, r) => sum + (r.capacity || 0), 0);
            const totalOccupied = (house.rooms || []).reduce((sum, r) => sum + (r.occupied || 0), 0);
            const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
            
            html += `
                <div class="hostel-card">
                    <div class="hostel-image">
                        ${house.image ? 
                            `<img src="${house.image}" alt="${house.name}">` : 
                            `<div class="hostel-image-placeholder"><i class="fas fa-home"></i></div>`
                        }
                        <span class="gender-badge ${house.gender || 'mixed'}">
                            ${getGenderIcon(house.gender)} ${getGenderLabel(house.gender)}
                        </span>
                    </div>
                    <div class="hostel-info">
                        <div class="hostel-name">
                            ${house.name}
                            <span class="hostel-type-badge">Boarding House</span>
                        </div>
                        <div class="hostel-details">
                            ${house.address ? `
                                <div class="detail-row">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${house.address}</span>
                                </div>
                            ` : ''}
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
                            <button class="hostel-action-btn rooms" onclick="manageRooms(${house.id})">
                                <i class="fas fa-door-open"></i> Rooms
                            </button>
                            <button class="hostel-action-btn edit" onclick="editHouse(${house.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="hostel-action-btn delete" onclick="confirmDelete('house', ${house.id}, '${house.name.replace(/'/g, "\\'")}')">
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
        const countEl = document.getElementById('boardingHousesCount');
        if (countEl) {
            const count = OffCampusDB.getHousesBySection('boardingHouses').length;
            countEl.textContent = `${count} ${count === 1 ? 'House' : 'Houses'}`;
        }
    }

    // ---------- MODAL FUNCTIONS ----------
    function openHouseModal(houseData = null) {
        const modal = document.getElementById('hostelModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (!modal) return;
        
        window.removeSelectedImage();
        
        if (houseData) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Boarding House';
            document.getElementById('hostelId').value = houseData.id;
            document.getElementById('hostelName').value = houseData.name || '';
            document.getElementById('hostelGender').value = houseData.gender || 'mixed';
            document.getElementById('hostelAddress').value = houseData.address || '';
            document.getElementById('hostelCapacity').value = houseData.capacity || 25;
            document.getElementById('hostelDescription').value = houseData.description || '';
            
            if (houseData.image) {
                setExistingImage(houseData.image);
            }
        } else {
            modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Boarding House';
            document.getElementById('hostelId').value = '';
            document.getElementById('hostelName').value = '';
            document.getElementById('hostelGender').value = 'mixed';
            document.getElementById('hostelAddress').value = '';
            document.getElementById('hostelCapacity').value = '25';
            document.getElementById('hostelDescription').value = '';
        }
        modal.classList.add('show');
    }

    window.closeHostelModal = function() {
        document.getElementById('hostelModal').classList.remove('show');
    };

    async function saveHouse() {
        const id = document.getElementById('hostelId').value;
        const houseData = {
            name: document.getElementById('hostelName').value.trim(),
            gender: document.getElementById('hostelGender').value,
            address: document.getElementById('hostelAddress').value.trim(),
            capacity: parseInt(document.getElementById('hostelCapacity').value) || 25,
            image: getImageData(),
            description: document.getElementById('hostelDescription').value.trim()
        };
        
        if (!houseData.name) {
            showToast('Please enter a house name', 'error');
            return;
        }
        
        if (!houseData.address) {
            showToast('Please enter an address', 'error');
            return;
        }
        
        try {
            window.showLoading?.(true);
            
            if (id) {
                const result = await accommodationService.updateBoardingHouse(parseInt(id), houseData);
                if (result.success) {
                    await OffCampusDB.init();
                    showToast('Boarding house updated successfully', 'success');
                } else {
                    showToast(result.message, 'error');
                    return;
                }
            } else {
                const result = await accommodationService.createBoardingHouse(houseData);
                if (result.success) {
                    await OffCampusDB.init();
                    showToast('Boarding house added successfully', 'success');
                } else {
                    showToast(result.message, 'error');
                    return;
                }
            }
            
            closeHostelModal();
            renderAllSections();
        } catch (error) {
            showToast('Failed to save boarding house', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- ROOM MANAGEMENT ----------
    window.manageRooms = function(houseId) {
        const house = OffCampusDB.getHouseById(houseId);
        if (!house) return;
        
        currentRoomHouseId = houseId;
        document.getElementById('roomHostelName').textContent = house.name;
        
        renderRoomsList(house);
        document.getElementById('roomManagementModal').classList.add('show');
    };

    function renderRoomsList(house) {
        const roomsList = document.getElementById('roomsList');
        
        if (!house.rooms || house.rooms.length === 0) {
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
        house.rooms.forEach(room => {
            const occupancyPercent = room.capacity > 0 ? ((room.occupied || 0) / room.capacity) * 100 : 0;
            
            html += `
                <div class="room-item">
                    <div class="room-info">
                        <span class="room-number">${room.roomNumber}</span>
                        <div class="room-details">
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
        currentRoomHouseId = null;
    };

    window.showAddRoomForm = function() {
        document.getElementById('addRoomForm').style.display = 'block';
        document.getElementById('newRoomNumber').value = '';
        document.getElementById('newRoomCapacity').value = '2';
    };

    window.hideAddRoomForm = function() {
        document.getElementById('addRoomForm').style.display = 'none';
    };

    async function saveRoom() {
        if (!currentRoomHouseId) return;
        
        const roomData = {
            roomNumber: document.getElementById('newRoomNumber').value.trim(),
            capacity: parseInt(document.getElementById('newRoomCapacity').value) || 2
        };
        
        if (!roomData.roomNumber) {
            showToast('Please enter a room number', 'error');
            return;
        }
        
        try {
            const result = await accommodationService.addRoom(currentRoomHouseId, roomData, true);
            if (result.success) {
                showToast('Room added successfully', 'success');
                
                const house = OffCampusDB.getHouseById(currentRoomHouseId);
                if (house) {
                    if (!house.rooms) house.rooms = [];
                    house.rooms.push(result.room);
                }
                renderRoomsList(house);
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
        if (!currentRoomHouseId) return;
        
        if (!confirm('Are you sure you want to delete this room?')) return;
        
        try {
            const result = await accommodationService.deleteRoom(currentRoomHouseId, roomId, true);
            if (result.success) {
                showToast('Room deleted successfully', 'success');
                
                const house = OffCampusDB.getHouseById(currentRoomHouseId);
                if (house && house.rooms) {
                    house.rooms = house.rooms.filter(r => r.id != roomId);
                }
                renderRoomsList(house);
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
        if (deleteType === 'house' && deleteId) {
            try {
                const result = await accommodationService.deleteBoardingHouse(deleteId);
                if (result.success) {
                    await OffCampusDB.init();
                    showToast('Boarding house deleted successfully', 'success');
                    renderAllSections();
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                showToast('Failed to delete boarding house', 'error');
            }
        }
        closeDeleteModal();
    }

    // ---------- EDIT HOUSE ----------
    window.editHouse = function(houseId) {
        const house = OffCampusDB.getHouseById(houseId);
        if (house) {
            openHouseModal(house);
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
        
        document.getElementById('addHostelBtn').addEventListener('click', () => {
            openHouseModal();
        });
        
        document.getElementById('saveHostelBtn').addEventListener('click', saveHouse);
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
    window.editHouse = editHouse;
    window.confirmDelete = confirmDelete;
    window.closeDeleteModal = closeDeleteModal;

    // ---------- INITIALIZATION ----------
    (async function init() {
        await OffCampusDB.init();
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