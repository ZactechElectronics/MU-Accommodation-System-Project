// Student Management Service
class StudentService {
    constructor() {
        this.useMock = AppConfig.USE_MOCK_API;
    }

    // Get all students
    async getAllStudents() {
        if (this.useMock) {
            return this.mockGetAllStudents();
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.STUDENTS);
            return {
                success: true,
                students: response.data || response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                students: []
            };
        }
    }

    // Get student by ID
    async getStudentById(id) {
        if (this.useMock) {
            return this.mockGetStudentById(id);
        }
        
        try {
            const response = await apiService.get(AppConfig.ENDPOINTS.STUDENT_BY_ID(id));
            return {
                success: true,
                student: response.data || response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                student: null
            };
        }
    }

    // Get student with accommodation
    async getStudentWithAccommodation(id) {
        if (this.useMock) {
            return AppDatabase.getStudentWithAccommodation(id);
        }
        
        try {
            const response = await apiService.get(`${AppConfig.ENDPOINTS.STUDENT_BY_ID(id)}?include=accommodation`);
            return response.data || response;
        } catch (error) {
            console.error('Error fetching student:', error);
            return null;
        }
    }

    // Update student
    async updateStudent(id, updates) {
        if (this.useMock) {
            return this.mockUpdateStudent(id, updates);
        }
        
        try {
            const response = await apiService.put(AppConfig.ENDPOINTS.STUDENT_BY_ID(id), updates);
            return {
                success: true,
                student: response.data || response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Mock implementations
    mockGetAllStudents() {
        const students = AppDatabase.users
            .filter(u => u.role === 'student')
            .map(u => ({ ...u, password: undefined }));
        return { success: true, students };
    }

    mockGetStudentById(id) {
        const student = AppDatabase.users.find(u => u.id === id);
        return { 
            success: true, 
            student: student ? { ...student, password: undefined } : null 
        };
    }

    mockUpdateStudent(id, updates) {
        const student = AppDatabase.users.find(u => u.id === id);
        if (student) {
            Object.assign(student, updates);
            return { success: true, student: { ...student, password: undefined } };
        }
        return { success: false, message: 'Student not found' };
    }
}

const studentService = new StudentService();
window.studentService = studentService;