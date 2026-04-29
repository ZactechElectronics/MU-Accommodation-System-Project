# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('auth/login/', views.login_view, name='login'),
    path('dashboard/stats/', views.get_dashboard_stats, name='dashboard_stats'),
]