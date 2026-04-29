// Authentication Service
class AuthService {
    constructor() {
        this.useMock = AppConfig.USE_MOCK_API;
    }

    // Login options: identifier can be email, student ID, or username
    async login(identifier, password, remember = false) {
        if (this.useMock) {
            return this.mockLogin(identifier, password);
        }
        
        try {
            const loginType = this.identifyLoginType(identifier);
            const payload = { password };
            
            if (loginType === 'email') {
                payload.email = identifier;
            } else if (loginType === 'studentId') {
                payload.studentId = identifier;
            } else {
                payload.username = identifier;
            }
            
            const response = await apiService.post(AppConfig.ENDPOINTS.LOGIN, payload, false);
            
            if (response.token) {
                apiService.setToken(response.token, remember);
                SessionManager.setSession(response.user);
            }
            
            return {
                success: true,
                user: response.user,
                token: response.token
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Login failed. Please check your credentials.'
            };
        }
    }

    // Logout
    async logout() {
        if (!this.useMock) {
            try {
                await apiService.post(AppConfig.ENDPOINTS.LOGOUT, {});
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        apiService.clearToken();
        SessionManager.clearSession();
    }

    // Verify token (for page refresh)
    async verifyToken() {
        if (this.useMock) {
            const session = SessionManager.getSession();
            return { success: !!session, user: session };
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.VERIFY);
            return {
                success: true,
                user: response.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Identify login type (student ID, email, or username)
    identifyLoginType(identifier) {
        // Check if it's an email
        if (identifier.includes('@') && identifier.includes('.')) {
            return 'email';
        }
        // Check if it's a student ID (only numbers)
        if (/^\d+$/.test(identifier)) {
            return 'studentId';
        }
        // Default - admin username
        return 'username';
    }

    // Mock login (for development)
    mockLogin(identifier, password) {
        // Find user in mock database
        const user = AppDatabase.users.find(u => {
            // Check by email
            if (u.email && u.email.toLowerCase() === identifier.toLowerCase()) {
                return u.password === password;
            }
            // Check by student ID
            if (u.studentId && u.studentId === identifier) {
                return u.password === password;
            }
            // Check by username (first name or full name)
            const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
            const username = identifier.toLowerCase();
            if (fullName.includes(username) || u.firstName.toLowerCase() === username) {
                return u.password === password;
            }
            return false;
        });
        
        if (user) {
            const sessionUser = { ...user, password: undefined };
            SessionManager.setSession(sessionUser);
            return {
                success: true,
                user: sessionUser
            };
        }
        
        return {
            success: false,
            message: 'Invalid credentials. Please check your Student Number/Username and password.'
        };
    }
}

// Create singleton instance
const authService = new AuthService();
window.authService = authService;