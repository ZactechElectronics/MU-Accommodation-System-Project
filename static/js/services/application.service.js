// Applications Management Service
class ApplicationService {
    constructor() {
        this.useMock = AppConfig.USE_MOCK_API;
    }

    async getAllApplications() {
        if (this.useMock) {
            return this.mockGetAllApplications();
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.APPLICATIONS);
            return {
                success: true,
                applications: response.data || response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                applications: []
            };
        }
    }

    async getApplicationById(id) {
        if (this.useMock) {
            return this.mockGetApplicationById(id);
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.APPLICATION_BY_ID(id));
            return {
                success: true,
                application: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async submitApplication(applicationData) {
        if (this.useMock) {
            return this.mockSubmitApplication(applicationData);
        }
        
        try {
            const response = await apiService.post(AppConfig.ENDPOINTS.APPLICATIONS, applicationData);
            return {
                success: true,
                application: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async approveApplication(id) {
        if (this.useMock) {
            return this.mockApproveApplication(id);
        }
        
        try {
            const response = await apiService.post(AppConfig.ENDPOINTS.APPROVE_APPLICATION(id), {});
            return {
                success: true,
                application: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async rejectApplication(id, reason = '') {
        if (this.useMock) {
            return this.mockRejectApplication(id, reason);
        }
        
        try {
            const response = await apiService.post(AppConfig.ENDPOINTS.REJECT_APPLICATION(id), { reason });
            return {
                success: true,
                application: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async revokeApplication(id, reason) {
        if (this.useMock) {
            return this.mockRevokeApplication(id, reason);
        }
        
        try {
            const response = await apiService.post(AppConfig.ENDPOINTS.REVOKE_APPLICATION(id), { reason });
            return {
                success: true,
                application: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Mock implementations
    mockGetAllApplications() {
        const applications = window.AppState?.applications || [];
        return { success: true, applications };
    }

    mockGetApplicationById(id) {
        const applications = window.AppState?.applications || [];
        const app = applications.find(a => a.id === id);
        return { success: true, application: app };
    }

    mockSubmitApplication(data) {
        const newApp = {
            id: Date.now(),
            ...data,
            status: 'pending',
            applicationDate: new Date().toISOString().split('T')[0]
        };
        if (window.AppState) {
            if (!window.AppState.applications) window.AppState.applications = [];
            window.AppState.applications.push(newApp);
        }
        return { success: true, application: newApp };
    }

    mockApproveApplication(id) {
        const applications = window.AppState?.applications || [];
        const app = applications.find(a => a.id === id);
        if (app) {
            app.status = 'approved';
            return { success: true, application: app };
        }
        return { success: false, message: 'Application not found' };
    }

    mockRejectApplication(id, reason) {
        const applications = window.AppState?.applications || [];
        const app = applications.find(a => a.id === id);
        if (app) {
            app.status = 'rejected';
            app.rejectionReason = reason;
            return { success: true, application: app };
        }
        return { success: false, message: 'Application not found' };
    }

    mockRevokeApplication(id, reason) {
        const applications = window.AppState?.applications || [];
        const app = applications.find(a => a.id === id);
        if (app) {
            app.status = 'revoked';
            app.revocationReason = reason;
            return { success: true, application: app };
        }
        return { success: false, message: 'Application not found' };
    }
}

const applicationService = new ApplicationService();
window.applicationService = applicationService;