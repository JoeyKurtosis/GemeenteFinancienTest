import os
from pathlib import Path

from dotenv import load_dotenv

from config.database import get_default_database, get_iv3_database

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-me-in-production")

DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [h for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h]

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

# `iv3` is a developer-only alias and inert in production: nothing but the sync_iv3_summary
# command ever opens a cursor on it, Django connects lazily, and get_iv3_database() defaults
# every setting — so with IV3_DB_* unset the entry costs nothing and connects to nothing.
# Deployments serve the whole dashboard out of `default`; see iv3/models.py.
DATABASES = {
    "default": get_default_database(),
    "iv3": get_iv3_database(),
}

DATABASE_ROUTERS = ["config.routers.Iv3Router"]

# Per-process and deliberately so. Django's implicit default is already LocMemCache, so this
# changes no behaviour — it is here to say the choice out loud, and to pin a LOCATION before a
# second consumer arrives and shares one by accident.
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
    # Used only by the chat endpoint, which attaches both throttles per-view. The burst rate
    # stops a runaway client; the daily rate is the cost ceiling on a paid upstream API.
    #
    # Counters live in CACHES, which is LocMemCache and therefore per-process, so N gunicorn
    # workers give roughly N times these rates. Set them against the budget accordingly.
    "DEFAULT_THROTTLE_RATES": {
        "chat_burst": "10/min",
        "chat_daily": "200/day",
    },
}

# Chat assistant
#
# Google's Gemini API, reached through its OpenAI-compatibility endpoint so the proxy in
# chat/views.py and the frontend adapter both stay OpenAI-shaped. The key is read here and
# used only server-side — it must never be exposed to the browser, which is the whole reason
# /api/chat/ exists rather than the frontend calling Google directly.
#
# Unset is a supported state: the endpoint returns 503 with a Dutch message and the rest of the
# dashboard is unaffected.
#
# gemini-2.5-flash has a free tier and predates the Gemini 3 "thought signatures" that break
# stateless tool-calling loops like ours. Moving to a 3.x model is an env-var change, but
# re-test tool calling when you do.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
# No trailing slash: chat/views.py appends "/chat/completions".
GEMINI_BASE_URL = os.getenv(
    "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"
)

# Email
DEFAULT_FROM_EMAIL = "noreply@gemeentefinancien.nl"
if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
    EMAIL_HOST = os.getenv("EMAIL_HOST", "")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

# Production security
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False").lower() in ("true", "1")
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
