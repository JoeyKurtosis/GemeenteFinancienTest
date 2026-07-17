#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py load_iv3_data --skip-if-loaded

exec "$@"
