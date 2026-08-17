"""
Server-side Authentication Utilities — JWT Edition
====================================================
Uses PyJWT (HS256) for token generation and verification.

Token structure (standard JWT):
  Header : { "alg": "HS256", "typ": "JWT" }
  Payload: { id, username, panel, role, displayName, companyName,
             adminContact, loginTime, iat, exp, jti }
  Signed with DJANGO_SECRET_KEY via HMAC-SHA256

Token TTL : 8 hours
Storage   : sessionStorage on client (clears on tab close)
"""

import os
import re
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta


# ─── JWT signing secret ───────────────────────────────────────────────────────

def _get_jwt_secret() -> str:
    """Return the secret used to sign JWTs (from DJANGO_SECRET_KEY env var)."""
    return os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-india-supply-chain-2024')


JWT_ALGORITHM = 'HS256'
TOKEN_TTL_HOURS = 8


# ─── Password helpers ─────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a password with bcrypt (12 rounds). Returns the $2b$ hash string."""
    if not plain or len(plain) < 6:
        raise ValueError("Password must be at least 6 characters.")
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


# ─── JWT helpers ──────────────────────────────────────────────────────────────

def issue_token(user_payload: dict) -> str:
    """
    Issue a signed JWT (HS256) encoding user_payload.

    Standard claims added automatically:
      iat  — issued-at (now, UTC)
      exp  — expiry (now + 8 hours, UTC)
      jti  — unique token ID (UUID hex)

    Returns the compact JWT string:
      <base64url-header>.<base64url-payload>.<signature>
    """
    now = datetime.now(timezone.utc)
    payload = dict(user_payload)
    payload['iat'] = now
    payload['exp'] = now + timedelta(hours=TOKEN_TTL_HOURS)
    payload['jti'] = uuid.uuid4().hex

    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict | None:
    """
    Verify and decode a JWT.

    Returns the decoded payload dict on success.
    Returns None if:
      - token is malformed or missing
      - signature doesn't match (tampering)
      - token has expired (exp claim)
      - any other JWT error
    """
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "jti"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ─── Input validators ─────────────────────────────────────────────────────────

USERNAME_RE = re.compile(r'^[a-z0-9_\.]{3,64}$')
EMAIL_RE    = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def validate_username(username: str) -> str:
    """Normalize and validate username. Raises ValueError on failure."""
    if not username:
        raise ValueError("Username is required.")
    normalized = username.lower().strip()
    if not USERNAME_RE.match(normalized):
        raise ValueError(
            "Username must be 3–64 characters and contain only lowercase letters, "
            "digits, underscores, or dots."
        )
    return normalized


def validate_email(email: str) -> str:
    """Validate email format. Raises ValueError on failure."""
    if not email:
        raise ValueError("Email is required.")
    normalized = email.lower().strip()
    if not EMAIL_RE.match(normalized):
        raise ValueError("Invalid email format.")
    return normalized


def validate_password(password: str) -> None:
    """Enforce password complexity rules. Raises ValueError on failure."""
    if not password:
        raise ValueError("Password is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    if len(password) > 128:
        raise ValueError("Password must not exceed 128 characters.")
