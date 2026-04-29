// Application Configuration
const AppConfig = {
    // Toggle between mock and real API
    USE_MOCK_API: false, // Set to false when backend is ready
    
    // API Base URL -  remember to change to backend URL Adon!
    API_BASE_URL: 'http://localhost:8000/api',
    
    // API Endpoints
    ENDPOINTS: {
        // Auth
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REGISTER: '/auth/register',
        VERIFY: '/auth/verify',
        
        // Students
        STUDENTS: '/students',
        STUDENT_BY_ID: (id) => `/students/${id}`,
        STUDENT_APPLICATIONS: (id) => `/students/${id}/applications`,
        
        // Applications
        APPLICATIONS: '/applications',
        APPLICATION_BY_ID: (id) => `/applications/${id}`,
        APPROVE_APPLICATION: (id) => `/applications/${id}/approve`,
        REJECT_APPLICATION: (id) => `/applications/${id}/reject`,
        REVOKE_APPLICATION: (id) => `/applications/${id}/revoke`,
        
        // Accommodation - On Campus
        HOSTELS: '/accommodation/hostels',
        HOSTEL_BY_ID: (id) => `/accommodation/hostels/${id}`,
        HOSTEL_ROOMS: (id) => `/accommodation/hostels/${id}/rooms`,
        
        // Accommodation - Off Campus
        BOARDING_HOUSES: '/accommodation/boarding-houses',
        BOARDING_HOUSE_BY_ID: (id) => `/accommodation/boarding-houses/${id}`,
        BOARDING_HOUSE_ROOMS: (id) => `/accommodation/boarding-houses/${id}/rooms`,
        
        // Dashboard Stats
        DASHBOARD_STATS: '/dashboard/stats',
        ANALYTICS: '/analytics',
        ACTIVITIES: '/activities',
        
        // Settings
        SETTINGS: '/settings'
    },
    
    // Request timeout in milliseconds
    REQUEST_TIMEOUT: 30000,
    
    // Storage keys
    STORAGE_KEYS: {
        TOKEN: 'auth_token',
        SESSION: 'mulungushi_session',
        USER: 'current_user'
    }
};

// Export for use in modules
window.AppConfig = AppConfig;