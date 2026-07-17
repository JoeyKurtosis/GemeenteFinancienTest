FROM python:3.12-slim

# System deps for psycopg (PostgreSQL client library)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -g 1000 django && useradd -u 1000 -g django -m django

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files (Django admin, DRF browsable API, etc.)
RUN SECRET_KEY=build-placeholder python manage.py collectstatic --noinput

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Own media directory
RUN mkdir -p /app/media && chown -R django:django /app/media /app/staticfiles

USER django

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--access-logfile", "-"]
