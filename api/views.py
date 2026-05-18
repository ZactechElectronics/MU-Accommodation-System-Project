# api/views.py - Complete working version
import json
import csv
import io
import base64
import uuid
import os
from datetime import timedelta
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate, login
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings

User = get_user_model()


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# ==================== AUTHENTICATION ====================

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        user = authenticate(request, username=username, password=password)

        if user:
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
        return JsonResponse({'success': False, 'message': 'Invalid credentials'}, status=401)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    return JsonResponse({'success': True, 'message': 'Logged out'})


@csrf_exempt
@require_http_methods(["GET"])
def get_current_user(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': 'admin' if request.user.is_superuser else 'student',
            'student_id': getattr(request.user, 'student_id', None),
            'program': getattr(request.user, 'program', None),
            'year_of_study': getattr(request.user, 'year_of_study', None),
            'phone': getattr(request.user, 'phone', None),
        })
    return JsonResponse({'error': 'Not authenticated'}, status=401)


# ==================== DASHBOARD ====================

@csrf_exempt
@require_http_methods(["GET"])
def get_dashboard_stats(request):
    from .models import Hostel, Room, OffCampusHouse, Application, Allocation

    total_students = User.objects.filter(is_superuser=False).count()
    pending_apps = Application.objects.filter(status='pending').count()
    approved_apps = Application.objects.filter(status='approved').count()
    accommodated_students = Application.objects.filter(status='approved').values('student').distinct().count()

    total_rooms = Room.objects.count()
    total_room_capacity = Room.objects.aggregate(total=Sum('capacity'))['total'] or 0
    taken_rooms = Room.objects.aggregate(total=Sum('current_occupancy'))['total'] or 0

    total_houses = OffCampusHouse.objects.filter(is_active=True).count()
    total_bedspaces = OffCampusHouse.objects.aggregate(total=Sum('total_bedspaces'))['total'] or 0
    taken_bedspaces = OffCampusHouse.objects.aggregate(total=Sum('current_occupancy'))['total'] or 0

    return JsonResponse({
        'success': True,
        'total_students': total_students,
        'accommodated_students': accommodated_students,
        'pending_applications': pending_apps,
        'approved_applications': approved_apps,
        'on_campus': {
            'total_rooms': total_rooms,
            'available': total_room_capacity - taken_rooms,
            'taken': taken_rooms,
            'total_capacity': total_room_capacity
        },
        'off_campus': {
            'total_houses': total_houses,
            'available': total_bedspaces - taken_bedspaces,
            'taken': taken_bedspaces,
            'total_capacity': total_bedspaces
        }
    })


# ==================== APPLICATIONS ====================

@csrf_exempt
@require_http_methods(["GET"])
def get_applications(request):
    from .models import Application

    apps = Application.objects.select_related('student').all()
    data = []
    for a in apps:
        data.append({
            'id': a.id,
            'student_name': a.student.get_full_name(),
            'student_id': a.student.student_id or a.student.username,
            'student_email': a.student.email,
            'student_program': a.student.program,
            'type': a.type,
            'status': a.status,
            'created_at': a.created_at.strftime('%Y-%m-%d %H:%M'),
            'notes': a.notes
        })
    return JsonResponse({'success': True, 'applications': data})


