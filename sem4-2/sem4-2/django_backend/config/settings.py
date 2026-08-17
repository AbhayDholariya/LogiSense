"""
Django Settings — India Supply Chain Intelligence Platform
==========================================================
Serves Indian panel only.
  - Django REST Framework for all API endpoints
  - In-memory store (CSV-backed, no DB required)
  - Live OpenWeather API for weather data
  - No WebSocket / Channels (HTTP polling used instead)
"""

import os
from pathlib import Path
from dotenv import load_dotenv
try:
    import dj_database_url
except ImportError:
    dj_database_url = None

BASE_DIR = Path(__file__).resolve().parent.parent
# Load .env from django_backend/ first, fall back to repo root
_env_local = BASE_DIR / '.env'
_env_root  = BASE_DIR.parent / '.env'
if _env_local.exists():
    load_dotenv(_env_local, override=True)
elif _env_root.exists():
    load_dotenv(_env_root, override=True)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-india-supply-chain-2024')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Django REST Framework — open endpoints (auth is client-side PBKDF2)
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
}

# CORS — allow Vite dev server and production origin
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# React build output
FRONTEND_DIR = BASE_DIR.parent / 'frontend' / 'dist'

# ─── PostgreSQL / NeonDB ──────────────────────────────────────────────────────
# Set DATABASE_URL in .env to your NeonDB connection string:
# DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
_DATABASE_URL = os.getenv('DATABASE_URL')

if _DATABASE_URL and dj_database_url:
    # NeonDB (or any PostgreSQL) — use SSL required by NeonDB
    DATABASES = {
        'default': dj_database_url.config(
            default=_DATABASE_URL,
            conn_max_age=60,          # keep connections alive for 60 s (NeonDB serverless friendly)
            conn_health_checks=True,
            ssl_require=True,
        )
    }
    # Ensure psycopg2 is used (not psycopg3) for compatibility
    DATABASES['default']['ENGINE'] = 'django.db.backends.postgresql'
else:
    # Fallback to SQLite for local development without NeonDB
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Email (SMTP) ─────────────────────────────────────────────────────────────
EMAIL_BACKEND    = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST       = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT       = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS    = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER  = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.getenv('EMAIL_FROM', f'LogiSense <{EMAIL_HOST_USER}>')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{asctime} [{levelname}] {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
}

DATA_DIR = BASE_DIR.parent / 'data'
