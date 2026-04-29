// Student Dashboard Application
(function() {
    'use strict';

    // ---------- DEVELOPMENT BYPASS ----------
    const BYPASS_AUTH = true; // Set to false in production
    
    // ---------- GET CURRENT STUDENT FROM SESSION ----------
    let currentStudent = null;
    
    // Initialize from session
    async function initializeFromSession() {
        // BYPASS FOR DEVELOPMENT
        if (BYPASS_AUTH) {
            console.warn('🔓 DEV MODE: Student authentication bypassed');
            
            currentStudent = {
                id: 1,
                studentId: 'STU001',
                firstName: 'Elton',
                lastName: 'Mwansa',
                fullName: 'Elton Mwansa',
                email: 'elton.mwansa@edu.zm',
                program: 'Computer Science',
                phoneNumber: '+260 97 1234567',
                nrcNumber: '123456/78/9',
                yearOfStudy: 3,
                enrollmentStatus: 'Active',
                campus: 'Main Campus',
                accommodation: {
                    status: 'accommodated',
                    applicationId: 301,
                    applicationDate: '2026-03-15',
                    type: 'on-campus',
                    residencyName: 'Downschool Hostel',
                    hostelName: 'Downschool',
                    roomNumber: 'D102'
                }
            };
            return true;
        }
        
        // PRODUCTION AUTHENTICATION
        if (!SessionManager.protectPage(['student'])) {
            return false;
        }
        
        const session = SessionManager.getSession();
        if (!session) return false;
        
        try {
            window.showLoading?.(true);
            currentStudent = await studentService.getStudentWithAccommodation(session.userId);
            
            if (!currentStudent) {
                window.showToast('Error loading student data', 'error');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error loading student:', error);
            window.showToast('Error loading student data', 'error');
            return false;
        } finally {
            window.showLoading?.(false);
        }
    }
    
    // DOM Elements
    const pageTitle = document.getElementById('pageTitle');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const sidebarStudentName = document.getElementById('sidebarStudentName');
    const sidebarStudentProgram = document.getElementById('sidebarStudentProgram');
    const headerStudentId = document.getElementById('headerStudentId');
    const studentFullName = document.getElementById('studentFullName');
    const studentNumber = document.getElementById('studentNumber');
    const studentProgram = document.getElementById('studentProgram');
    const studentEmail = document.getElementById('studentEmail');
    const studentNRC = document.getElementById('studentNRC');
    const studentPhone = document.getElementById('studentPhone');
    const studentYear = document.getElementById('studentYear');
    const studentCampus = document.getElementById('studentCampus');
    const accommodationStatusContainer = document.getElementById('accommodationStatusContainer');

    // Pages
    const pages = {
        dashboard: document.getElementById('dashboardPage'),
        apply: document.getElementById('applyPage'),
        'my-application': document.getElementById('myApplicationPage'),
        available: document.getElementById('availablePage'),
        profile: document.getElementById('profilePage'),
        settings: document.getElementById('settingsPage')
    };

    // Navigation
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const logoutBtn = document.querySelector('.logout-btn');

    // Helper: Toast
    function showToast(msg, type = 'info', duration = 3000) {
        if (window.showToast) {
            window.showToast(msg, type, duration);
        } else {
            const toastEl = document.getElementById('toast');
            if (toastEl) {
                toastEl.textContent = msg;
                toastEl.className = `toast ${type}`;
                toastEl.classList.remove('hidden');
                setTimeout(() => toastEl.classList.add('hidden'), duration);
            }
        }
    }

    // Helper: Get gender label
    function getGenderLabel(gender) {
        const labels = {
            'male': 'Male Only',
            'female': 'Female Only',
            'mixed': 'Mixed'
        };
        return labels[gender] || gender;
    }

    // Load student data into UI
    function loadStudentData() {
        if (!currentStudent) {
            showToast('Error loading student data', 'error');
            return;
        }

        if (sidebarStudentName) {
            sidebarStudentName.textContent = `${currentStudent.firstName} ${currentStudent.lastName}`;
        }
        if (sidebarStudentProgram) {
            sidebarStudentProgram.textContent = currentStudent.program || 'Student';
        }
        if (headerStudentId) {
            headerStudentId.textContent = currentStudent.studentId || 'N/A';
        }
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome back, ${currentStudent.firstName}!`;
        }

        if (studentFullName) {
            studentFullName.textContent = `${currentStudent.firstName} ${currentStudent.lastName}`;
        }
        if (studentNumber) {
            studentNumber.textContent = currentStudent.studentId || 'N/A';
        }
        if (studentProgram) {
            studentProgram.textContent = currentStudent.program || 'N/A';
        }
        if (studentEmail) {
            studentEmail.textContent = currentStudent.email || 'N/A';
        }
        if (studentNRC) {
            studentNRC.textContent = currentStudent.nrcNumber || 'N/A';
        }
        if (studentPhone) {
            studentPhone.textContent = currentStudent.phoneNumber || 'N/A';
        }
        if (studentYear) {
            studentYear.textContent = `Year ${currentStudent.yearOfStudy || '1'}`;
        }
        if (studentCampus) {
            studentCampus.textContent = currentStudent.campus || 'Main Campus';
        }

        const editPhone = document.getElementById('editPhone');
        const editEmail = document.getElementById('editEmail');
        if (editPhone) editPhone.value = currentStudent.phoneNumber || '';
        if (editEmail) editEmail.value = currentStudent.email || '';
    }

    // Render accommodation status
    function renderAccommodationStatus() {
        const acc = currentStudent?.accommodation;
        const container = accommodationStatusContainer;
        if (!container) return;
        
        if (!acc || acc.status === 'not_applied') {
            container.innerHTML = `
                <div class="accommodation-status status-not-applied">
                    <i class="fas fa-home" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i>
                    <h3>No Accommodation Application</h3>
                    <p style="color: #64748b; margin: 8px 0 20px;">You haven't applied for accommodation yet.</p>
                    <button class="btn-primary" onclick="document.querySelector('[data-page=\\'apply\\']').click()">
                        <i class="fas fa-file-signature"></i> Apply Now
                    </button>
                </div>
            `;
            return;
        }

        let statusClass = '';
        let statusIcon = '';
        let statusText = '';

        switch(acc.status) {
            case 'pending':
                statusClass = 'status-pending';
                statusIcon = '<i class="fas fa-clock" style="color: #ca8a04;"></i>';
                statusText = 'Application Pending';
                break;
            case 'approved':
                statusClass = 'status-approved';
                statusIcon = '<i class="fas fa-check-circle" style="color: #16a34a;"></i>';
                statusText = 'Application Approved';
                break;
            case 'rejected':
                statusClass = 'status-rejected';
                statusIcon = '<i class="fas fa-times-circle" style="color: #dc2626;"></i>';
                statusText = 'Application Rejected';
                break;
            case 'accommodated':
                statusClass = 'status-accommodated';
                statusIcon = '<i class="fas fa-check-circle" style="color: #16a34a;"></i>';
                statusText = 'Accommodated';
                break;
        }

        let detailsHtml = '';
        if (acc.status === 'accommodated') {
            detailsHtml = `
                <div class="accommodation-details">
                    <div class="accommodation-detail-item">
                        <span class="detail-label">Residency Name:</span>
                        <span class="detail-value">${acc.residencyName || acc.hostelName || acc.boardingHouseName || 'N/A'}</span>
                    </div>
                    ${acc.type === 'on-campus' ? `
                        <div class="accommodation-detail-item">
                            <span class="detail-label">Hostel:</span>
                            <span class="detail-value">${acc.hostelName || 'N/A'}</span>
                        </div>
                    ` : ''}
                    <div class="accommodation-detail-item">
                        <span class="detail-label">Room Number:</span>
                        <span class="detail-value">${acc.roomNumber || 'Not assigned'}</span>
                    </div>
                    ${acc.type === 'off-campus' && acc.boardingHouseName ? `
                        <div class="accommodation-detail-item">
                            <span class="detail-label">Boarding House:</span>
                            <span class="detail-value">${acc.boardingHouseName}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (acc.status === 'pending' || acc.status === 'approved') {
            detailsHtml = `
                <div class="accommodation-details">
                    <div class="accommodation-detail-item">
                        <span class="detail-label">Application ID:</span>
                        <span class="detail-value">#${acc.applicationId || 'N/A'}</span>
                    </div>
                    <div class="accommodation-detail-item">
                        <span class="detail-label">Applied On:</span>
                        <span class="detail-value">${window.formatDate ? window.formatDate(acc.applicationDate) : (acc.applicationDate || 'N/A')}</span>
                    </div>
                    <div class="accommodation-detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${acc.type === 'on-campus' ? 'On-Campus' : 'Off-Campus'}</span>
                    </div>
                    ${acc.type === 'on-campus' && acc.preferredHostel ? `
                        <div class="accommodation-detail-item">
                            <span class="detail-label">Preferred Hostel:</span>
                            <span class="detail-value">${acc.preferredHostel}</span>
                        </div>
                    ` : ''}
                    ${acc.type === 'off-campus' && acc.preferredBoardingHouse ? `
                        <div class="accommodation-detail-item">
                            <span class="detail-label">Preferred Boarding House:</span>
                            <span class="detail-value">${acc.preferredBoardingHouse}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="accommodation-status ${statusClass}">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    ${statusIcon}
                    <h3 style="margin: 0;">${statusText}</h3>
                </div>
                ${detailsHtml}
            </div>
        `;
    }

    // Navigation handler
    function switchPage(pageId) {
        Object.values(pages).forEach(page => {
            if (page) page.classList.remove('active');
        });
        
        if (pages[pageId]) {
            pages[pageId].classList.add('active');
        }

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            }
        });

        const titles = {
            dashboard: 'Dashboard',
            apply: 'Apply for Accommodation',
            'my-application': 'My Application',
            available: 'Available Rooms',
            profile: 'My Profile',
            settings: 'Settings'
        };
        if (pageTitle) pageTitle.textContent = titles[pageId] || 'Dashboard';

        if (pageId === 'my-application') {
            renderApplicationPage();
        } else if (pageId === 'available') {
            renderAvailablePage();
        } else if (pageId === 'apply') {
            populateApplyForm();
        }
    }

    // Render application page
    function renderApplicationPage() {
        const container = document.getElementById('applicationStatusContainer');
        const acc = currentStudent?.accommodation;
        
        if (!acc || acc.status === 'not_applied') {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Application Found</h3>
                    <p>You haven't submitted an accommodation application yet.</p>
                    <button class="btn-primary" style="margin-top: 20px;" onclick="document.querySelector('[data-page=\\'apply\\']').click()">
                        Apply Now
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="application-details">
                <div class="info-item">
                    <span class="info-label">Application ID</span>
                    <span class="info-value">#${acc.applicationId || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value" style="color: ${acc.status === 'pending' ? '#ca8a04' : acc.status === 'approved' ? '#16a34a' : '#dc2626'}">
                        ${acc.status ? acc.status.toUpperCase() : 'N/A'}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Submitted On</span>
                    <span class="info-value">${window.formatDate ? window.formatDate(acc.applicationDate) : (acc.applicationDate || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Accommodation Type</span>
                    <span class="info-value">${acc.type === 'on-campus' ? 'On-Campus' : acc.type === 'off-campus' ? 'Off-Campus' : 'N/A'}</span>
                </div>
            </div>
        `;
    }

    // Populate apply form with images
    async function populateApplyForm() {
        const hostelSelect = document.getElementById('hostelSelect');
        const boardingSelect = document.getElementById('boardingHouseSelect');
        
        try {
            window.showLoading?.(true);
            
            const hostelsResult = await accommodationService.getAllHostels();
            if (hostelSelect && hostelsResult.success) {
                hostelSelect.innerHTML = '<option value="">Select Hostel</option>';
                hostelsResult.hostels.forEach(h => {
                    hostelSelect.innerHTML += `<option value="${h.id}" data-image="${h.image || ''}" data-gender="${h.gender || 'mixed'}" data-name="${h.name}">${h.name}</option>`;
                });
            }
            
            const housesResult = await accommodationService.getAllBoardingHouses();
            if (boardingSelect && housesResult.success) {
                boardingSelect.innerHTML = '<option value="">Select Boarding House</option>';
                housesResult.houses.forEach(h => {
                    boardingSelect.innerHTML += `<option value="${h.id}" data-image="${h.image || ''}" data-gender="${h.gender || 'mixed'}" data-name="${h.name}" data-address="${h.address || ''}">${h.name}</option>`;
                });
            }
        } catch (error) {
            console.error('Failed to load accommodation data:', error);
            showToast('Failed to load accommodation options', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // Setup image previews
    function setupImagePreviews() {
        const hostelSelect = document.getElementById('hostelSelect');
        const boardingSelect = document.getElementById('boardingHouseSelect');
        
        if (hostelSelect) {
            hostelSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                const previewContainer = document.getElementById('hostelImagePreview');
                const previewImg = document.getElementById('hostelPreviewImg');
                const previewName = document.getElementById('hostelPreviewName');
                const previewGender = document.getElementById('hostelPreviewGender');
                
                if (selectedOption && selectedOption.value && previewContainer) {
                    const imageUrl = selectedOption.dataset.image;
                    const name = selectedOption.dataset.name;
                    const gender = selectedOption.dataset.gender;
                    
                    if (previewImg) {
                        previewImg.src = imageUrl || `https://via.placeholder.com/400x200/667eea/ffffff?text=${encodeURIComponent(name)}`;
                    }
                    if (previewName) previewName.textContent = name;
                    if (previewGender) {
                        previewGender.textContent = getGenderLabel(gender);
                        previewGender.className = `gender-badge ${gender}`;
                    }
                    previewContainer.style.display = 'block';
                } else if (previewContainer) {
                    previewContainer.style.display = 'none';
                }
            });
        }
        
        if (boardingSelect) {
            boardingSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                const previewContainer = document.getElementById('boardingHouseImagePreview');
                const previewImg = document.getElementById('boardingPreviewImg');
                const previewName = document.getElementById('boardingPreviewName');
                const previewGender = document.getElementById('boardingPreviewGender');
                const previewAddress = document.getElementById('boardingPreviewAddress');
                
                if (selectedOption && selectedOption.value && previewContainer) {
                    const imageUrl = selectedOption.dataset.image;
                    const name = selectedOption.dataset.name;
                    const gender = selectedOption.dataset.gender;
                    const address = selectedOption.dataset.address;
                    
                    if (previewImg) {
                        previewImg.src = imageUrl || `https://via.placeholder.com/400x200/667eea/ffffff?text=${encodeURIComponent(name)}`;
                    }
                    if (previewName) previewName.textContent = name;
                    if (previewGender) {
                        previewGender.textContent = getGenderLabel(gender);
                        previewGender.className = `gender-badge ${gender}`;
                    }
                    if (previewAddress) {
                        previewAddress.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${address}`;
                    }
                    previewContainer.style.display = 'block';
                } else if (previewContainer) {
                    previewContainer.style.display = 'none';
                }
            });
        }
    }

    // Render available page
    async function renderAvailablePage() {
        const container = document.getElementById('availableContent');
        if (!container) return;
        
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'on-campus-available';
        
        try {
            window.showLoading?.(true);
            
            if (activeTab === 'on-campus-available') {
                const result = await accommodationService.getAllHostels();
                if (result.success) {
                    renderOnCampusAvailable(container, result.hostels);
                } else {
                    container.innerHTML = '<p class="empty-state">Failed to load on-campus accommodation.</p>';
                }
            } else {
                const result = await accommodationService.getAllBoardingHouses();
                if (result.success) {
                    renderOffCampusAvailable(container, result.houses);
                } else {
                    container.innerHTML = '<p class="empty-state">Failed to load off-campus accommodation.</p>';
                }
            }
        } catch (error) {
            console.error('Error loading available rooms:', error);
            container.innerHTML = '<p class="empty-state">Failed to load available rooms.</p>';
        } finally {
            window.showLoading?.(false);
        }
    }

    function renderOnCampusAvailable(container, hostels) {
        if (!hostels || hostels.length === 0) {
            container.innerHTML = '<p class="empty-state">No on-campus accommodation available.</p>';
            return;
        }
        
        let html = '<div class="rooms-grid">';
        let hasAvailable = false;
        
        hostels.forEach(hostel => {
            const availableRooms = (hostel.rooms || []).filter(r => (r.occupied || 0) < (r.capacity || 0));
            const totalAvailable = availableRooms.length;
            
            if (totalAvailable > 0) {
                hasAvailable = true;
                const imageUrl = hostel.image || '';
                const genderLabel = getGenderLabel(hostel.gender || 'mixed');
                
                html += `
                    <div class="accommodation-card">
                        <div class="accommodation-image">
                            ${imageUrl ? 
                                `<img src="${imageUrl}" alt="${hostel.name}">` : 
                                `<div class="accommodation-image-placeholder"><i class="fas fa-building"></i></div>`
                            }
                            <span class="gender-tag ${hostel.gender || 'mixed'}">${genderLabel}</span>
                        </div>
                        <div class="accommodation-info">
                            <div class="accommodation-name">
                                ${hostel.name}
                                <span class="accommodation-type">Hostel</span>
                            </div>
                            <div class="accommodation-details">
                                <div class="detail-line">
                                    <i class="fas fa-door-open"></i>
                                    <span>${totalAvailable} room${totalAvailable !== 1 ? 's' : ''} available</span>
                                </div>
                            </div>
                            <div class="available-rooms-list">
                                ${availableRooms.slice(0, 3).map(room => `
                                    <div class="available-room-item">
                                        <span class="room-number">Room ${room.roomNumber}</span>
                                        <span class="room-availability">
                                            <i class="fas fa-user"></i> ${(room.capacity || 0) - (room.occupied || 0)}/${room.capacity} available
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="apply-btn" onclick="quickApply('on-campus', '${hostel.id}', '${hostel.name}')">
                                <i class="fas fa-file-signature"></i> Apply Now
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        container.innerHTML = hasAvailable ? html : '<p class="empty-state">No available rooms at this time.</p>';
    }

    function renderOffCampusAvailable(container, houses) {
        if (!houses || houses.length === 0) {
            container.innerHTML = '<p class="empty-state">No off-campus accommodation available.</p>';
            return;
        }
        
        let html = '<div class="rooms-grid">';
        let hasAvailable = false;
        
        houses.forEach(house => {
            const totalBeds = house.totalBeds || 0;
            const occupiedBeds = house.occupiedBeds || 0;
            const availableBeds = totalBeds - occupiedBeds;
            
            if (availableBeds > 0) {
                hasAvailable = true;
                const imageUrl = house.image || '';
                const genderLabel = getGenderLabel(house.gender || 'mixed');
                
                html += `
                    <div class="accommodation-card">
                        <div class="accommodation-image">
                            ${imageUrl ? 
                                `<img src="${imageUrl}" alt="${house.name}">` : 
                                `<div class="accommodation-image-placeholder"><i class="fas fa-home"></i></div>`
                            }
                            <span class="gender-tag ${house.gender || 'mixed'}">${genderLabel}</span>
                        </div>
                        <div class="accommodation-info">
                            <div class="accommodation-name">
                                ${house.name}
                                <span class="accommodation-type">Boarding House</span>
                            </div>
                            <div class="accommodation-details">
                                ${house.address ? `
                                    <div class="detail-line">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span>${house.address}</span>
                                    </div>
                                ` : ''}
                                <div class="detail-line">
                                    <i class="fas fa-bed"></i>
                                    <span>${availableBeds} bed${availableBeds !== 1 ? 's' : ''} available</span>
                                </div>
                            </div>
                            <button class="apply-btn" onclick="quickApply('off-campus', '${house.id}', '${house.name}')">
                                <i class="fas fa-file-signature"></i> Apply Now
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        container.innerHTML = hasAvailable ? html : '<p class="empty-state">No available beds at this time.</p>';
    }

    // Quick apply function
    window.quickApply = function(type, id, name) {
        document.querySelector('[data-page="apply"]').click();
        
        const typeSelect = document.getElementById('accommodationType');
        if (typeSelect) {
            typeSelect.value = type;
            typeSelect.dispatchEvent(new Event('change'));
        }
        
        setTimeout(() => {
            if (type === 'on-campus') {
                const hostelSelect = document.getElementById('hostelSelect');
                if (hostelSelect) {
                    hostelSelect.value = id;
                    hostelSelect.dispatchEvent(new Event('change'));
                }
            } else {
                const boardingSelect = document.getElementById('boardingHouseSelect');
                if (boardingSelect) {
                    boardingSelect.value = id;
                    boardingSelect.dispatchEvent(new Event('change'));
                }
            }
            showToast(`Selected: ${name}`, 'success');
        }, 100);
    };

    // Handle logout
    async function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            showToast('Logging out...', 'info');
            
            if (typeof authService !== 'undefined') {
                await authService.logout();
            }
            
            SessionManager?.clearSession();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    // Submit application
    async function submitApplication(formData) {
        try {
            window.showLoading?.(true);
            
            const applicationData = {
                ...formData,
                studentId: currentStudent.id
            };
            
            const result = await applicationService.submitApplication(applicationData);
            
            if (result.success) {
                currentStudent.accommodation = {
                    status: 'pending',
                    applicationId: result.application.id,
                    applicationDate: result.application.applicationDate,
                    type: formData.type,
                    preferredHostel: formData.preferredHostel,
                    preferredRoom: formData.preferredRoom,
                    preferredBoardingHouse: formData.preferredBoardingHouse
                };
                
                showToast('Application submitted successfully!', 'success');
                return true;
            } else {
                showToast(result.message, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            showToast('Failed to submit application', 'error');
            return false;
        } finally {
            window.showLoading?.(false);
        }
    }

    // Update profile
    async function updateProfile() {
        const phone = document.getElementById('editPhone')?.value;
        const email = document.getElementById('editEmail')?.value;
        
        if (!currentStudent) return;
        
        try {
            window.showLoading?.(true);
            
            const result = await studentService.updateStudent(currentStudent.id, {
                phoneNumber: phone,
                email: email
            });
            
            if (result.success) {
                currentStudent.phoneNumber = phone;
                currentStudent.email = email;
                loadStudentData();
                showToast('Profile updated successfully', 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Failed to update profile', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // Event Listeners
    function initEventListeners() {
        setupImagePreviews();
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) switchPage(page);
            });
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

        document.getElementById('applicationForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('accommodationType')?.value;
            const notes = document.getElementById('applicationNotes')?.value;
            
            let applicationData = { type, notes };
            
            if (type === 'on-campus') {
                const hostelId = document.getElementById('hostelSelect')?.value;
                const roomId = document.getElementById('roomSelect')?.value;
                if (!hostelId) {
                    showToast('Please select a hostel', 'warning');
                    return;
                }
                applicationData.preferredHostel = hostelId;
                applicationData.preferredRoom = roomId;
            } else if (type === 'off-campus') {
                const houseId = document.getElementById('boardingHouseSelect')?.value;
                if (!houseId) {
                    showToast('Please select a boarding house', 'warning');
                    return;
                }
                applicationData.preferredBoardingHouse = houseId;
            } else {
                showToast('Please select accommodation type', 'warning');
                return;
            }

            if (await submitApplication(applicationData)) {
                renderAccommodationStatus();
                switchPage('my-application');
            }
        });

        document.getElementById('accommodationType')?.addEventListener('change', (e) => {
            const type = e.target.value;
            const onCampusOpts = document.getElementById('onCampusOptions');
            const offCampusOpts = document.getElementById('offCampusOptions');
            
            if (onCampusOpts) onCampusOpts.style.display = type === 'on-campus' ? 'block' : 'none';
            if (offCampusOpts) offCampusOpts.style.display = type === 'off-campus' ? 'block' : 'none';
        });

        document.getElementById('hostelSelect')?.addEventListener('change', async (e) => {
            const hostelId = e.target.value;
            const roomSelect = document.getElementById('roomSelect');
            
            if (!roomSelect || !hostelId) return;
            
            try {
                const result = await accommodationService.getHostelById(hostelId);
                const hostel = result.success ? result.hostel : null;
                
                roomSelect.innerHTML = '<option value="">Select Room</option>';
                if (hostel && hostel.rooms) {
                    hostel.rooms.forEach(room => {
                        if ((room.occupied || 0) < (room.capacity || 0)) {
                            roomSelect.innerHTML += `<option value="${room.id}">Room ${room.roomNumber} (${(room.capacity || 0) - (room.occupied || 0)} available)</option>`;
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading rooms:', error);
            }
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderAvailablePage();
            });
        });

        document.getElementById('updateProfileBtn')?.addEventListener('click', updateProfile);
    }

    // Initialize
    (async function init() {
        if (await initializeFromSession()) {
            loadStudentData();
            renderAccommodationStatus();
            initEventListeners();
            
            const hash = window.location.hash.slice(1);
            if (hash && pages[hash]) {
                switchPage(hash);
            }
        }
    })();

})();