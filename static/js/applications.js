// Applications Management Module
(function() {
    'use strict';

    // ---------- AUTHENTICATION CHECK ----------
    const BYPASS_AUTH = true;
    
    if (!BYPASS_AUTH && typeof SessionManager !== 'undefined' && !SessionManager.protectPage(['admin'])) {
        return;
    }

    // ---------- STATE ----------
    let applications = [];
    let filteredApplications = [];
    let currentFilter = 'all';
    let searchTerm = '';
    let currentPage = 1;
    const itemsPerPage = 10;
    let selectedApplications = new Set();
    let currentApplicationId = null;
    let revokeApplicationId = null;

    // ---------- DOM ELEMENTS ----------
    const totalApplicationsEl = document.getElementById('totalApplications');
    const pendingApplicationsEl = document.getElementById('pendingApplications');
    const approvedApplicationsEl = document.getElementById('approvedApplications');
    const rejectedApplicationsEl = document.getElementById('rejectedApplications');
    const revokedApplicationsEl = document.getElementById('revokedApplications');
    const applicationsTableBody = document.getElementById('applicationsTableBody');
    const searchInput = document.getElementById('searchApplications');
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

    function getStatusClass(status) {
        const classes = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'revoked': 'revoked',
            'accommodated': 'accommodated'
        };
        return classes[status] || 'pending';
    }

    // ---------- LOAD APPLICATIONS FROM API ----------
    async function loadApplications() {
        try {
            window.showLoading?.(true);
            
            const result = await applicationService.getAllApplications();
            
            if (result.success) {
                applications = result.applications;
                filterApplications();
                updateStats();
                renderTable();
            } else {
                showToast(result.message, 'error');
                applications = [];
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            showToast('Failed to load applications', 'error');
            applications = [];
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- FILTER AND SEARCH ----------
    function filterApplications() {
        let filtered = [...applications];
        
        if (currentFilter !== 'all') {
            filtered = filtered.filter(app => app.status === currentFilter);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(app => 
                (app.studentName || '').toLowerCase().includes(term) ||
                (app.studentId || '').toString().includes(term) ||
                (app.id || '').toString().includes(term) ||
                (app.studentEmail || '').toLowerCase().includes(term) ||
                (app.studentProgram || '').toLowerCase().includes(term)
            );
        }
        
        filteredApplications = filtered;
        currentPage = 1;
        selectedApplications.clear();
        updateSelectAllCheckbox();
        hideBulkActionBar();
    }

    // ---------- UPDATE STATS ----------
    function updateStats() {
        const total = applications.length;
        const pending = applications.filter(a => a.status === 'pending').length;
        const approved = applications.filter(a => a.status === 'approved').length;
        const rejected = applications.filter(a => a.status === 'rejected').length;
        const revoked = applications.filter(a => a.status === 'revoked').length;
        
        if (totalApplicationsEl) totalApplicationsEl.textContent = total;
        if (pendingApplicationsEl) pendingApplicationsEl.textContent = pending;
        if (approvedApplicationsEl) approvedApplicationsEl.textContent = approved;
        if (rejectedApplicationsEl) rejectedApplicationsEl.textContent = rejected;
        if (revokedApplicationsEl) revokedApplicationsEl.textContent = revoked;
    }

    // ---------- RENDER TABLE ----------
    function renderTable() {
        if (!applicationsTableBody) return;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredApplications.length);
        const pageData = filteredApplications.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            applicationsTableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <i class="fas fa-file-alt"></i>
                            <h3>No Applications Found</h3>
                            <p>No applications match your current filters.</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            let html = '';
            pageData.forEach(app => {
                const isSelected = selectedApplications.has(app.id);
                const statusClass = getStatusClass(app.status);
                const typeLabel = app.type === 'on-campus' ? 'On-Campus' : 'Off-Campus';
                
                html += `
                    <tr>
                        <td>
                            <input type="checkbox" class="app-checkbox" 
                                   data-id="${app.id}" 
                                   ${isSelected ? 'checked' : ''}>
                        </td>
                        <td><strong>#${app.id}</strong></td>
                        <td>${app.studentId || 'N/A'}</td>
                        <td>${app.studentName || 'N/A'}</td>
                        <td>${app.studentProgram || 'N/A'}</td>
                        <td>${typeLabel}</td>
                        <td>${formatDate(app.applicationDate)}</td>
                        <td><span class="status-badge ${statusClass}">${app.status}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn view" onclick="viewApplicationDetail(${app.id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${getActionButtons(app)}
                            </div>
                        </td>
                    </tr>
                `;
            });
            applicationsTableBody.innerHTML = html;
            
            document.querySelectorAll('.app-checkbox').forEach(cb => {
                cb.addEventListener('change', handleCheckboxChange);
            });
        }
        
        updatePagination();
        updateShowingInfo();
    }

    function getActionButtons(app) {
        if (app.status === 'pending') {
            return `
                <button class="action-btn approve" onclick="approveApplication(${app.id})" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-btn reject" onclick="rejectApplication(${app.id})" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else if (app.status === 'approved' || app.status === 'accommodated') {
            return `
                <button class="action-btn revoke" onclick="openRevokeModal(${app.id})" title="Revoke">
                    <i class="fas fa-undo-alt"></i>
                </button>
            `;
        }
        return '';
    }

    // ---------- PAGINATION ----------
    function updatePagination() {
        const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
        
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
        const start = filteredApplications.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, filteredApplications.length);
        
        if (showingStartEl) showingStartEl.textContent = start;
        if (showingEndEl) showingEndEl.textContent = end;
        if (totalRecordsEl) totalRecordsEl.textContent = filteredApplications.length;
    }

    window.goToPage = function(page) {
        currentPage = page;
        renderTable();
    };

    // ---------- CHECKBOX HANDLING ----------
    function handleCheckboxChange(e) {
        const checkbox = e.target;
        const appId = parseInt(checkbox.dataset.id);
        
        if (checkbox.checked) {
            selectedApplications.add(appId);
        } else {
            selectedApplications.delete(appId);
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
        
        updateSelectAllCheckbox();
        updateBulkActionBar();
    }

    function updateSelectAllCheckbox() {
        if (!selectAllCheckbox) return;
        
        const currentPageIds = getCurrentPageIds();
        const allChecked = currentPageIds.length > 0 && 
                          currentPageIds.every(id => selectedApplications.has(id));
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = !allChecked && 
                                          currentPageIds.some(id => selectedApplications.has(id));
    }

    function getCurrentPageIds() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredApplications.length);
        return filteredApplications.slice(startIndex, endIndex).map(app => app.id);
    }

    function handleSelectAll() {
        const currentPageIds = getCurrentPageIds();
        const allSelected = currentPageIds.every(id => selectedApplications.has(id));
        
        if (allSelected) {
            currentPageIds.forEach(id => selectedApplications.delete(id));
        } else {
            currentPageIds.forEach(id => selectedApplications.add(id));
        }
        
        renderTable();
        updateBulkActionBar();
    }

    function updateBulkActionBar() {
        if (!bulkActionBar || !selectedCountEl) return;
        
        const count = selectedApplications.size;
        
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
        selectedApplications.clear();
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        renderTable();
        hideBulkActionBar();
    }

    // ---------- APPLICATION ACTIONS ----------
    window.approveApplication = async function(appId) {
        try {
            window.showLoading?.(true);
            
            const result = await applicationService.approveApplication(appId);
            
            if (result.success) {
                await loadApplications();
                showToast(`Application #${appId} approved successfully`, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error approving application:', error);
            showToast('Failed to approve application', 'error');
        } finally {
            window.showLoading?.(false);
        }
    };

    window.rejectApplication = async function(appId) {
        const reason = prompt('Enter rejection reason (optional):') || '';
        
        try {
            window.showLoading?.(true);
            
            const result = await applicationService.rejectApplication(appId, reason);
            
            if (result.success) {
                await loadApplications();
                showToast(`Application #${appId} rejected`, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error rejecting application:', error);
            showToast('Failed to reject application', 'error');
        } finally {
            window.showLoading?.(false);
        }
    };

    async function bulkApprove() {
        const pendingApps = Array.from(selectedApplications)
            .map(id => applications.find(a => a.id === id))
            .filter(app => app && app.status === 'pending');
        
        if (pendingApps.length === 0) {
            showToast('No pending applications selected', 'error');
            return;
        }
        
        try {
            window.showLoading?.(true);
            
            let successCount = 0;
            for (const app of pendingApps) {
                const result = await applicationService.approveApplication(app.id);
                if (result.success) successCount++;
            }
            
            await loadApplications();
            selectedApplications.clear();
            hideBulkActionBar();
            showToast(`${successCount} applications approved`, 'success');
        } catch (error) {
            showToast('Failed to approve some applications', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    async function bulkReject() {
        const pendingApps = Array.from(selectedApplications)
            .map(id => applications.find(a => a.id === id))
            .filter(app => app && app.status === 'pending');
        
        if (pendingApps.length === 0) {
            showToast('No pending applications selected', 'error');
            return;
        }
        
        const reason = prompt('Enter rejection reason for all selected applications (optional):') || '';
        
        try {
            window.showLoading?.(true);
            
            let successCount = 0;
            for (const app of pendingApps) {
                const result = await applicationService.rejectApplication(app.id, reason);
                if (result.success) successCount++;
            }
            
            await loadApplications();
            selectedApplications.clear();
            hideBulkActionBar();
            showToast(`${successCount} applications rejected`, 'success');
        } catch (error) {
            showToast('Failed to reject some applications', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- VIEW APPLICATION DETAIL ----------
    window.viewApplicationDetail = function(appId) {
        const app = applications.find(a => a.id === appId);
        if (!app) return;
        
        currentApplicationId = appId;
        
        const modalBody = document.getElementById('applicationDetailBody');
        const modal = document.getElementById('applicationDetailModal');
        const approveBtn = document.getElementById('modalApproveBtn');
        const rejectBtn = document.getElementById('modalRejectBtn');
        const revokeBtn = document.getElementById('modalRevokeBtn');
        
        if (!modalBody || !modal) return;
        
        modalBody.innerHTML = `
            <div class="application-detail-grid">
                <div class="detail-section">
                    <h3><i class="fas fa-user"></i> Student Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${app.studentName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Student ID:</span>
                        <span class="detail-value">${app.studentId || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Program:</span>
                        <span class="detail-value">${app.studentProgram || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${app.studentEmail || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-info-circle"></i> Application Details</h3>
                    <div class="detail-item">
                        <span class="detail-label">Application ID:</span>
                        <span class="detail-value">#${app.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${app.type === 'on-campus' ? 'On-Campus' : 'Off-Campus'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Applied Date:</span>
                        <span class="detail-value">${formatDate(app.applicationDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value"><span class="status-badge ${getStatusClass(app.status)}">${app.status}</span></span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-home"></i> Accommodation Preference</h3>
                ${app.type === 'on-campus' ? `
                    <div class="detail-item">
                        <span class="detail-label">Preferred Hostel:</span>
                        <span class="detail-value">${app.preferredHostel || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Preferred Room:</span>
                        <span class="detail-value">${app.preferredRoom || 'N/A'}</span>
                    </div>
                ` : `
                    <div class="detail-item">
                        <span class="detail-label">Preferred Boarding House:</span>
                        <span class="detail-value">${app.preferredBoardingHouse || 'N/A'}</span>
                    </div>
                `}
            </div>
            
            ${app.notes ? `
                <div class="application-notes">
                    <h4><i class="fas fa-sticky-note"></i> Additional Notes</h4>
                    <p>${app.notes}</p>
                </div>
            ` : ''}
            
            ${app.revocationReason ? `
                <div class="application-notes" style="background: #fef2f2; border-color: #fecaca;">
                    <h4 style="color: #991b1b;"><i class="fas fa-exclamation-circle"></i> Revocation Reason</h4>
                    <p style="color: #7f1d1d;">${app.revocationReason}</p>
                </div>
            ` : ''}
        `;
        
        if (approveBtn) approveBtn.style.display = app.status === 'pending' ? 'flex' : 'none';
        if (rejectBtn) rejectBtn.style.display = app.status === 'pending' ? 'flex' : 'none';
        if (revokeBtn) revokeBtn.style.display = app.status === 'approved' || app.status === 'accommodated' ? 'flex' : 'none';
        
        modal.classList.add('show');
    };

    window.closeApplicationModal = function() {
        const modal = document.getElementById('applicationDetailModal');
        if (modal) modal.classList.remove('show');
        currentApplicationId = null;
    };

    // ---------- REVOKE FUNCTIONS ----------
    window.openRevokeModal = function(appId) {
        const app = applications.find(a => a.id === appId);
        if (!app) return;
        
        revokeApplicationId = appId;
        
        const studentNameEl = document.getElementById('revokeStudentName');
        if (studentNameEl) studentNameEl.textContent = app.studentName || 'this student';
        
        const reasonInput = document.getElementById('revokeReasonInput');
        if (reasonInput) reasonInput.value = '';
        
        const modal = document.getElementById('revokeReasonModal');
        if (modal) modal.classList.add('show');
    };

    window.closeRevokeModal = function() {
        const modal = document.getElementById('revokeReasonModal');
        if (modal) modal.classList.remove('show');
        revokeApplicationId = null;
    };

    async function confirmRevoke() {
        if (!revokeApplicationId) return;
        
        const reasonInput = document.getElementById('revokeReasonInput');
        const reason = reasonInput?.value.trim() || '';
        
        if (!reason) {
            showToast('Please provide a reason for revocation', 'error');
            return;
        }
        
        try {
            window.showLoading?.(true);
            
            const result = await applicationService.revokeApplication(revokeApplicationId, reason);
            
            if (result.success) {
                closeRevokeModal();
                await loadApplications();
                showToast(`Accommodation revoked for application #${revokeApplicationId}`, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error revoking application:', error);
            showToast('Failed to revoke accommodation', 'error');
        } finally {
            window.showLoading?.(false);
        }
    }

    // ---------- EXPORT ----------
    function exportToCSV() {
        if (filteredApplications.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }
        
        const headers = ['App ID', 'Student ID', 'Student Name', 'Program', 'Type', 'Status', 'Applied Date', 'Notes'];
        const rows = filteredApplications.map(app => [
            app.id,
            app.studentId || '',
            app.studentName || '',
            app.studentProgram || '',
            app.type || '',
            app.status || '',
            app.applicationDate || '',
            app.notes || ''
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('Applications exported successfully', 'success');
    }

    function exportSelected() {
        const selectedData = Array.from(selectedApplications)
            .map(id => applications.find(a => a.id === id))
            .filter(app => app);
        
        if (selectedData.length === 0) {
            showToast('No applications selected', 'error');
            return;
        }
        
        const headers = ['App ID', 'Student ID', 'Student Name', 'Program', 'Type', 'Status', 'Applied Date'];
        const rows = selectedData.map(app => [
            app.id,
            app.studentId || '',
            app.studentName || '',
            app.studentProgram || '',
            app.type || '',
            app.status || '',
            app.applicationDate || ''
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected_applications_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast(`${selectedData.length} applications exported`, 'success');
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
                filterApplications();
                renderTable();
            });
        });
        
        // Search
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value;
                filterApplications();
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
                const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                }
            });
        }
        
        // Bulk actions
        document.getElementById('bulkApproveBtn')?.addEventListener('click', bulkApprove);
        document.getElementById('bulkRejectBtn')?.addEventListener('click', bulkReject);
        document.getElementById('clearSelectionBtn')?.addEventListener('click', clearSelection);
        
        // Modal actions
        document.getElementById('modalApproveBtn')?.addEventListener('click', () => {
            if (currentApplicationId) {
                window.approveApplication(currentApplicationId);
                closeApplicationModal();
            }
        });
        
        document.getElementById('modalRejectBtn')?.addEventListener('click', () => {
            if (currentApplicationId) {
                window.rejectApplication(currentApplicationId);
                closeApplicationModal();
            }
        });
        
        document.getElementById('modalRevokeBtn')?.addEventListener('click', () => {
            closeApplicationModal();
            if (currentApplicationId) {
                openRevokeModal(currentApplicationId);
            }
        });
        
        document.getElementById('confirmRevokeBtn')?.addEventListener('click', confirmRevoke);
        
        // Export
        document.getElementById('exportApplicationsBtn')?.addEventListener('click', exportToCSV);
        document.getElementById('bulkExportBtn')?.addEventListener('click', exportSelected);
        
        // Refresh
        document.getElementById('refreshApplicationsBtn')?.addEventListener('click', async () => {
            await loadApplications();
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
    window.viewApplicationDetail = viewApplicationDetail;
    window.closeApplicationModal = closeApplicationModal;
    window.closeRevokeModal = closeRevokeModal;
    window.openRevokeModal = openRevokeModal;
    window.approveApplication = approveApplication;
    window.rejectApplication = rejectApplication;
    window.goToPage = goToPage;

    // ---------- INITIALIZATION ----------
    (async function init() {
        await loadApplications();
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