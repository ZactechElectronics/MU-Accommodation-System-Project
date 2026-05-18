
# api/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser


# ==================== USER MODEL ====================

class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('admin', 'Administrator'),
    ]

    ENROLLMENT_STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Suspended', 'Suspended'),
        ('Graduated', 'Graduated'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    phone = models.CharField(max_length=20, blank=True, null=True)
    nrc = models.CharField(max_length=20, blank=True, null=True)
    student_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    program = models.CharField(max_length=200, blank=True, null=True)
    year_of_study = models.IntegerField(blank=True, null=True)
    has_carry_courses = models.BooleanField(default=False, help_text="Does the student have carry-over courses?")
    enrollment_status = models.CharField(max_length=20, choices=ENROLLMENT_STATUS_CHOICES, default='Active')

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='api_user_set',
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='api_user_set',
        blank=True,
    )

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.username

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username


# ==================== HOSTEL MODEL ====================

class Hostel(models.Model):
    LOCATION_CHOICES = [
        ('upschool', 'Up-School'),
        ('downschool', 'Down-School'),
        ('freshers', 'Freshers Compound'),
    ]

    GENDER_CHOICES = [
        ('male', 'Male Only'),
        ('female', 'Female Only'),
        ('mixed', 'Mixed'),
    ]

    TYPE_CHOICES = [
        ('hostel', 'Hostel'),
        ('sabbatical', 'Sabbatical House'),
    ]

    name = models.CharField(max_length=200)
    location = models.CharField(max_length=20, choices=LOCATION_CHOICES)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='hostel')
    gender_policy = models.CharField(max_length=10, choices=GENDER_CHOICES, default='mixed')
    total_capacity = models.IntegerField(default=0)
    current_occupancy = models.IntegerField(default=0)
    image = models.ImageField(upload_to='hostels/', blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hostels'

    def __str__(self):
        return self.name


# ==================== ROOM MODEL ====================

class Room(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=50)
    capacity = models.IntegerField(default=2)
    current_occupancy = models.IntegerField(default=0)
    floor = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'rooms'
        unique_together = ['hostel', 'room_number']

    def __str__(self):
        return f"{self.hostel.name} - Room {self.room_number}"


# ==================== OFF-CAMPUS HOUSE MODEL ====================

class OffCampusHouse(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male Only'),
        ('female', 'Female Only'),
        ('mixed', 'Mixed'),
    ]

    name = models.CharField(max_length=200)
    address = models.TextField()
    gender_policy = models.CharField(max_length=10, choices=GENDER_CHOICES, default='mixed')
    total_bedspaces = models.IntegerField(default=0)
    current_occupancy = models.IntegerField(default=0)
    distance_km = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    image = models.ImageField(upload_to='offcampus/', blank=True, null=True)
    description = models.TextField(blank=True)
    landlord_name = models.CharField(max_length=200, blank=True)
    landlord_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'off_campus_houses'

    def __str__(self):
        return self.name


# ==================== OFF-CAMPUS ROOM MODEL ====================

class OffCampusRoom(models.Model):
    house = models.ForeignKey(OffCampusHouse, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=50)
    capacity = models.IntegerField(default=1)
    current_occupancy = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'off_campus_rooms'
        unique_together = ['house', 'room_number']

    def __str__(self):
        return f"{self.house.name} - Room {self.room_number}"


# ==================== APPLICATION MODEL ====================

class Application(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revoked', 'Revoked'),
    ]

    TYPE_CHOICES = [
        ('on-campus', 'On-Campus'),
        ('off-campus', 'Off-Campus'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    preferred_hostel = models.ForeignKey(Hostel, on_delete=models.SET_NULL, null=True, blank=True)
    preferred_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    preferred_house = models.ForeignKey(OffCampusHouse, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='processed_applications')
    offer_sent_at = models.DateTimeField(blank=True, null=True)
    offer_expires_at = models.DateTimeField(blank=True, null=True)
    offer_accepted = models.BooleanField(default=False)
    offer_accepted_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    revocation_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'applications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} - {self.status}"


# ==================== ALLOCATION MODEL ====================

class Allocation(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('revoked', 'Revoked'),
        ('completed', 'Completed'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='allocations')
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='allocation')
    hostel = models.ForeignKey(Hostel, on_delete=models.SET_NULL, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    off_campus_house = models.ForeignKey(OffCampusHouse, on_delete=models.SET_NULL, null=True, blank=True)
    off_campus_room = models.ForeignKey(OffCampusRoom, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    allocated_at = models.DateTimeField(auto_now_add=True)
    allocated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='allocations_made')
    revocation_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'allocations'

    def __str__(self):
        student_name = self.student.get_full_name() or self.student.username
        return f"{student_name} - {self.get_accommodation_display()}"

    def get_accommodation_display(self):
        if self.hostel and self.room:
            return f"{self.hostel.name}, Room {self.room.room_number}"
        elif self.off_campus_house and self.off_campus_room:
            return f"{self.off_campus_house.name}, Room {self.off_campus_room.room_number}"
        return "Not allocated"


# ==================== ACTIVITY LOG MODEL ====================

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('revoke', 'Revoke'),
        ('allocate', 'Allocate'),
        ('accept', 'Accept'),
        ('decline', 'Decline'),
        ('test', 'Test'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        user_name = self.user.username if self.user else 'System'
        return f"{user_name} - {self.action} - {self.created_at}"