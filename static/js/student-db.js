// student-db.js - Simulated School Database
const SchoolDatabase = (function() {
    // This simulates the university's central database
    // In production, this would be API calls to the actual school system
    
    const students = [
        {
            id: 1,
            studentNumber: '2024001',
            fullName: 'Muzandu Chinyamuka',
            program: 'Bachelor of Science in Computer Science',
            email: 'adonzactech@gmail.com',
            nrcNumber: '123456/78/9',
            phoneNumber: '+260 97 1234567',
            yearOfStudy: 3,
            enrollmentStatus: 'Active',
            campus: 'Main Campus',
            password: 'student123' // In real app, handled securely
        },
        {
            id: 2,
            studentNumber: '2024002',
            fullName: 'Thandiwe Banda',
            program: 'Bachelor of Business Administration',
            email: 'thandiwe.banda@edu.zm',
            nrcNumber: '987654/32/1',
            phoneNumber: '+260 96 7654321',
            yearOfStudy: 2,
            enrollmentStatus: 'Active',
            campus: 'Main Campus',
            password: 'student123'
        },
        {
            id: 3,
            studentNumber: '2024003',
            fullName: 'Chisomo Phiri',
            program: 'Bachelor of Engineering',
            email: 'chisomo.phiri@edu.zm',
            nrcNumber: '456789/12/3',
            phoneNumber: '+260 95 2345678',
            yearOfStudy: 4,
            enrollmentStatus: 'Active',
            campus: 'Main Campus',
            password: 'student123'
        }
    ];

    // Accommodation data (linked to student IDs)
    let accommodations = [
        {
            studentId: 1,
            status: 'accommodated', // 'not_applied', 'pending', 'approved', 'rejected', 'accommodated'
            applicationId: 301,
            applicationDate: '2026-03-15',
            type: 'on-campus',
            residencyName: 'Downschool Hostel',
            hostelName: 'Downschool',
            roomNumber: 'D102',
            boardingHouseName: null
        },
        {
            studentId: 2,
            status: 'pending',
            applicationId: 302,
            applicationDate: '2026-04-01',
            type: 'off-campus',
            preferredBoardingHouse: 'Sunset Lodge',
            residencyName: null,
            hostelName: null,
            roomNumber: null,
            boardingHouseName: null
        },
        {
            studentId: 3,
            status: 'not_applied',
            applicationId: null,
            applicationDate: null,
            type: null,
            residencyName: null,
            hostelName: null,
            roomNumber: null,
            boardingHouseName: null
        }
    ];

    // Available rooms/hostels data (shared with admin)
    const onCampusHostels = [
        {
            id: 'downschool',
            name: 'Downschool',
            rooms: [
                { id: 1, roomNumber: 'D101', capacity: 2, occupied: 0 },
                { id: 2, roomNumber: 'D102', capacity: 3, occupied: 1 },
                { id: 9, roomNumber: 'D103', capacity: 2, occupied: 0 }
            ]
        },
        {
            id: 'upschool',
            name: 'Upschool',
            rooms: [
                { id: 3, roomNumber: 'U201', capacity: 2, occupied: 2 },
                { id: 4, roomNumber: 'U202', capacity: 1, occupied: 0 }
            ]
        },
        {
            id: 'freshers',
            name: 'Freshers Compound',
            rooms: [
                { id: 5, roomNumber: 'F10', capacity: 4, occupied: 0 },
                { id: 6, roomNumber: 'F11', capacity: 2, occupied: 0 }
            ]
        },
        {
            id: 'sabbaticals',
            name: 'Sabbaticals',
            rooms: [
                { id: 7, roomNumber: 'S1', capacity: 1, occupied: 0 },
                { id: 8, roomNumber: 'S2', capacity: 2, occupied: 0 }
            ]
        }
    ];

    const offCampusHouses = [
        { id: 201, name: 'Sunset Lodge', address: '12 College Ave', totalBeds: 10, occupiedBeds: 4 },
        { id: 202, name: 'Maple House', address: '45 Elm St', totalBeds: 8, occupiedBeds: 0 },
        { id: 203, name: 'Riverside', address: '3 River Rd', totalBeds: 6, occupiedBeds: 0 }
    ];

    // Authentication simulation
    function authenticateStudent(studentNumber, password) {
        const student = students.find(s => s.studentNumber === studentNumber);
        if (student && password === 'student123') { // Simple demo check
            return { success: true, studentId: student.id };
        }
        return { success: false, message: 'Invalid credentials' };
    }

    // Get student by ID (after authentication)
    function getStudentById(studentId) {
        const student = students.find(s => s.id === studentId);
        const accommodation = accommodations.find(a => a.studentId === studentId) || {
            status: 'not_applied',
            applicationId: null,
            applicationDate: null,
            type: null
        };
        return { ...student, accommodation };
    }

    // Get accommodation details for student
    function getStudentAccommodation(studentId) {
        return accommodations.find(a => a.studentId === studentId) || {
            status: 'not_applied',
            applicationId: null,
            applicationDate: null
        };
    }

    // Submit application
    function submitApplication(studentId, applicationData) {
        const existing = accommodations.findIndex(a => a.studentId === studentId);
        const newApp = {
            studentId,
            status: 'pending',
            applicationId: Date.now(),
            applicationDate: new Date().toISOString().split('T')[0],
            ...applicationData
        };
        
        if (existing !== -1) {
            accommodations[existing] = { ...accommodations[existing], ...newApp };
        } else {
            accommodations.push(newApp);
        }
        return { success: true, applicationId: newApp.applicationId };
    }

    // Get available rooms
    function getAvailableOnCampusRooms() {
        return onCampusHostels;
    }

    function getAvailableOffCampusHouses() {
        return offCampusHouses;
    }

    return {
        authenticateStudent,
        getStudentById,
        getStudentAccommodation,
        submitApplication,
        getAvailableOnCampusRooms,
        getAvailableOffCampusHouses,
        // For demo: get logged in student (simulate session)
        getCurrentStudent: () => getStudentById(1) // Default to Muzandu
    };
})();