import os
from pathlib import Path

from dotenv import load_dotenv

from config.database import get_default_database, get_iv3_database
from config.secrets import read_secret

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-me-in-production")

DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

DEVMODE = os.getenv("DEVMODE", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    "gemeentefinancien.test.kurtosis.nl",
    "localhost",
    "127.0.0.1",
] 

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "users",
    "support",
    "iv3",
    "chat",
    "comments",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "iv3.middleware.Iv3RequestCacheMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": get_default_database(),
    "iv3": get_iv3_database(),
}
if not DEVMODE:
    DB_SECRET = read_secret("test/iv3/PostgreSQL")
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": DB_SECRET["dbname"],
        "USER": DB_SECRET["username"],
        "PASSWORD": DB_SECRET["password"],
        "HOST": DB_SECRET["host"],
        "PORT": DB_SECRET.get("port", "5432"),
    }

DATABASE_ROUTERS = ["config.routers.Iv3Router"]

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "gemeentefinancien",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "nl"
TIME_ZONE = "Europe/Amsterdam"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# CORS
_extra_origins = [o for o in os.getenv("CORS_ORIGINS", "").split(",") if o]
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "https://gemeentefinancien.test.kurtosis.nl"
] + _extra_origins
CORS_ALLOWED_ORIGINS = FRONTEND_ORIGINS
CSRF_TRUSTED_ORIGINS = FRONTEND_ORIGINS
CORS_ALLOW_CREDENTIALS = True

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.CsrfExemptSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "chat_burst": "10/min",
        "chat_daily": "200/day",
    },
}

# Two-factor authentication
TWO_FACTOR_ENABLED = False

# AWS is also used by database-secret loading; it is not assistant-specific.
AWS_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "eu-central-1"

# Answer engine. Production deliberately has no implicit test-service fallback.
ANSWER_ENGINE_BASE_URL = os.getenv(
    "ANSWER_ENGINE_BASE_URL",
    "https://test.kurtosis.justavoidhumans.com" if DEBUG else "",
).rstrip("/")
ANSWER_ENGINE_PACK = os.getenv("ANSWER_ENGINE_PACK", "kurtosis-gf")

# Email
DEFAULT_FROM_EMAIL =  os.getenv("DEFAULT_FROM_EMAIL", "")
EMAIL_SECRET_NAME = "" if DEVMODE else os.getenv("EMAIL_SECRET_NAME", "")
EMAIL_USE_TLS = True
EMAIL_TIMEOUT = 30

if EMAIL_SECRET_NAME:
    EMAIL_BACKEND = "config.email.SesSmtpEmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Production security
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False").lower() in ("true", "1")
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
