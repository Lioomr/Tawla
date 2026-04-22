#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python manage.py showmigrations >/dev/null 2>&1; do
  sleep 2
done

echo "Applying migrations..."
python manage.py migrate --noinput

APP_ENV_VALUE="${APP_ENV:-development}"
DJANGO_DEBUG_VALUE="${DJANGO_DEBUG:-true}"

if [ "$APP_ENV_VALUE" = "production" ] || [ "$DJANGO_DEBUG_VALUE" = "false" ]; then
  echo "Starting Daphne ASGI server..."
  exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
fi

echo "Starting Django development server..."
exec python manage.py runserver 0.0.0.0:8000