@csrf_exempt
@require_http_methods(["POST"])
def approve_application(request, application_id):
    from .models import Application, ActivityLog

    try:
        app = Application.objects.get(id=application_id)
        if app.status != 'pending':
            return JsonResponse({'success': False, 'message': f'Already {app.status}'}, status=400)

        app.status = 'approved'
        app.processed_at = timezone.now()
        app.save()

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='approve',
            description=f'Application #{application_id} approved for {app.student.get_full_name()}',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Application approved'})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Application not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def reject_application(request, application_id):
    from .models import Application, ActivityLog

    try:
        data = json.loads(request.body) if request.body else {}
        reason = data.get('reason', 'No reason provided')

        app = Application.objects.get(id=application_id)
        if app.status != 'pending':
            return JsonResponse({'success': False, 'message': f'Already {app.status}'}, status=400)

        app.status = 'rejected'
        app.processed_at = timezone.now()
        app.rejection_reason = reason
        app.save()

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='reject',
            description=f'Application #{application_id} rejected for {app.student.get_full_name()}',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Application rejected'})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Application not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def revoke_application(request, application_id):
    from .models import Application, Allocation, ActivityLog

    try:
        app = Application.objects.get(id=application_id)
        if app.status != 'approved':
            return JsonResponse({'success': False, 'message': 'Only approved applications can be revoked'}, status=400)

        app.status = 'revoked'
        app.save()

        try:
            allocation = Allocation.objects.get(application=app)
            allocation.status = 'revoked'
            allocation.save()
        except:
            pass

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='revoke',
            description=f'Accommodation for application #{application_id} revoked',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Accommodation revoked'})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Application not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def allocate_room(request, application_id):
    from .models import Application, Allocation, Room, ActivityLog

    try:
        data = json.loads(request.body)
        room_id = data.get('room_id')

        app = Application.objects.get(id=application_id)
        if app.status != 'approved':
            return JsonResponse({'success': False, 'message': 'Application must be approved first'}, status=400)

        room = Room.objects.get(id=room_id)
        if room.current_occupancy >= room.capacity:
            return JsonResponse({'success': False, 'message': 'Room is full'}, status=400)

        allocation = Allocation.objects.create(
            student=app.student,
            application=app,
            hostel=room.hostel,
            room=room,
            status='active',
            allocated_by=request.user if request.user.is_authenticated else None
        )

        room.current_occupancy += 1
        room.save()

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='allocate',
            description=f'Room {room.room_number} allocated to {app.student.get_full_name()}',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Room allocated successfully', 'allocation_id': allocation.id})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_available_rooms(request):
    from .models import Room

    rooms = Room.objects.filter(current_occupancy__lt=F('capacity')).select_related('hostel')
    data = []
    for r in rooms:
        data.append({
            'id': r.id,
            'room_number': r.room_number,
            'hostel_id': r.hostel.id,
            'hostel_name': r.hostel.name,
            'capacity': r.capacity,
            'current_occupancy': r.current_occupancy,
            'available_spaces': r.capacity - r.current_occupancy
        })
    return JsonResponse({'success': True, 'rooms': data})


@csrf_exempt
@require_http_methods(["GET"])
def get_student_allocations(request, student_id=None):
    from .models import Allocation

    if student_id:
        allocations = Allocation.objects.filter(student_id=student_id, status='active')
    else:
        allocations = Allocation.objects.filter(status='active')

    data = []
    for a in allocations:
        data.append({
            'id': a.id,
            'student_name': a.student.get_full_name(),
            'student_id': a.student.student_id or a.student.username,
            'hostel_name': a.hostel.name if a.hostel else None,
            'room_number': a.room.room_number if a.room else None,
            'allocated_at': a.allocated_at.strftime('%Y-%m-%d %H:%M')
        })
    return JsonResponse({'success': True, 'allocations': data})


