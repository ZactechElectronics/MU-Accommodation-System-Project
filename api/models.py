# api/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('admin', 'Administrator'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    phone = models.CharField(max_length=20, blank=True, null=True)
    student_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    program = models.CharField(max_length=200, blank=True, null=True)
    year_of_study = models.IntegerField(blank=True, null=True)

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
    image = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hostels'

    def __str__(self):
        return self.name


class Room(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=50)
    capacity = models.IntegerField(default=2)
    current_occupancy = models.IntegerField(default=0)
    floor = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'rooms'

    def __str__(self):
        return f"{self.hostel.name} - Room {self.room_number}"


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
    image = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True)
    landlord_name = models.CharField(max_length=200, blank=True)
    landlord_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'off_campus_houses'

    def __str__(self):
        return self.name


class OffCampusRoom(models.Model):
    house = models.ForeignKey(OffCampusHouse, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=50)
    capacity = models.IntegerField(default=1)
    current_occupancy = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'off_campus_rooms'

    def __str__(self):
        return f"{self.house.name} - Room {self.room_number}"


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

    class Meta:
        db_table = 'applications'

    def __str__(self):
        return f"{self.student.username} - {self.status}"


class Allocation(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('revoked', 'Revoked'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='allocations')
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='allocation')
    hostel = models.ForeignKey(Hostel, on_delete=models.SET_NULL, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    allocated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'allocations'

    def __str__(self):
        return f"{self.student.username} - {self.status}"