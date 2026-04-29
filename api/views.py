# api/views.py
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from django.db.models import Sum, Count
from django.contrib.auth import get_user_model

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': 'admin' if user.is_superuser else 'student',
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'student_id': getattr(user, 'student_id', None)
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Invalid username or password'
            }, status=401)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid request format'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)



User = get_user_model()


def get_dashboard_stats(request):
    """Get real dashboard statistics"""
    from .models import Hostel, Room, OffCampusHouse, OffCampusRoom, Application

    # Student statistics
    total_students = User.objects.filter(role='student').count()
    accommodated_students = User.objects.filter(role='student', allocations__status='active').distinct().count()

    # Application statistics
    pending_apps = Application.objects.filter(status='pending').count()
    approved_apps = Application.objects.filter(status='approved').count()

    # On-campus statistics
    total_on_rooms = Room.objects.count()
    taken_on = Room.objects.aggregate(total=Sum('current_occupancy'))['total'] or 0
    total_on_capacity = Room.objects.aggregate(total=Sum('capacity'))['total'] or 0
    available_on = total_on_capacity - taken_on

    # Off-campus statistics
    total_off_houses = OffCampusHouse.objects.filter(is_active=True).count()
    total_off_capacity = OffCampusHouse.objects.aggregate(total=Sum('total_bedspaces'))['total'] or 0
    taken_off = OffCampusHouse.objects.aggregate(total=Sum('current_occupancy'))['total'] or 0
    available_off = total_off_capacity - taken_off

    return JsonResponse({
        'total_students': total_students,
        'accommodated_students': accommodated_students,
        'pending_applications': pending_apps,
        'approved_applications': approved_apps,
        'on_campus': {
            'total_rooms': total_on_rooms,
            'available': available_on,
            'taken': taken_on,
            'total_capacity': total_on_capacity
        },
        'off_campus': {
            'total_houses': total_off_houses,
            'available': available_off,
            'taken': taken_off,
            'total_capacity': total_off_capacity
        }
    })