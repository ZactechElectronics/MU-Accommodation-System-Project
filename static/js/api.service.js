// HTTP Request Handler
class ApiService {
    constructor() {
        this.baseURL = AppConfig.API_BASE_URL;
        this.timeout = AppConfig.REQUEST_TIMEOUT;
    }

    // Get auth token from storage
    getToken() {
        return localStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN) || 
               sessionStorage.getItem(AppConfig.STORAGE_KEYS.TOKEN);
    }

    // Set auth token
    setToken(token, remember = false) {
        if (remember) {
            localStorage.setItem(AppConfig.STORAGE_KEYS.TOKEN, token);
        } else {
            sessionStorage.setItem(AppConfig.STORAGE_KEYS.TOKEN, token);
        }
    }

    // Clear token
    clearToken() {
        localStorage.removeItem(AppConfig.STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(AppConfig.STORAGE_KEYS.TOKEN);
    }

    // Build headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Handle response
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            // Handle specific status codes
            if (response.status === 401) {
                // Unauthorized - clear session and redirect
                this.clearToken();
                SessionManager.clearSession();
                window.location.href = 'index.html';
                throw new Error('Session expired. Please login again.');
            }
            
            if (response.status === 403) {
                throw new Error('You do not have permission to perform this action.');
            }
            
            throw new Error(data.message || data.error || 'An error occurred');
        }
        
        return data;
    }

    // GET request
    async get(endpoint, includeAuth = true) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders(includeAuth),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return await this.handleResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    // POST request
    async post(endpoint, data, includeAuth = true) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(includeAuth),
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return await this.handleResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    // PUT request
    async put(endpoint, data, includeAuth = true) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(includeAuth),
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return await this.handleResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    // PATCH request
    async patch(endpoint, data, includeAuth = true) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PATCH',
                headers: this.getHeaders(includeAuth),
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return await this.handleResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    // DELETE request
    async delete(endpoint, includeAuth = true) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(includeAuth),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return await this.handleResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    // Upload file (for images)
    async uploadFile(endpoint, file, includeAuth = true) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const headers = {};
            if (includeAuth) {
                const token = this.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return await this.handleResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Upload timeout. Please try again.');
            }
            throw error;
        }
    }
}

// Create singleton instance
const apiService = new ApiService();
window.apiService = apiService;