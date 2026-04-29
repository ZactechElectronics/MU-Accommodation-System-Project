// Accommodation Management Service
class AccommodationService {
    constructor() {
        this.useMock = AppConfig.USE_MOCK_API;
    }

    // ON-CAMPUS HOSTELS
    
    async getAllHostels() {
        if (this.useMock) {
            return this.mockGetAllHostels();
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.HOSTELS);
            return {
                success: true,
                hostels: response.data || response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                hostels: []
            };
        }
    }

    async getHostelById(id) {
        if (this.useMock) {
            return this.mockGetHostelById(id);
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.HOSTEL_BY_ID(id));
            return {
                success: true,
                hostel: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async createHostel(hostelData) {
        if (this.useMock) {
            return this.mockCreateHostel(hostelData);
        }
        
        try {
            const response = await apiService.post(AppConfig.ENDPOINTS.HOSTELS, hostelData);
            return {
                success: true,
                hostel: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async updateHostel(id, updates) {
        if (this.useMock) {
            return this.mockUpdateHostel(id, updates);
        }
        
        try {
            const response = await apiService.put(AppConfig.ENDPOINTS.HOSTEL_BY_ID(id), updates);
            return {
                success: true,
                hostel: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async deleteHostel(id) {
        if (this.useMock) {
            return this.mockDeleteHostel(id);
        }
        
        try {
            await apiService.delete(AppConfig.ENDPOINTS.HOSTEL_BY_ID(id));
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // OFF-CAMPUS BOARDING HOUSES
    
    async getAllBoardingHouses() {
        if (this.useMock) {
            return this.mockGetAllBoardingHouses();
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.BOARDING_HOUSES);
            return {
                success: true,
                houses: response.data || response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                houses: []
            };
        }
    }

    async createBoardingHouse(houseData) {
        if (this.useMock) {
            return this.mockCreateBoardingHouse(houseData);
        }
        
        try {
            const response = await apiService.post(AppConfig.ENDPOINTS.BOARDING_HOUSES, houseData);
            return {
                success: true,
                house: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async updateBoardingHouse(id, updates) {
        if (this.useMock) {
            return this.mockUpdateBoardingHouse(id, updates);
        }
        
        try {
            const response = await apiService.put(AppConfig.ENDPOINTS.BOARDING_HOUSE_BY_ID(id), updates);
            return {
                success: true,
                house: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async deleteBoardingHouse(id) {
        if (this.useMock) {
            return this.mockDeleteBoardingHouse(id);
        }
        
        try {
            await apiService.delete(AppConfig.ENDPOINTS.BOARDING_HOUSE_BY_ID(id));
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // ROOMS
    
    async addRoom(hostelId, roomData, isOffCampus = false) {
        if (this.useMock) {
            return this.mockAddRoom(hostelId, roomData, isOffCampus);
        }
        
        try {
            const endpoint = isOffCampus 
                ? AppConfig.ENDPOINTS.BOARDING_HOUSE_ROOMS(hostelId)
                : AppConfig.ENDPOINTS.HOSTEL_ROOMS(hostelId);
            
            const response = await apiService.post(endpoint, roomData);
            return {
                success: true,
                room: response.data || response
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async deleteRoom(hostelId, roomId, isOffCampus = false) {
        if (this.useMock) {
            return this.mockDeleteRoom(hostelId, roomId, isOffCampus);
        }
        
        try {
            const endpoint = isOffCampus 
                ? `${AppConfig.ENDPOINTS.BOARDING_HOUSE_ROOMS(hostelId)}/${roomId}`
                : `${AppConfig.ENDPOINTS.HOSTEL_ROOMS(hostelId)}/${roomId}`;
            
            await apiService.delete(endpoint);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Upload image
    async uploadImage(file, type = 'hostel') {
        if (this.useMock) {
            return this.mockUploadImage(file);
        }
        
        try {
            const endpoint = type === 'hostel' 
                ? '/upload/hostel-image' 
                : '/upload/house-image';
            
            const response = await apiService.uploadFile(endpoint, file);
            return {
                success: true,
                imageUrl: response.url || response.imageUrl
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Mock implementations
    mockGetAllHostels() {
        const hostels = window.AppState?.onCampus?.hostels || [];
        return { success: true, hostels };
    }

    mockGetHostelById(id) {
        const hostels = window.AppState?.onCampus?.hostels || [];
        const hostel = hostels.find(h => h.id === id);
        return { success: true, hostel };
    }

    mockCreateHostel(hostelData) {
        const newHostel = {
            id: Date.now(),
            ...hostelData,
            rooms: []
        };
        if (window.AppState?.onCampus) {
            window.AppState.onCampus.hostels.push(newHostel);
        }
        return { success: true, hostel: newHostel };
    }

    mockUpdateHostel(id, updates) {
        const hostels = window.AppState?.onCampus?.hostels || [];
        const hostel = hostels.find(h => h.id === id);
        if (hostel) {
            Object.assign(hostel, updates);
            return { success: true, hostel };
        }
        return { success: false, message: 'Hostel not found' };
    }

    mockDeleteHostel(id) {
        if (window.AppState?.onCampus) {
            window.AppState.onCampus.hostels = window.AppState.onCampus.hostels.filter(h => h.id !== id);
        }
        return { success: true };
    }

    mockGetAllBoardingHouses() {
        const houses = window.AppState?.offCampus?.boardingHouses || [];
        return { success: true, houses };
    }

    mockCreateBoardingHouse(houseData) {
        const newHouse = {
            id: Date.now(),
            ...houseData,
            rooms: []
        };
        if (window.AppState?.offCampus) {
            window.AppState.offCampus.boardingHouses.push(newHouse);
        }
        return { success: true, house: newHouse };
    }

    mockUpdateBoardingHouse(id, updates) {
        const houses = window.AppState?.offCampus?.boardingHouses || [];
        const house = houses.find(h => h.id === id);
        if (house) {
            Object.assign(house, updates);
            return { success: true, house };
        }
        return { success: false, message: 'House not found' };
    }

    mockDeleteBoardingHouse(id) {
        if (window.AppState?.offCampus) {
            window.AppState.offCampus.boardingHouses = window.AppState.offCampus.boardingHouses.filter(h => h.id !== id);
        }
        return { success: true };
    }

    mockAddRoom(parentId, roomData, isOffCampus) {
        // Implementation depends on your data structure
        return { success: true, room: { id: Date.now(), ...roomData } };
    }

    mockDeleteRoom(parentId, roomId, isOffCampus) {
        return { success: true };
    }

    mockUploadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ success: true, imageUrl: e.target.result });
            };
            reader.readAsDataURL(file);
        });
    }
}

const accommodationService = new AccommodationService();
window.accommodationService = accommodationService;