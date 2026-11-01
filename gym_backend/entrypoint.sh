#!/bin/sh
set -e

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Ensuring automation bot account exists..."
python manage.py setup_automation_bot || true

echo "==> Collecting static files..."
python manage.py collectstatic --noinput || true

echo "==> Starting Gunicorn production WSGI server on port ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-3} \
    --timeout ${GUNICORN_TIMEOUT:-120} \
    --access-logfile - \
    --error-logfile -

