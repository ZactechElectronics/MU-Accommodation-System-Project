// Students Management Module
(function() {
    'use strict';

    // ---------- AUTHENTICATION CHECK ----------
    const BYPASS_AUTH = true;
    
    if (!BYPASS_AUTH && typeof SessionManager !== 'undefined' && !SessionManager.protectPage(['admin'])) {
        return;
    }

    // ---------- STATE ----------
    let students = [];
    let filteredStudents = [];
    let currentFilter = 'all';
    let searchTerm = '';
    let currentPage = 1;
    const itemsPerPage = 10;
    let selectedStudents = new Set();
    let currentStudentId = null;
    let revokeStudentId = null;

    // ---------- DOM ELEMENTS ----------
    const totalStudentsCountEl = document.getElementById('totalStudentsCount');
    const accommodatedCountEl = document.getElementById('accommodatedCount');
    const onCampusCountEl = document.getElementById('onCampusCount');
    const offCampusCountEl = document.getElementById('offCampusCount');
    const notAccommodatedCountEl = document.getElementById('notAccommodatedCount');
    const studentsTableBody = document.getElementById('studentsTableBody');
    const searchInput = document.getElementById('searchStudents');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const bulkActionBar = document.getElementById('bulkActionBar');
    const selectedCountEl = document.getElementById('selectedCount');
    const showingStartEl = document.getElementById('showingStart');
    const showingEndEl = document.getElementById('showingEnd');
    const totalRecordsEl = document.getElementById('totalRecords');
    const pageNumbersEl = document.getElementById('pageNumbers');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

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

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // ---------- LOAD STUDENTS FROM API ----------
    async function loadStudents() {
        try {
            window.showLoading?.(true);
            
            const result = await studentService.getAllStudents();
            
            if (result.success) {
                students = result.students.map(student => ({
                    ...student,
                    fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                    name: `${student.firstName || ''} ${student.lastName || ''}`.trim()
                }));
                filterStudents();
                updateStats();
                renderTable();
            } else {
                showToast(result.message, 'error');
                students = [];
            }
        } catch (error) {
            console.error('Error loading students:', error);
            showToast('Failed to load students', 'error');
            students = [];
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- FILTER AND SEARCH ----------
    function filterStudents() {
        let filtered = [...students];
        
        switch (currentFilter) {
            case 'accommodated':
                filtered = filtered.filter(s => s.accommodation !== null);
                break;
            case 'on-campus':
                filtered = filtered.filter(s => s.accommodation?.type === 'on-campus');
                break;
            case 'off-campus':
                filtered = filtered.filter(s => s.accommodation?.type === 'off-campus');
                break;
            case 'not-accommodated':
                filtered = filtered.filter(s => s.accommodation === null);
                break;
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                (s.fullName || '').toLowerCase().includes(term) ||
                (s.studentId || '').toLowerCase().includes(term) ||
                (s.email || '').toLowerCase().includes(term) ||
                (s.program || '').toLowerCase().includes(term)
            );
        }
        
        filteredStudents = filtered;
        currentPage = 1;
        selectedStudents.clear();
        updateSelectAllCheckbox();
        hideBulkActionBar();
    }

    // ---------- UPDATE STATS ----------
    function updateStats() {
        const total = students.length;
        const accommodated = students.filter(s => s.accommodation !== null).length;
        const onCampus = students.filter(s => s.accommodation?.type === 'on-campus').length;
        const offCampus = students.filter(s => s.accommodation?.type === 'off-campus').length;
        const notAccommodated = total - accommodated;
        
        if (totalStudentsCountEl) totalStudentsCountEl.textContent = total;
        if (accommodatedCountEl) accommodatedCountEl.textContent = accommodated;
        if (onCampusCountEl) onCampusCountEl.textContent = onCampus;
        if (offCampusCountEl) offCampusCountEl.textContent = offCampus;
        if (notAccommodatedCountEl) notAccommodatedCountEl.textContent = notAccommodated;
    }

    // ---------- RENDER TABLE ----------
    function renderTable() {
        if (!studentsTableBody) return;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredStudents.length);
        const pageData = filteredStudents.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            studentsTableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <i class="fas fa-user-graduate"></i>
                            <h3>No Students Found</h3>
                            <p>No students match your current filters.</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            let html = '';
            pageData.forEach(student => {
                const isSelected = selectedStudents.has(student.id);
                const accommodation = student.accommodation;
                const accommodationType = accommodation?.type || 'none';
                const accommodationDetails = getAccommodationDetails(student);
                
                html += `
                    <tr>
                        <td>
                            <input type="checkbox" class="student-checkbox" 
                                   data-id="${student.id}" 
                                   ${isSelected ? 'checked' : ''}>
                        </td>
                        <td><strong>${student.studentId || 'N/A'}</strong></td>
                        <td>${student.fullName || 'N/A'}</td>
                        <td>${student.program || 'N/A'}</td>
                        <td>${student.email || 'N/A'}</td>
                        <td>
                            ${accommodationType !== 'none' ? 
                                `<span class="type-badge ${accommodationType}">${accommodationType === 'on-campus' ? 'On-Campus' : 'Off-Campus'}</span>` : 
                                '<span class="type-badge">-</span>'}
                        </td>
                        <td>${accommodationDetails}</td>
                        <td>
                            ${accommodation ? 
                                '<span class="status-badge accommodated">Accommodated</span>' : 
                                '<span class="status-badge not-accommodated">Not Accommodated</span>'}
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn view" onclick="viewStudentDetail(${student.id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${accommodation ? `
                                    <button class="action-btn revoke" onclick="openRevokeModal(${student.id})" title="Revoke Accommodation">
                                        <i class="fas fa-undo-alt"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            studentsTableBody.innerHTML = html;
            
            document.querySelectorAll('.student-checkbox').forEach(cb => {
                cb.addEventListener('change', handleCheckboxChange);
            });
        }
        
        updatePagination();
        updateShowingInfo();
    }

    function getAccommodationDetails(student) {
        const acc = student.accommodation;
        if (!acc) return '-';
        
        if (acc.type === 'on-campus') {
            return `${acc.hostelName || 'N/A'} - Room ${acc.roomNumber || 'N/A'}`;
        } else {
            return `${acc.boardingHouseName || 'N/A'} - ${acc.roomNumber || 'N/A'}`;
        }
    }

    // ---------- PAGINATION ----------
    function updatePagination() {
        const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
        
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        
        if (pageNumbersEl) {
            let pageHtml = '';
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pageHtml += `<button class="page-number ${i === currentPage ? 'active' : ''}" 
                                    onclick="goToPage(${i})">${i}</button>`;
            }
            
            pageNumbersEl.innerHTML = pageHtml || '<span class="page-number active">1</span>';
        }
    }

    function updateShowingInfo() {
        const start = filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, filteredStudents.length);
        
        if (showingStartEl) showingStartEl.textContent = start;
        if (showingEndEl) showingEndEl.textContent = end;
        if (totalRecordsEl) totalRecordsEl.textContent = filteredStudents.length;
    }

    window.goToPage = function(page) {
        currentPage = page;
        renderTable();
    };

    // ---------- CHECKBOX HANDLING ----------
    function handleCheckboxChange(e) {
        const checkbox = e.target;
        const studentId = parseInt(checkbox.dataset.id);
        
        if (checkbox.checked) {
            selectedStudents.add(studentId);
        } else {
            selectedStudents.delete(studentId);
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
        
        updateSelectAllCheckbox();
        updateBulkActionBar();
    }

    function updateSelectAllCheckbox() {
        if (!selectAllCheckbox) return;
        
        const currentPageIds = getCurrentPageIds();
        const allChecked = currentPageIds.length > 0 && 
                          currentPageIds.every(id => selectedStudents.has(id));
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = !allChecked && 
                                          currentPageIds.some(id => selectedStudents.has(id));
    }

    function getCurrentPageIds() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredStudents.length);
        return filteredStudents.slice(startIndex, endIndex).map(s => s.id);
    }

    function handleSelectAll() {
        const currentPageIds = getCurrentPageIds();
        const allSelected = currentPageIds.every(id => selectedStudents.has(id));
        
        if (allSelected) {
            currentPageIds.forEach(id => selectedStudents.delete(id));
        } else {
            currentPageIds.forEach(id => selectedStudents.add(id));
        }
        
        renderTable();
        updateBulkActionBar();
    }

    function updateBulkActionBar() {
        if (!bulkActionBar || !selectedCountEl) return;
        
        const count = selectedStudents.size;
        
        if (count > 0) {
            selectedCountEl.textContent = count;
            bulkActionBar.classList.remove('hidden');
        } else {
            bulkActionBar.classList.add('hidden');
        }
    }

    function hideBulkActionBar() {
        if (bulkActionBar) bulkActionBar.classList.add('hidden');
    }

    function clearSelection() {
        selectedStudents.clear();
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        renderTable();
        hideBulkActionBar();
    }

    // ---------- STUDENT ACTIONS ----------
    window.viewStudentDetail = function(studentId) {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        currentStudentId = studentId;
        
        const modalBody = document.getElementById('studentDetailBody');
        const modal = document.getElementById('studentDetailModal');
        const editBtn = document.getElementById('modalEditBtn');
        
        if (!modalBody || !modal) return;
        
        const accommodation = student.accommodation;
        
        modalBody.innerHTML = `
            <div class="student-detail-grid">
                <div class="detail-section">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Full Name:</span>
                        <span class="detail-value">${student.fullName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Student ID:</span>
                        <span class="detail-value">${student.studentId || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${student.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${student.phoneNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">NRC:</span>
                        <span class="detail-value">${student.nrcNumber || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-graduation-cap"></i> Academic Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Program:</span>
                        <span class="detail-value">${student.program || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Year of Study:</span>
                        <span class="detail-value">Year ${student.yearOfStudy || '1'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Campus:</span>
                        <span class="detail-value">${student.campus || 'Main Campus'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value"><span class="status-badge accommodated">${student.enrollmentStatus || 'Active'}</span></span>
                    </div>
                </div>
            </div>
            
            ${accommodation ? `
                <div class="accommodation-section">
                    <h3><i class="fas fa-home"></i> Accommodation Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${accommodation.type === 'on-campus' ? 'On-Campus' : 'Off-Campus'}</span>
                    </div>
                    ${accommodation.type === 'on-campus' ? `
                        <div class="detail-item">
                            <span class="detail-label">Hostel:</span>
                            <span class="detail-value">${accommodation.hostelName || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Room Number:</span>
                            <span class="detail-value">${accommodation.roomNumber || 'N/A'}</span>
                        </div>
                    ` : `
                        <div class="detail-item">
                            <span class="detail-label">Boarding House:</span>
                            <span class="detail-value">${accommodation.boardingHouseName || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Address:</span>
                            <span class="detail-value">${accommodation.address || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Room:</span>
                            <span class="detail-value">${accommodation.roomNumber || 'N/A'}</span>
                        </div>
                    `}
                    <div class="detail-item">
                        <span class="detail-label">Date Allocated:</span>
                        <span class="detail-value">${formatDate(accommodation.dateAllocated)}</span>
                    </div>
                </div>
            ` : `
                <div class="detail-section" style="margin-top: 16px;">
                    <h3><i class="fas fa-info-circle"></i> Accommodation Status</h3>
                    <p style="color: #64748b;">This student is not currently accommodated.</p>
                </div>
            `}
            
            ${student.revocationReason ? `
                <div class="detail-section" style="background: #fef2f2; border: 1px solid #fecaca; margin-top: 16px;">
                    <h3 style="color: #991b1b;"><i class="fas fa-exclamation-circle"></i> Revocation Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Reason:</span>
                        <span class="detail-value" style="color: #7f1d1d;">${student.revocationReason}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date Revoked:</span>
                        <span class="detail-value">${formatDate(student.revocationDate)}</span>
                    </div>
                </div>
            ` : ''}
        `;
        
        if (editBtn) {
            editBtn.onclick = () => {
                closeStudentModal();
                // No edit functionality - student data comes from university database
                showToast('Student data is managed by the university system', 'info');
            };
        }
        
        modal.classList.add('show');
    };

    window.closeStudentModal = function() {
        const modal = document.getElementById('studentDetailModal');
        if (modal) modal.classList.remove('show');
        currentStudentId = null;
    };

    // ---------- REVOKE FUNCTIONS ----------
    window.openRevokeModal = function(studentId) {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        revokeStudentId = studentId;
        
        const studentNameEl = document.getElementById('revokeStudentName');
        if (studentNameEl) studentNameEl.textContent = student.fullName || 'this student';
        
        const reasonInput = document.getElementById('revokeReasonInput');
        if (reasonInput) reasonInput.value = '';
        
        const modal = document.getElementById('revokeModal');
        if (modal) modal.classList.add('show');
    };

    window.closeRevokeModal = function() {
        const modal = document.getElementById('revokeModal');
        if (modal) modal.classList.remove('show');
        revokeStudentId = null;
    };

    async function confirmRevoke() {
        if (!revokeStudentId) return;
        
        const reasonInput = document.getElementById('revokeReasonInput');
        const reason = reasonInput?.value.trim() || '';
        
        if (!reason) {
            showToast('Please provide a reason for revocation', 'error');
            return;
        }
        
        const student = students.find(s => s.id === revokeStudentId);
        if (!student || !student.accommodation) {
            showToast('Student is not accommodated', 'error');
            return;
        }
        
        try {
            window.showLoading?.(true);
            
            // Find application for this student
            const applicationsResult = await applicationService.getAllApplications();
            if (applicationsResult.success) {
                const app = applicationsResult.applications.find(a => 
                    a.studentId === revokeStudentId && 
                    (a.status === 'approved' || a.status === 'accommodated')
                );
                
                if (app) {
                    const result = await applicationService.revokeApplication(app.id, reason);
                    if (result.success) {
                        closeRevokeModal();
                        await loadStudents();
                        showToast('Accommodation revoked successfully', 'success');
                    } else {
                        showToast(result.message, 'error');
                    }
                } else {
                    showToast('No active application found', 'error');
                }
            }
        } catch (error) {
            console.error('Error revoking accommodation:', error);
            showToast('Failed to revoke accommodation', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- EXPORT ----------
    function exportToCSV() {
        if (filteredStudents.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }
        
        const headers = ['Student ID', 'Full Name', 'Program', 'Email', 'Phone', 'Accommodation Type', 'Accommodation Details', 'Status'];
        const rows = filteredStudents.map(s => [
            s.studentId || '',
            s.fullName || '',
            s.program || '',
            s.email || '',
            s.phoneNumber || '',
            s.accommodation?.type || 'None',
            getAccommodationDetails(s),
            s.accommodation ? 'Accommodated' : 'Not Accommodated'
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('Students exported successfully', 'success');
    }

    function exportSelected() {
        const selectedData = Array.from(selectedStudents)
            .map(id => students.find(s => s.id === id))
            .filter(s => s);
        
        if (selectedData.length === 0) {
            showToast('No students selected', 'error');
            return;
        }
        
        const headers = ['Student ID', 'Full Name', 'Program', 'Email', 'Accommodation Type', 'Accommodation Details'];
        const rows = selectedData.map(s => [
            s.studentId || '',
            s.fullName || '',
            s.program || '',
            s.email || '',
            s.accommodation?.type || 'None',
            getAccommodationDetails(s)
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected_students_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast(`${selectedData.length} students exported`, 'success');
    }

    // ---------- LOGOUT ----------
    async function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            showToast('Logging out...');
            if (typeof authService !== 'undefined') {
                await authService.logout();
            }
            if (typeof SessionManager !== 'undefined') {
                SessionManager.clearSession();
            }
            setTimeout(() => window.location.href = 'index.html', 1000);
        }
    }

    // ---------- EVENT LISTENERS ----------
    function initEventListeners() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                filterStudents();
                renderTable();
            });
        });
        
        // Search
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value;
                filterStudents();
                renderTable();
            });
        }
        
        // Select all
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', handleSelectAll);
        }
        
        // Pagination
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable();
                }
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                }
            });
        }
        
        // Bulk actions
        document.getElementById('bulkExportBtn')?.addEventListener('click', exportSelected);
        document.getElementById('clearSelectionBtn')?.addEventListener('click', clearSelection);
        
        // Revoke
        document.getElementById('confirmRevokeBtn')?.addEventListener('click', confirmRevoke);
        
        // Export
        document.getElementById('exportStudentsBtn')?.addEventListener('click', exportToCSV);
        
        // Refresh
        document.getElementById('refreshStudentsBtn')?.addEventListener('click', async () => {
            await loadStudents();
            showToast('Data refreshed', 'success');
        });
        
        // Logout
        document.querySelector('.logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
        
        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    // Make functions globally available
    window.viewStudentDetail = viewStudentDetail;
    window.closeStudentModal = closeStudentModal;
    window.openRevokeModal = openRevokeModal;
    window.closeRevokeModal = closeRevokeModal;
    window.goToPage = goToPage;

    // ---------- INITIALIZATION ----------
    (async function init() {
        await loadStudents();
        initEventListeners();
        
        // Update admin info if session exists
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