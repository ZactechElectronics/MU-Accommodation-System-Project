#!/bin/bash
set -o errexit

echo "--- Installing dependencies ---"
pip install -r requirements.txt

echo "--- Running migrations ---"
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "--- Creating superuser ---"
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@mu.edu.zm', 'Admin123!')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
EOF

echo "--- Collecting static files ---"
python manage.py collectstatic --noinput

echo "--- Build completed successfully ---"