@csrf_exempt
@require_http_methods(["POST"])
def accept_offer(request, application_id):
    from .models import Application, ActivityLog

    try:
        app = Application.objects.get(id=application_id)
        if app.status != 'approved':
            return JsonResponse({'success': False, 'message': 'No offer available'}, status=400)

        if app.offer_expires_at and app.offer_expires_at < timezone.now():
            app.status = 'expired'
            app.save()
            return JsonResponse({'success': False, 'message': 'Offer has expired'}, status=400)

        app.offer_accepted = True
        app.offer_accepted_at = timezone.now()
        app.status = 'accommodated'
        app.save()

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='accept',
            description=f'Student {app.student.get_full_name()} accepted accommodation offer',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Offer accepted! Room will be allocated soon.'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def decline_offer(request, application_id):
    from .models import Application, ActivityLog

    try:
        app = Application.objects.get(id=application_id)
        if app.status != 'approved':
            return JsonResponse({'success': False, 'message': 'No offer available'}, status=400)

        app.status = 'declined'
        app.save()

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='decline',
            description=f'Student {app.student.get_full_name()} declined accommodation offer',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Offer declined'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def check_offer_status(request, application_id):
    from .models import Application

    try:
        app = Application.objects.get(id=application_id)
        return JsonResponse({
            'success': True,
            'status': app.status,
            'offer_accepted': app.offer_accepted,
            'offer_expires_at': app.offer_expires_at.strftime('%Y-%m-%d %H:%M') if app.offer_expires_at else None
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==================== EXPORTS ====================

@csrf_exempt
@require_http_methods(["GET"])
def export_applications_csv(request):
    from .models import Application

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="applications.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Student Name', 'Student ID', 'Email', 'Program', 'Type', 'Status', 'Date'])

    apps = Application.objects.select_related('student').all()
    for a in apps:
        writer.writerow([
            a.id, a.student.get_full_name(), a.student.student_id or a.student.username, a.student.email,
            a.student.program or '', a.type, a.status, a.created_at.strftime('%Y-%m-%d')
        ])

    return response


@csrf_exempt
@require_http_methods(["GET"])
def export_students_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="students.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Student ID', 'Name', 'Email', 'Program', 'Year'])

    students = User.objects.filter(is_superuser=False)
    for s in students:
        writer.writerow([
            s.id, s.student_id or s.username, s.get_full_name(), s.email,
            s.program or '', s.year_of_study or ''
        ])

    return response


@csrf_exempt
@require_http_methods(["GET"])
def export_allocations_csv(request):
    from .models import Allocation

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="allocations.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Student Name', 'Student ID', 'Hostel', 'Room', 'Date'])

    allocations = Allocation.objects.select_related('student', 'hostel', 'room').filter(status='active')
    for a in allocations:
        writer.writerow([
            a.id, a.student.get_full_name(), a.student.student_id or a.student.username,
            a.hostel.name if a.hostel else 'N/A',
            a.room.room_number if a.room else 'N/A',
            a.allocated_at.strftime('%Y-%m-%d')
        ])

    return response


# ==================== HOSTELS ====================

@csrf_exempt
@require_http_methods(["GET"])
def get_hostels(request):
    from .models import Hostel

    hostels = Hostel.objects.filter(is_active=True)
    data = []
    for h in hostels:
        image_url = None
        if h.image:
            if hasattr(h.image, 'url'):
                image_url = h.image.url
            elif isinstance(h.image, str):
                image_url = h.image
            else:
                image_url = str(h.image)

        data.append({
            'id': h.id,
            'name': h.name,
            'location': h.location,
            'gender_policy': h.gender_policy,
            'total_capacity': h.total_capacity,
            'current_occupancy': h.current_occupancy,
            'description': h.description,
            'image': image_url
        })
    return JsonResponse({'success': True, 'hostels': data})


@csrf_exempt
@require_http_methods(["POST"])
def create_hostel(request):
    from .models import Hostel

    try:
        name = request.POST.get('name')
        location = request.POST.get('location')
        gender_policy = request.POST.get('gender_policy', 'mixed')
        total_capacity = request.POST.get('total_capacity', 0)
        description = request.POST.get('description', '')
        image = request.FILES.get('image')

        if not name:
            return JsonResponse({'success': False, 'message': 'Hostel name is required'}, status=400)

        hostel = Hostel.objects.create(
            name=name,
            location=location,
            gender_policy=gender_policy,
            total_capacity=total_capacity,
            current_occupancy=0,
            description=description
        )

        if image:
            if image.size > 5 * 1024 * 1024:
                return JsonResponse({'success': False, 'message': 'Image too large. Max 5MB'}, status=400)

            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if image.content_type not in allowed_types:
                return JsonResponse({'success': False, 'message': 'Invalid image type'}, status=400)

            hostel.image = image
            hostel.save()

        image_url = None
        if hostel.image:
            try:
                image_url = hostel.image.url
            except:
                image_url = None

        return JsonResponse({
            'success': True,
            'message': 'Hostel created successfully',
            'hostel': {'id': hostel.id, 'name': hostel.name, 'image': image_url}
        }, status=201)

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT"])
def update_hostel(request, hostel_id):
    from .models import Hostel

    try:
        hostel = Hostel.objects.get(id=hostel_id)
        content_type = request.content_type or ''

        if 'application/json' in content_type:
            data = json.loads(request.body)
            name = data.get('name')
            location = data.get('location')
            gender_policy = data.get('gender_policy')
            total_capacity = data.get('total_capacity')
            description = data.get('description')
            image = None
        else:
            name = request.POST.get('name')
            location = request.POST.get('location')
            gender_policy = request.POST.get('gender_policy')
            total_capacity = request.POST.get('total_capacity')
            description = request.POST.get('description')
            image = request.FILES.get('image')

        if name:
            hostel.name = name
        if location:
            hostel.location = location
        if gender_policy:
            hostel.gender_policy = gender_policy
        if total_capacity:
            hostel.total_capacity = int(total_capacity)
        if description is not None:
            hostel.description = description

        if image:
            if image.size > 5 * 1024 * 1024:
                return JsonResponse({'success': False, 'message': 'Image too large. Max 5MB'}, status=400)

            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if image.content_type not in allowed_types:
                return JsonResponse({'success': False, 'message': 'Invalid image type'}, status=400)

            if hostel.image:
                try:
                    hostel.image.delete(save=False)
                except:
                    pass

            hostel.image = image

        hostel.save()

        image_url = None
        if hostel.image:
            try:
                image_url = hostel.image.url
            except:
                image_url = None

        return JsonResponse({
            'success': True,
            'message': 'Hostel updated successfully',
            'hostel': {'id': hostel.id, 'name': hostel.name, 'image': image_url}
        })

    except Hostel.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Hostel not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_hostel(request, hostel_id):
    from .models import Hostel, Room

    try:
        hostel = Hostel.objects.get(id=hostel_id)
        name = hostel.name

        hostel.rooms.all().delete()

        if hostel.image:
            try:
                hostel.image.delete(save=False)
            except Exception as e:
                print(f"Error deleting image: {e}")

        hostel.delete()

        return JsonResponse({'success': True, 'message': f'Hostel "{name}" deleted successfully'})

    except Hostel.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Hostel not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_hostel_detail(request, hostel_id):
    from .models import Hostel, Room

    try:
        hostel = Hostel.objects.get(id=hostel_id)
        rooms = hostel.rooms.all()

        image_url = None
        if hostel.image:
            if hasattr(hostel.image, 'url'):
                image_url = hostel.image.url
            elif isinstance(hostel.image, str):
                image_url = hostel.image
            else:
                image_url = str(hostel.image)

        return JsonResponse({
            'success': True,
            'hostel': {
                'id': hostel.id,
                'name': hostel.name,
                'location': hostel.location,
                'gender_policy': hostel.gender_policy,
                'total_capacity': hostel.total_capacity,
                'current_occupancy': hostel.current_occupancy,
                'description': hostel.description,
                'image': image_url,
                'rooms': [
                    {
                        'id': r.id,
                        'room_number': r.room_number,
                        'capacity': r.capacity,
                        'current_occupancy': r.current_occupancy,
                        'available': r.capacity - r.current_occupancy
                    }
                    for r in rooms
                ]
            }
        })

    except Hostel.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Hostel not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==================== ROOMS ====================

@csrf_exempt
@require_http_methods(["POST"])
def create_room(request):
    from .models import Hostel, Room

    try:
        data = json.loads(request.body)
        hostel = Hostel.objects.get(id=data['hostel_id'])
        room = Room.objects.create(
            hostel=hostel,
            room_number=data['room_number'],
            capacity=data.get('capacity', 2)
        )
        hostel.total_capacity += room.capacity
        hostel.save()

        return JsonResponse({'success': True, 'message': 'Room created', 'id': room.id}, status=201)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_room(request, room_id):
    from .models import Room, Hostel

    try:
        room = Room.objects.get(id=room_id)
        hostel = room.hostel
        hostel.total_capacity -= room.capacity
        hostel.save()
        room.delete()
        return JsonResponse({'success': True, 'message': 'Room deleted'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_rooms(request):
    from .models import Room

    rooms = Room.objects.select_related('hostel').all()
    data = [{
        'id': r.id,
        'room_number': r.room_number,
        'hostel_name': r.hostel.name,
        'capacity': r.capacity,
        'current_occupancy': r.current_occupancy,
        'available': r.capacity - r.current_occupancy
    } for r in rooms]
    return JsonResponse({'success': True, 'rooms': data})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def manage_rooms(request, hostel_id):
    from .models import Hostel, Room

    if request.method == 'GET':
        rooms = Room.objects.filter(hostel_id=hostel_id)
        data = [
            {'id': r.id, 'room_number': r.room_number, 'capacity': r.capacity, 'current_occupancy': r.current_occupancy}
            for r in rooms]
        return JsonResponse({'success': True, 'rooms': data})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            hostel = Hostel.objects.get(id=hostel_id)
            room = Room.objects.create(
                hostel=hostel,
                room_number=data['room_number'],
                capacity=data.get('capacity', 2)
            )
            return JsonResponse({'success': True, 'message': 'Room created', 'id': room.id}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==================== OFF-CAMPUS ====================

@csrf_exempt
@require_http_methods(["GET"])
def get_off_campus(request):
    from .models import OffCampusHouse, OffCampusRoom

    houses = OffCampusHouse.objects.filter(is_active=True)
    data = []
    for h in houses:
        rooms = OffCampusRoom.objects.filter(house=h)
        image_url = None
        if h.image:
            if hasattr(h.image, 'url'):
                image_url = h.image.url
            elif isinstance(h.image, str):
                image_url = h.image
            else:
                image_url = str(h.image)

        data.append({
            'id': h.id,
            'name': h.name,
            'address': h.address,
            'gender_policy': h.gender_policy,
            'total_bedspaces': h.total_bedspaces,
            'current_occupancy': h.current_occupancy,
            'distance_km': float(h.distance_km) if h.distance_km else 0,
            'landlord_name': h.landlord_name,
            'landlord_phone': h.landlord_phone,
            'description': h.description,
            'image': image_url,
            'rooms': [{'id': r.id, 'room_number': r.room_number, 'capacity': r.capacity, 'price': float(r.price)} for r in rooms]
        })
    return JsonResponse({'success': True, 'houses': data})


@csrf_exempt
@require_http_methods(["POST"])
def create_off_campus(request):
    from .models import OffCampusHouse

    try:
        name = request.POST.get('name')
        address = request.POST.get('address')
        gender_policy = request.POST.get('gender_policy', 'mixed')
        total_bedspaces = request.POST.get('total_bedspaces', 0)
        distance_km = request.POST.get('distance_km', 0)
        landlord_name = request.POST.get('landlord_name', '')
        landlord_phone = request.POST.get('landlord_phone', '')
        description = request.POST.get('description', '')
        image = request.FILES.get('image')

        if not name:
            return JsonResponse({'success': False, 'message': 'House name is required'}, status=400)

        image_path = None
        if image:
            ext = image.name.split('.')[-1]
            image_name = f"house_{uuid.uuid4().hex}.{ext}"
            saved_path = default_storage.save(f'houses/{image_name}', ContentFile(image.read()))
            image_path = f"{settings.MEDIA_URL}houses/{image_name}"

        house = OffCampusHouse.objects.create(
            name=name,
            address=address,
            gender_policy=gender_policy,
            total_bedspaces=total_bedspaces,
            distance_km=distance_km,
            landlord_name=landlord_name,
            landlord_phone=landlord_phone,
            description=description,
            image=image_path
        )

        return JsonResponse({'success': True, 'message': 'Boarding house created', 'id': house.id}, status=201)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_off_campus_detail(request, house_id):
    from .models import OffCampusHouse, OffCampusRoom

    try:
        house = OffCampusHouse.objects.get(id=house_id)
        rooms = OffCampusRoom.objects.filter(house=house)

        image_url = None
        if house.image:
            if hasattr(house.image, 'url'):
                image_url = house.image.url
            elif isinstance(house.image, str):
                image_url = house.image
            else:
                image_url = str(house.image)

        return JsonResponse({
            'success': True,
            'house': {
                'id': house.id,
                'name': house.name,
                'address': house.address,
                'gender_policy': house.gender_policy,
                'total_bedspaces': house.total_bedspaces,
                'current_occupancy': house.current_occupancy,
                'distance_km': float(house.distance_km) if house.distance_km else 0,
                'landlord_name': house.landlord_name,
                'landlord_phone': house.landlord_phone,
                'description': house.description,
                'image': image_url,
                'rooms': [{'id': r.id, 'room_number': r.room_number, 'capacity': r.capacity, 'price': float(r.price)} for r in rooms]
            }
        })
    except OffCampusHouse.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'House not found'}, status=404)


@csrf_exempt
@require_http_methods(["PUT"])
def update_off_campus(request, house_id):
    from .models import OffCampusHouse

    try:
        house = OffCampusHouse.objects.get(id=house_id)
        content_type = request.content_type or ''

        if 'application/json' in content_type:
            data = json.loads(request.body)
            name = data.get('name')
            address = data.get('address')
            gender_policy = data.get('gender_policy')
            total_bedspaces = data.get('total_bedspaces')
            distance_km = data.get('distance_km')
            landlord_name = data.get('landlord_name')
            landlord_phone = data.get('landlord_phone')
            description = data.get('description')
            image = None
        else:
            name = request.POST.get('name')
            address = request.POST.get('address')
            gender_policy = request.POST.get('gender_policy')
            total_bedspaces = request.POST.get('total_bedspaces')
            distance_km = request.POST.get('distance_km')
            landlord_name = request.POST.get('landlord_name')
            landlord_phone = request.POST.get('landlord_phone')
            description = request.POST.get('description')
            image = request.FILES.get('image')

        if name:
            house.name = name
        if address:
            house.address = address
        if gender_policy:
            house.gender_policy = gender_policy
        if total_bedspaces:
            house.total_bedspaces = int(total_bedspaces)
        if distance_km is not None:
            house.distance_km = float(distance_km)
        if landlord_name is not None:
            house.landlord_name = landlord_name
        if landlord_phone is not None:
            house.landlord_phone = landlord_phone
        if description is not None:
            house.description = description

        if image:
            if house.image and isinstance(house.image, str):
                old_path = house.image.replace(settings.MEDIA_URL, '')
                if default_storage.exists(old_path):
                    default_storage.delete(old_path)
            ext = image.name.split('.')[-1]
            image_name = f"house_{uuid.uuid4().hex}.{ext}"
            saved_path = default_storage.save(f'houses/{image_name}', ContentFile(image.read()))
            house.image = f"{settings.MEDIA_URL}houses/{image_name}"

        house.save()

        return JsonResponse({
            'success': True,
            'message': 'House updated successfully',
            'house': {'id': house.id, 'name': house.name, 'image': house.image}
        })

    except OffCampusHouse.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'House not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_off_campus(request, house_id):
    from .models import OffCampusHouse, OffCampusRoom

    try:
        house = OffCampusHouse.objects.get(id=house_id)
        OffCampusRoom.objects.filter(house=house).delete()

        if house.image and isinstance(house.image, str):
            old_path = house.image.replace(settings.MEDIA_URL, '')
            if default_storage.exists(old_path):
                default_storage.delete(old_path)

        house.delete()
        return JsonResponse({'success': True, 'message': 'House deleted successfully'})
    except OffCampusHouse.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'House not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def create_off_campus_room(request, house_id):
    from .models import OffCampusHouse, OffCampusRoom

    try:
        data = json.loads(request.body)
        house = OffCampusHouse.objects.get(id=house_id)

        room = OffCampusRoom.objects.create(
            house=house,
            room_number=data.get('room_number'),
            capacity=data.get('capacity', 1),
            price=data.get('price', 0)
        )

        house.total_bedspaces += room.capacity
        house.save()

        return JsonResponse({'success': True, 'message': 'Room added', 'id': room.id}, status=201)
    except OffCampusHouse.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'House not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==================== STUDENTS ====================

@csrf_exempt
@require_http_methods(["GET"])
def get_students(request):
    """Get all students - all non-superusers"""
    students = User.objects.filter(is_superuser=False)
    data = []
    for s in students:
        first_name = s.first_name or ''
        last_name = s.last_name or ''
        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = s.username or 'N/A'

        data.append({
            'id': s.id,
            'student_id': s.student_id or s.username,
            'first_name': first_name,
            'last_name': last_name,
            'name': full_name,
            'email': s.email or 'N/A',
            'program': s.program or 'N/A',
            'year_of_study': s.year_of_study or 1,
            'phone': s.phone or '',
            'has_carry_courses': getattr(s, 'has_carry_courses', False),
            'enrollment_status': getattr(s, 'enrollment_status', 'Active')
        })
    return JsonResponse({'success': True, 'students': data})


@csrf_exempt
@require_http_methods(["GET"])
def get_student_detail(request, student_id):
    from .models import User

    try:
        student = User.objects.get(id=student_id)
        return JsonResponse({
            'success': True,
            'student': {
                'id': student.id,
                'student_id': student.student_id or student.username,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email,
                'program': student.program,
                'year_of_study': student.year_of_study,
                'phone': student.phone,
                'has_carry_courses': getattr(student, 'has_carry_courses', False),
                'enrollment_status': getattr(student, 'enrollment_status', 'Active')
            }
        })
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found'}, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def create_application(request):
    from .models import Application, User, ActivityLog

    try:
        data = json.loads(request.body)
        student = User.objects.get(id=data['student_id'])

        if getattr(student, 'has_carry_courses', False):
            return JsonResponse(
                {'success': False, 'message': 'Students with carry-over courses are not eligible'},
                status=400)

        if getattr(student, 'enrollment_status', 'Active') != 'Active':
            return JsonResponse(
                {'success': False, 'message': 'Your enrollment status does not allow application'},
                status=400)

        existing = Application.objects.filter(student=student,
                                              status__in=['pending', 'approved', 'accommodated']).exists()
        if existing:
            return JsonResponse({'success': False, 'message': 'You already have an active application'}, status=400)

        app = Application.objects.create(
            student=student,
            type=data['type'],
            notes=data.get('notes', ''),
            status='pending'
        )

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='create',
            description=f'Student {student.get_full_name()} submitted application',
            ip_address=get_client_ip(request)
        )

        return JsonResponse({'success': True, 'message': 'Application submitted', 'id': app.id}, status=201)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==================== ANALYTICS ====================

@csrf_exempt
@require_http_methods(["GET"])
def get_analytics_data(request):
    try:
        from .models import Application, Allocation, Hostel, OffCampusHouse, Room

        total_apps = Application.objects.count()
        pending = Application.objects.filter(status='pending').count()
        approved = Application.objects.filter(status='approved').count()
        rejected = Application.objects.filter(status='rejected').count()

        on_campus = Allocation.objects.filter(hostel__isnull=False, status='active').count()
        off_campus = Allocation.objects.filter(off_campus_house__isnull=False, status='active').count()
        total_students = User.objects.filter(is_superuser=False).count()
        not_accommodated = max(0, total_students - (on_campus + off_campus))

        hostels = Hostel.objects.filter(is_active=True)
        hostel_names = [h.name for h in hostels]
        hostel_capacities = [h.total_capacity for h in hostels]
        hostel_occupancies = [h.current_occupancy for h in hostels]

        trend_dates = []
        trend_counts = []
        for i in range(6, -1, -1):
            date = timezone.now().date() - timedelta(days=i)
            count = Application.objects.filter(created_at__date=date).count()
            trend_dates.append(date.strftime('%d/%m'))
            trend_counts.append(count)

        return JsonResponse({
            'success': True,
            'stats': {
                'total_applications': total_apps,
                'pending_applications': pending,
                'approved_applications': approved,
                'rejected_applications': rejected,
                'on_campus_occupancy': on_campus,
                'off_campus_occupancy': off_campus,
                'not_accommodated': not_accommodated,
                'total_hostels': hostels.count(),
                'total_rooms': Room.objects.count(),
                'total_off_campus': OffCampusHouse.objects.filter(is_active=True).count()
            },
            'trend': {'dates': trend_dates, 'counts': trend_counts},
            'hostels': {'names': hostel_names, 'capacities': hostel_capacities, 'occupancies': hostel_occupancies},
            'distribution': {'on_campus': on_campus, 'off_campus': off_campus, 'not_accommodated': not_accommodated},
            'status': {'pending': pending, 'approved': approved, 'rejected': rejected}
        })

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ==================== ACTIVITY LOGS ====================
@csrf_exempt
@require_http_methods(["GET"])
def get_activity_logs(request):
    from .models import ActivityLog

    logs = ActivityLog.objects.select_related('user').all().order_by('-created_at')[:100]

    data = []
    for log in logs:
        # Convert to ISO string for proper frontend parsing
        created_at = log.created_at.isoformat() if log.created_at else None

        data.append({
            'id': log.id,
            'action': log.action,
            'action_type': log.action,
            'description': log.description,
            'user': log.user.username if log.user else 'SYSTEM',
            'username': log.user.username if log.user else 'SYSTEM',
            'user_full_name': log.user.get_full_name() if log.user else 'SYSTEM',
            'ip_address': log.ip_address,
            'created_at': created_at,
            'timestamp': created_at
        })

    return JsonResponse({
        'success': True,
        'logs': data,
        'total': len(data)
    })

@csrf_exempt
@require_http_methods(["DELETE"])
def clear_activity_logs(request):
    from .models import ActivityLog

    ActivityLog.objects.all().delete()
    return JsonResponse({'success': True, 'message': 'Activity logs cleared'})


@csrf_exempt
@require_http_methods(["POST"])
def create_activity_log(request):
    from .models import ActivityLog

    try:
        data = json.loads(request.body)
        log = ActivityLog.objects.create(
            action=data.get('action', 'info'),
            description=data.get('description', '')
        )
        return JsonResponse({'success': True, 'id': log.id}, status=201)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==================== TEST ENDPOINT ====================

@csrf_exempt
@require_http_methods(["GET"])
def test_activity(request):
    """Test endpoint to create a sample activity"""
    from .models import ActivityLog

    log = ActivityLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action='test',
        description='Test activity from browser',
        ip_address=get_client_ip(request)
    )

    return JsonResponse({
        'success': True,
        'message': 'Test activity created',
        'log_id': log.id,
        'total_logs': ActivityLog.objects.count()
    })