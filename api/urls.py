# api/urls.py - COMPLETE WORKING VERSION
from django.urls import path
from . import views

urlpatterns = [
    # ==================== AUTHENTICATION ====================
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),

    # ==================== DASHBOARD ====================
    path('dashboard/stats/', views.get_dashboard_stats, name='dashboard_stats'),

    # ==================== HOSTELS (ON-CAMPUS) ====================
    path('hostels/', views.get_hostels, name='get_hostels'),
    path('hostels/create/', views.create_hostel, name='create_hostel'),
    path('hostels/<int:hostel_id>/', views.get_hostel_detail, name='get_hostel_detail'),
    path('hostels/<int:hostel_id>/update/', views.update_hostel, name='update_hostel'),
    path('hostels/<int:hostel_id>/delete/', views.delete_hostel, name='delete_hostel'),

    # ==================== ROOMS ====================
    path('rooms/', views.get_rooms, name='rooms'),
    path('rooms/create/', views.create_room, name='create_room'),
    path('rooms/<int:room_id>/delete/', views.delete_room, name='delete_room'),
    path('rooms/available/', views.get_available_rooms, name='available_rooms'),

    # ==================== OFF-CAMPUS ====================
    path('off-campus/', views.get_off_campus, name='off_campus'),
    path('off-campus/create/', views.create_off_campus, name='create_off_campus'),
    path('off-campus/<int:house_id>/', views.get_off_campus_detail, name='off_campus_detail'),
    path('off-campus/<int:house_id>/update/', views.update_off_campus, name='update_off_campus'),
    path('off-campus/<int:house_id>/delete/', views.delete_off_campus, name='delete_off_campus'),
    path('off-campus/<int:house_id>/rooms/create/', views.create_off_campus_room, name='create_off_campus_room'),

    # ==================== APPLICATIONS ====================
    path('applications/', views.get_applications, name='applications'),
    path('applications/create/', views.create_application, name='create_application'),
    path('applications/<int:application_id>/approve/', views.approve_application, name='approve_application'),
    path('applications/<int:application_id>/reject/', views.reject_application, name='reject_application'),
    path('applications/<int:application_id>/revoke/', views.revoke_application, name='revoke_application'),
    path('applications/<int:application_id>/allocate/', views.allocate_room, name='allocate_room'),
    path('applications/<int:application_id>/accept-offer/', views.accept_offer, name='accept_offer'),
    path('applications/<int:application_id>/decline-offer/', views.decline_offer, name='decline_offer'),
    path('applications/<int:application_id>/offer-status/', views.check_offer_status, name='offer_status'),

    # ==================== STUDENTS ====================
    path('students/', views.get_students, name='students'),
    path('students/<int:student_id>/', views.get_student_detail, name='student_detail'),

    # ==================== ALLOCATIONS ====================
    path('allocations/', views.get_student_allocations, name='allocations'),
    path('allocations/student/<int:student_id>/', views.get_student_allocations, name='student_allocations'),

    # ==================== EXPORTS (CSV) ====================
    path('export/applications/', views.export_applications_csv, name='export_applications'),
    path('export/students/', views.export_students_csv, name='export_students'),
    path('export/allocations/', views.export_allocations_csv, name='export_allocations'),

    # ==================== ANALYTICS ====================
    path('analytics/data/', views.get_analytics_data, name='analytics_data'),

    # ==================== ACTIVITY LOGS ====================
    path('activities/', views.get_activity_logs, name='activity_logs'),
    path('activities/clear/', views.clear_activity_logs, name='clear_activity_logs'),
    path('activities/create/', views.create_activity_log, name='create_activity_log'),
    path('activities/test/', views.test_activity, name='test_activity'),
    path('users/me/', views.get_current_user, name='get_current_user'),
]