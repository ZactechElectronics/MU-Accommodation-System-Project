# muams/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # ADD THIS LINE - it was missing
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('admin-dashboard.html', TemplateView.as_view(template_name='admin-dashboard.html')),
    path('student-dashboard.html', TemplateView.as_view(template_name='student-dashboard.html')),
    path('applications.html', TemplateView.as_view(template_name='applications.html')),
    path('on-campus.html', TemplateView.as_view(template_name='on-campus.html')),
    path('off-campus.html', TemplateView.as_view(template_name='off-campus.html')),
    path('students.html', TemplateView.as_view(template_name='students.html')),
    path('analytics.html', TemplateView.as_view(template_name='analytics.html')),
    path('activity.html', TemplateView.as_view(template_name='activity.html')),
    path('settings.html', TemplateView.as_view(template_name='settings.html')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)