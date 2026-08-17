"""
Django REST Framework Views — LogiSense Supply Chain Intelligence Platform
==========================================================================
Auth tables:
  admin_users  → India panel (username: jani, password: jani@1309)
  customers    → Customer panel (username: customer, password: customer@2026)

Only those exact DB entries can log in. No self-registration.
Demo requests, when accepted, allow admin to create customer accounts.

Endpoints:
  POST /api/auth/login       → login for both panels (checks each table separately)
  POST /api/auth/verify      → verify HMAC token
  POST /api/demo-request     → submit demo request from landing page
  POST /api/admin/demo-requests/<id>/accept → accept demo (admin creates customer)
  POST /api/admin/demo-requests/<id>/reject
  GET  /api/admin/demo-requests
  GET  /api/india/shipments
  GET  /api/india/shipments/<id>
  POST /api/india/shipments/add
  GET  /api/india/alerts
  GET  /api/india/cascade-events
  POST /api/india/analyze
  POST /api/india/cascade
  POST /api/india/reroute/<id>
  POST /api/india/weather-refresh
  POST /api/india/generate-alerts
  GET  /api/india/health
  GET  /api/customer/alerts
  POST /api/customer/chat
  POST /api/customer/tickets
  GET  /api/admin/tickets
  POST /api/admin/tickets/<id>/resolve
  GET  /health
"""

import os
import sys
import uuid
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta

from django.db.models import Avg, Count, Sum, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as http_status

from api.weather_service import get_live_weather
from api.auth_utils import (
    hash_password, verify_password, issue_token, verify_token,
    validate_username, validate_email, validate_password,
)
from api.models import AdminUser, Customer, DemoRequest, Shipment, Alert, CascadeEvent, RefreshLog, SupportTicket

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger(__name__)


# ─── Token auth helper ────────────────────────────────────────────────────────

def _get_token_user(request):
    """Extract and verify the Bearer token. Returns user dict or None."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:].strip()
    return verify_token(token)


def _require_auth(request, panel=None):
    """
    Returns (user_dict, None) on success, or (None, Response) on failure.
    Optionally restricts to a specific panel.
    """
    user = _get_token_user(request)
    if not user:
        return None, Response({'error': 'Authentication required.'}, status=401)
    if panel and user.get('panel') != panel:
        return None, Response({'error': 'Access denied for this panel.'}, status=403)
    return user, None


# ─── Sanitize numpy types (for ML model outputs) ─────────────────────────────

def _sanitize(obj):
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(i) for i in obj]
    try:
        import numpy as np
        if isinstance(obj, (np.integer,)):  return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, (np.bool_,)):    return bool(obj)
    except ImportError:
        pass
    return obj


# ─── Lazy ML model loaders (unchanged) ───────────────────────────────────────

_scorer = _detector = _cascade = _llm_agent = None

def _get_scorer():
    global _scorer
    if _scorer is None:
        try:
            from ML.ecommerce_b2b.xgboost_risk_scorer import IndianXGBoostRiskScorer
            _scorer = IndianXGBoostRiskScorer()
        except Exception as e:
            logger.warning(f"XGBoost scorer not available: {e}")
    return _scorer

def _get_detector():
    global _detector
    if _detector is None:
        try:
            from ML.ecommerce_b2b.anomaly_detector import IndianAnomalyDetector
            _detector = IndianAnomalyDetector()
        except Exception as e:
            logger.warning(f"Anomaly detector not available: {e}")
    return _detector

def _get_cascade():
    global _cascade
    if _cascade is None:
        try:
            from ML.ecommerce_b2b.cascade_predictor import IndianCascadePredictor
            _cascade = IndianCascadePredictor()
        except Exception as e:
            logger.warning(f"Cascade predictor not available: {e}")
    return _cascade

def _get_llm():
    global _llm_agent
    if _llm_agent is None:
        try:
            from ML.ecommerce_b2b.llm_agent import IndianSupplyChainLLMAgent
            _llm_agent = IndianSupplyChainLLMAgent()
        except Exception as e:
            logger.warning(f"LLM agent not available: {e}")
    return _llm_agent


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

_DUMMY_HASH = '$2b$12$dummyhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXXX'


@api_view(['POST'])
def auth_login(request):
    """
    POST /api/auth/login
    Body: { "username": str, "password": str }
    Returns: { "token": str, "user": {...} }

    Security:
    - India panel: looks up admin_users table ONLY.
    - Customer panel: looks up customers table ONLY.
    - If a username exists in one table but wrong panel is requested → 401 (no info leak).
    - Constant-time dummy hash comparison on miss to prevent timing attacks.
    """
    data         = request.data
    raw_username = data.get('username', '').strip()
    password     = data.get('password', '')

    if not raw_username or not password:
        return Response({'error': 'Username and password are required.'}, status=400)

    try:
        username = validate_username(raw_username)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)

    from django.utils import timezone as dj_tz

    # ── Try India panel first ─────────────────────────────────────────────────
    try:
        admin = AdminUser.objects.get(username=username, is_active=True)
        if not verify_password(password, admin.password_hash):
            return Response({'error': 'Invalid username or password.'}, status=401)
        admin.last_login = dj_tz.now()
        admin.save(update_fields=['last_login'])
        payload = {
            'id':          admin.pk,
            'username':    admin.username,
            'panel':       'india',
            'role':        'operator',
            'displayName': admin.display_name,
            'companyName': '',
            'adminContact': None,
            'loginTime':   datetime.now(timezone.utc).isoformat(),
        }
        return Response({'token': issue_token(payload), 'user': payload})
    except AdminUser.DoesNotExist:
        pass

    # ── Try Customer panel ────────────────────────────────────────────────────
    try:
        customer = Customer.objects.get(username=username, is_active=True)
        if not verify_password(password, customer.password_hash):
            return Response({'error': 'Invalid username or password.'}, status=401)
        customer.last_login = dj_tz.now()
        customer.save(update_fields=['last_login'])
        payload = {
            'id':          customer.pk,
            'username':    customer.username,
            'panel':       'customer',
            'role':        'customer',
            'displayName': customer.display_name,
            'companyName': customer.company_name,
            'adminContact': {
                'name':  customer.admin_contact_name,
                'email': customer.admin_contact_email,
                'phone': customer.admin_contact_phone,
            },
            'loginTime':   datetime.now(timezone.utc).isoformat(),
        }
        return Response({'token': issue_token(payload), 'user': payload})
    except Customer.DoesNotExist:
        pass

    # ── Not found in either table — constant-time response ───────────────────
    verify_password('dummy', _DUMMY_HASH)
    return Response({'error': 'Invalid username or password.'}, status=401)


@api_view(['POST'])
def auth_verify(request):
    """
    POST /api/auth/verify
    Body: { "token": str }
    Returns the decoded user payload if token is valid, 401 otherwise.
    Also re-validates the user still exists and is active in DB.
    """
    token = request.data.get('token', '')
    if not token:
        return Response({'error': 'Token required.'}, status=400)
    payload = verify_token(token)
    if not payload:
        return Response({'error': 'Token expired or invalid.'}, status=401)

    # Confirm user still active in DB
    panel = payload.get('panel')
    uid   = payload.get('id')
    if panel == 'india':
        if not AdminUser.objects.filter(pk=uid, is_active=True).exists():
            return Response({'error': 'Account deactivated.'}, status=401)
    elif panel == 'customer':
        if not Customer.objects.filter(pk=uid, is_active=True).exists():
            return Response({'error': 'Account deactivated.'}, status=401)
    else:
        return Response({'error': 'Invalid panel in token.'}, status=401)

    return Response({'user': payload})


# ═══════════════════════════════════════════════════════════════════════════════
# DEMO REQUEST
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
def submit_demo_request(request):
    """
    POST /api/demo-request
    Body: { "fullName", "email", "phone", "company", "role", "volume" }
    Stores the request in NeonDB.
    """
    data = request.data
    full_name = data.get('fullName', '').strip()
    email     = data.get('email', '').strip()
    phone     = data.get('phone', '').strip()
    company   = data.get('company', '').strip()
    role      = data.get('role', 'Shipper')
    volume    = data.get('volume', '< 500')

    errors = {}
    if not full_name:
        errors['fullName'] = 'Full name is required.'
    if not email:
        errors['email'] = 'Email is required.'
    else:
        try:
            email = validate_email(email)
        except ValueError as e:
            errors['email'] = str(e)

    if errors:
        return Response({'errors': errors}, status=400)

    demo = DemoRequest.objects.create(
        full_name=full_name, email=email, phone=phone,
        company=company, role=role, volume=volume,
    )
    return Response({'success': True, 'id': demo.pk}, status=201)


@api_view(['GET'])
def list_demo_requests(request):
    """
    GET /api/admin/demo-requests
    India panel admin only — returns all demo requests ordered by newest first.
    """
    user, err = _require_auth(request, panel='india')
    if err:
        return err

    qs = DemoRequest.objects.order_by('-created_at')
    return Response([d.to_dict() for d in qs])


@api_view(['POST'])
def accept_demo_request(request, demo_id):
    """
    POST /api/admin/demo-requests/<id>/accept
    India panel admin only — accepts a demo request.
    Creates a Customer account from the demo request data.
    Body (optional): { "appointmentAt": "2026-08-10T14:00:00", "username": "...", "password": "..." }
    """
    user, err = _require_auth(request, panel='india')
    if err:
        return err

    try:
        demo = DemoRequest.objects.get(pk=demo_id)
    except DemoRequest.DoesNotExist:
        return Response({'error': 'Demo request not found.'}, status=404)

    if demo.status == 'accepted':
        return Response({'error': 'Already accepted.'}, status=400)

    from django.utils import timezone as dj_tz
    from django.core.mail import send_mail
    from django.conf import settings as django_settings

    # Parse optional appointment time from body, or auto-generate +3 business days
    appointment_str = request.data.get('appointmentAt', '')
    if appointment_str:
        try:
            from dateutil import parser as date_parser
            appointment_dt = date_parser.parse(appointment_str)
            if appointment_dt.tzinfo is None:
                appointment_dt = appointment_dt.replace(tzinfo=timezone.utc)
        except Exception:
            appointment_dt = None
    else:
        appointment_dt = None

    # Auto-generate appointment: next Monday-Friday at 11 AM IST, skipping 3 days
    ist = timezone(timedelta(hours=5, minutes=30))
    if not appointment_dt:
        base = datetime.now(ist) + timedelta(days=3)
        while base.weekday() >= 5:
            base += timedelta(days=1)
        appointment_dt = base.replace(hour=11, minute=0, second=0, microsecond=0)

    try:
        appt_ist = appointment_dt.astimezone(ist)
    except Exception:
        appt_ist = appointment_dt
    appt_display = appt_ist.strftime('%A, %d %B %Y at %I:%M %p IST')

    # Update demo record
    now_utc = dj_tz.now()
    demo.status        = 'accepted'
    demo.contacted_at  = now_utc
    demo.appointment_at = appointment_dt
    demo.save(update_fields=['status', 'contacted_at', 'appointment_at'])

    # ── Create Customer account from demo request ─────────────────────────────
    customer_created = False
    customer_username = None
    customer_password = None
    try:
        # Use provided credentials or derive from demo email
        raw_username = request.data.get('username', '').strip()
        raw_password = request.data.get('password', '').strip()

        if not raw_username:
            # Derive username from email local part, sanitize to lowercase alnum
            email_local = demo.email.split('@')[0].lower()
            raw_username = ''.join(c for c in email_local if c.isalnum() or c in ('_', '.'))[:32]
            if len(raw_username) < 3:
                raw_username = f"cust{demo.pk}"

        if not raw_password:
            # Generate a safe default password
            import secrets
            raw_password = secrets.token_urlsafe(10)

        # Ensure username is unique
        base = raw_username
        counter = 1
        while Customer.objects.filter(username=raw_username).exists():
            raw_username = f"{base}{counter}"
            counter += 1

        pw_hash = hash_password(raw_password)
        Customer.objects.create(
            username=raw_username,
            email=demo.email,
            password_hash=pw_hash,
            display_name=demo.full_name,
            company_name=demo.company or '',
            admin_contact_name='Jani Ops',
            admin_contact_email='ops.india@logisense.in',
            admin_contact_phone='+91 98982 13090',
            is_active=True,
        )
        customer_created = True
        customer_username = raw_username
        customer_password = raw_password
    except Exception as ce:
        logger.error(f"[Demo Accept] Customer creation failed: {ce}")

    # ── Send email ────────────────────────────────────────────────────────────
    subject = "Your LogiSense Demo Request Has Been Accepted ✅"
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 36px 32px; text-align: center; }}
    .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }}
    .body {{ padding: 36px; }}
    .appt-box {{ background: #f8fafc; border: 2px solid #e2e8f0; border-left: 4px solid #4f46e5; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }}
    .creds-box {{ background: #f0fdf4; border: 2px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 12px; padding: 16px 24px; margin: 20px 0; }}
    .footer {{ background: #f8fafc; padding: 24px 36px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚚 LogiSense Supply Chain Intelligence</h1>
    </div>
    <div class="body">
      <p>Dear <strong>{demo.full_name}</strong>,</p>
      <p>Your demo request has been <strong>accepted</strong>.</p>
      <div class="appt-box">
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:8px;">📅 Scheduled Appointment</div>
        <div style="font-size:20px;color:#1e293b;font-weight:700;">{appt_display}</div>
      </div>
      {'<div class="creds-box"><strong>🔐 Your Customer Portal Access</strong><br><br>Username: <code>' + customer_username + '</code><br>Password: <code>' + customer_password + '</code><br><br><em>Please change your password after first login.</em></div>' if customer_created else ''}
      <p>We look forward to showing you the LogiSense platform.</p>
    </div>
    <div class="footer">LogiSense Supply Chain Intelligence</div>
  </div>
</body>
</html>
"""
    plain_body = (
        f"Dear {demo.full_name},\n\n"
        f"Your demo request for LogiSense has been ACCEPTED.\n"
        f"Appointment: {appt_display}\n"
    )
    if customer_created:
        plain_body += f"\nCustomer Portal Credentials:\n  Username: {customer_username}\n  Password: {customer_password}\n"
    plain_body += "\nLogiSense Team"

    email_sent = False
    email_error = ''
    try:
        from django.core.mail import EmailMultiAlternatives
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_body,
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            to=[demo.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        email_sent = True
    except Exception as e:
        email_error = str(e)
        logger.error(f"[Demo Accept] Email failed for {demo.email}: {e}")

    resp = {
        'success':         True,
        'demo':            demo.to_dict(),
        'emailSent':       email_sent,
        'emailError':      email_error if not email_sent else '',
        'appointmentAt':   appt_ist.isoformat(),
        'customerCreated': customer_created,
    }
    if customer_created:
        resp['customerUsername'] = customer_username
    return Response(resp)


@api_view(['POST'])
def reject_demo_request(request, demo_id):
    """
    POST /api/admin/demo-requests/<id>/reject
    India panel admin only — rejects a demo request.
    """
    user, err = _require_auth(request, panel='india')
    if err:
        return err

    try:
        demo = DemoRequest.objects.get(pk=demo_id)
    except DemoRequest.DoesNotExist:
        return Response({'error': 'Demo request not found.'}, status=404)

    from django.utils import timezone as dj_tz
    demo.status = 'rejected'
    demo.contacted_at = dj_tz.now()
    demo.save(update_fields=['status', 'contacted_at'])

    return Response({'success': True, 'demo': demo.to_dict()})


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def health_check(request):
    return Response({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'server': 'Django REST — LogiSense Supply Chain (NeonDB)',
    })


@api_view(['GET'])
def india_health(request):
    scorer   = _get_scorer()
    detector = _get_detector()
    cascade  = _get_cascade()
    llm      = _get_llm()
    db_ok    = False
    try:
        Shipment.objects.count()
        db_ok = True
    except Exception:
        pass
    return Response({
        'status': 'ok',
        'database': 'neondb_postgresql' if db_ok else 'unavailable',
        'models': {
            'xgboost_classifier':  scorer.clf is not None if scorer else False,
            'xgboost_regressor':   scorer.reg is not None if scorer else False,
            'isolation_forest':    detector.pipeline is not None if detector else False,
            'cascade_graph':       cascade.graph is not None if cascade else False,
            'llm_agent':           llm is not None,
        },
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════════════════
# SHIPMENTS (DB-backed)
# ═══════════════════════════════════════════════════════════════════════════════

ACTIVE_STATUSES = ['in_transit', 'delayed', 'at_warehouse', 'customs_hold', 'loading', 'at_port']


@api_view(['GET'])
def india_shipments(request):
    """GET /api/india/shipments — returns up to 30 active Indian shipments from DB."""
    qs = (
        Shipment.objects
        .filter(panel='india', status__in=ACTIVE_STATUSES)
        .order_by('-risk_score')[:30]
    )
    return Response([s.to_dict() for s in qs])


@api_view(['GET'])
def india_shipment_detail(request, shipment_id):
    """GET /api/india/shipments/<id>"""
    try:
        s = Shipment.objects.get(id=shipment_id)
        return Response(s.to_dict())
    except Shipment.DoesNotExist:
        return Response({'error': f'Shipment {shipment_id} not found'}, status=404)


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTS & CASCADE EVENTS (DB-backed)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def india_alerts(request):
    """GET /api/india/alerts?hours=24"""
    hours  = int(request.query_params.get('hours', 24))
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    qs = (
        Alert.objects
        .filter(panel='india', created_at__gte=cutoff)
        .select_related('shipment')
        .order_by('-created_at')[:100]
    )
    return Response([a.to_dict() for a in qs])


@api_view(['GET'])
def india_cascade_events(request):
    """GET /api/india/cascade-events?limit=10"""
    limit = int(request.query_params.get('limit', 10))
    qs = CascadeEvent.objects.order_by('-created_at')[:limit]
    return Response([e.to_dict() for e in qs])


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYZE (ML pipeline — unchanged logic, writes back to DB)
# ═══════════════════════════════════════════════════════════════════════════════

def _rule_based_fallback_score(data):
    score = 20.0
    weather_map = {'storm': 40, 'heavy_rain': 35, 'fog': 25, 'snow': 30, 'rain': 20}
    score += weather_map.get(str(data.get('weather_condition', '')).lower(), 5)
    score += float(data.get('cascade_risk_score', 0.3)) * 30
    score += min(float(data.get('upstream_shipment_delay_minutes', 0)) / 10, 15)
    if data.get('vehicle_breakdown_flag'): score += 20
    if data.get('accident_reported_flag'): score += 25
    score += (1 - float(data.get('road_condition_index', 7)) / 10) * 20
    return round(min(max(score, 10), 100), 1)


@api_view(['POST'])
def india_analyze(request):
    """POST /api/india/analyze — XGBoost + Anomaly + LLM analysis."""
    data = dict(request.data)
    origin_city = data.get('origin_city', 'Mumbai')

    live_wx = get_live_weather(origin_city)
    data['weather_condition'] = live_wx.get('weather_condition', 'Clear')

    scorer   = _get_scorer()
    detector = _get_detector()

    risk_result = None
    if scorer:
        try:
            from ML.ecommerce_b2b.xgboost_risk_scorer import IndianShipmentInput
            inp = IndianShipmentInput(**{
                k: v for k, v in data.items() if k not in ('language', 'include_llm')
            })
            risk_result = scorer.score(inp)
        except Exception as e:
            logger.warning(f'Scorer error: {e}')

    anomaly_result = {'is_anomaly': False, 'anomaly_score': 0.0}
    if detector:
        try:
            record = dict(data)
            record['has_upstream_delay'] = int(float(data.get('upstream_shipment_delay_minutes', 0)) > 30)
            record['wh_congestion_combined'] = (
                float(data.get('origin_wh_congestion_pct', 50)) +
                float(data.get('dest_wh_congestion_pct', 50))
            ) / 2
            rest = float(data.get('driver_rest_hours_prior', 8))
            exp  = float(data.get('driver_experience_years', 5))
            record['driver_risk_score'] = (
                (1 - rest / 24) * 40 +
                float(data.get('night_driving_flag', 0)) * 25 +
                (1 - min(exp / 15, 1)) * 35
            )
            record['vehicle_risk_score'] = (
                float(data.get('vehicle_age_years', 3)) / 20 * 50 +
                float(data.get('vehicle_breakdown_flag', 0)) * 50
            )
            tolls   = float(data.get('num_toll_plazas', 5))
            borders = float(data.get('num_state_border_crossings', 1))
            road    = float(data.get('road_condition_index', 7))
            record['route_complexity'] = (tolls / 50) * 30 + (borders / 10) * 40 + ((10 - road) / 10) * 30
            record['delay_sensitivity_score'] = {
                'Express': 3, 'Priority': 2, 'Scheduled-Freight': 1
            }.get(data.get('priority_level', 'Scheduled-Freight'), 1) * 20 + float(data.get('cascade_risk_score', 0.3)) * 80
            is_anom, anom_score = detector.predict(record)
            anomaly_result = {'is_anomaly': is_anom, 'anomaly_score': round(anom_score, 4)}
        except Exception as e:
            logger.warning(f'Anomaly error: {e}')

    shipment_id = data.get('shipment_id', 'UNKNOWN')
    if risk_result:
        response_data = {
            'shipment_id':           shipment_id,
            'risk_score':            risk_result.risk_score,
            'risk_level':            risk_result.risk_level,
            'delay_probability':     risk_result.delay_probability,
            'predicted_delay_minutes': risk_result.predicted_delay_minutes,
            'cascade_risk':          risk_result.cascade_risk,
            'component_scores':      risk_result.component_scores,
            'top_risk_factors':      risk_result.top_risk_factors,
            'recommended_action':    risk_result.recommended_action,
            'priority_category':     risk_result.priority_category,
            'recovery_actions':      risk_result.recovery_actions,
            'is_anomaly':            anomaly_result['is_anomaly'],
            'anomaly_score':         anomaly_result['anomaly_score'],
            'live_weather':          live_wx,
            'cascade_check':         {'cascade_risk_score': data.get('cascade_risk_score', 0.3)},
            'llm_decision':          None,
        }
    else:
        risk_score = _rule_based_fallback_score(data)
        response_data = {
            'shipment_id':           shipment_id,
            'risk_score':            risk_score,
            'risk_level':            'high' if risk_score > 65 else 'medium' if risk_score > 35 else 'low',
            'delay_probability':     round(risk_score / 100, 3),
            'predicted_delay_minutes': risk_score * 2,
            'cascade_risk':          data.get('cascade_risk_score', 0.3),
            'component_scores':      {},
            'top_risk_factors':      ['Models not trained — using rule-based fallback'],
            'recommended_action':    'Train models: python train_indian_models.py --sample 100000',
            'priority_category':     'P3_MEDIUM',
            'recovery_actions':      [],
            'is_anomaly':            anomaly_result['is_anomaly'],
            'anomaly_score':         anomaly_result['anomaly_score'],
            'cascade_check':         {'cascade_risk_score': data.get('cascade_risk_score', 0.3)},
            'llm_decision':          None,
        }

    # LLM explanation
    if data.get('include_llm', True):
        llm = _get_llm()
        if llm:
            try:
                shipment_data = {}
                try:
                    s = Shipment.objects.get(id=shipment_id)
                    shipment_data = s.to_dict()
                except Shipment.DoesNotExist:
                    pass
                llm_out = llm.explain_risk(
                    shipment_id, response_data, anomaly_result,
                    language=data.get('language', 'english'),
                    shipment_data=shipment_data,
                )
                response_data['llm_decision'] = {
                    'decision':        llm_out.decision,
                    'explanation':     llm_out.explanation,
                    'action_items':    llm_out.action_items,
                    'confidence':      llm_out.confidence,
                    'estimated_impact': llm_out.estimated_impact,
                    'source':          llm_out.source,
                }
            except Exception as e:
                logger.warning(f'LLM error: {e}')
                response_data['llm_decision'] = {
                    'decision': 'LLM unavailable', 'explanation': str(e), 'action_items': []
                }

    # Write updated risk back to DB
    try:
        Shipment.objects.filter(id=shipment_id).update(
            risk_score=response_data['risk_score'],
            risk_level=response_data['risk_level'],
            is_anomaly=response_data['is_anomaly'],
            delay_probability=response_data['delay_probability'],
            top_risk_factors=response_data['top_risk_factors'],
        )
    except Exception:
        pass

    return Response(_sanitize(response_data))


# ═══════════════════════════════════════════════════════════════════════════════
# CASCADE PREDICTION
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
def india_cascade(request):
    data    = request.data
    cascade = _get_cascade()
    if not cascade:
        return Response({'error': 'Cascade predictor not available'}, status=503)
    try:
        chain = cascade.predict_cascade(
            trigger_city=data.get('trigger_city', 'Mumbai'),
            trigger_reason=data.get('trigger_reason', 'warehouse_overload'),
            severity=float(data.get('severity', 0.7)),
            max_depth=int(data.get('max_depth', 5)),
            affected_shipments_at_trigger=int(data.get('affected_shipments', 100)),
        )
        chain_dict = {
            'trigger_city':               chain.trigger_city,
            'trigger_reason':             chain.trigger_reason,
            'total_affected_nodes':       chain.total_affected_nodes,
            'total_affected_shipments':   chain.total_affected_shipments,
            'total_financial_impact_inr': chain.total_financial_impact_inr,
            'estimated_recovery_hours':   chain.estimated_recovery_hours,
            'cascade_nodes': [
                {
                    'city': n.city, 'cascade_level': n.cascade_level,
                    'impact_probability': n.impact_probability,
                    'estimated_delay_hours': n.estimated_delay_hours,
                    'affected_shipments_count': n.affected_shipments_count,
                    'financial_impact_inr': n.financial_impact_inr,
                    'node_type': n.node_type,
                    'mitigation_possible': n.mitigation_possible,
                }
                for n in chain.cascade_nodes[:15]
            ],
            'recovery_plan':      chain.recovery_plan,
            'propagation_graph':  chain.propagation_graph,
        }
        # Persist to DB
        event_id = f"CASCADE-{uuid.uuid4().hex[:8].upper()}"
        CascadeEvent.objects.create(
            id=event_id,
            trigger_city=chain_dict['trigger_city'],
            trigger_reason=chain_dict['trigger_reason'],
            total_affected_nodes=chain_dict['total_affected_nodes'],
            total_affected_shipments=chain_dict['total_affected_shipments'],
            total_financial_impact_inr=int(chain_dict['total_financial_impact_inr'] or 0),
            estimated_recovery_hours=chain_dict['estimated_recovery_hours'],
            cascade_nodes=chain_dict['cascade_nodes'],
            recovery_plan=chain_dict['recovery_plan'],
            propagation_graph=chain_dict['propagation_graph'],
        )
        chain_dict['id'] = event_id
        return Response(_sanitize(chain_dict))
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════════════════════
# REROUTE
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
def india_reroute(request, shipment_id):
    import re as _re
    try:
        s = Shipment.objects.get(id=shipment_id)
    except Shipment.DoesNotExist:
        return Response({'error': f'Shipment {shipment_id} not found'}, status=404)

    origin        = s.origin_city or 'Mumbai'
    dest          = s.destination_city or 'Delhi'
    current_dist  = float(s.distance_km or 1400.0)
    fuel_price    = float(s.fuel_price_per_litre or 96.5)
    vehicle_age   = float(s.vehicle_age_years or 4.0)
    base_eff      = 7.0 - (vehicle_age * 0.15)
    current_risk  = float(s.risk_score or 50.0)

    alt_a = {
        'name': 'GQ National Highway Corridor (via NH-48 / Expressways)',
        'path': f'{origin} -> Ahmedabad -> Jaipur -> {dest}',
        'distance_km': round(current_dist * 0.96, 1),
        'planned_transit_hours': round(current_dist * 0.96 / 62.0, 1),
        'traffic_level': 'Medium',
        'toll_cost_inr': round(current_dist * 1.8),
        'road_condition_idx': 8.5,
        'border_delays_hrs': 1.5,
        'fuel_efficiency_kpl': round(base_eff * 1.1, 1),
    }
    alt_b = {
        'name': 'PM Gati Shakti Dedicated Rail Freight Corridor (DFCCIL)',
        'path': f'{origin} Port -> DFCCIL Rail Link -> Dadri ICD -> {dest}',
        'distance_km': round(current_dist * 1.05, 1),
        'planned_transit_hours': round(current_dist * 1.05 / 75.0 + 4.0, 1),
        'traffic_level': 'Low',
        'toll_cost_inr': 0,
        'road_condition_idx': 10.0,
        'border_delays_hrs': 0.0,
        'fuel_efficiency_kpl': round(base_eff * 1.8, 1),
    }

    llm = _get_llm()
    post_risk  = max(10.0, current_risk * 0.3)
    post_level = 'critical' if post_risk >= 75 else 'high' if post_risk >= 50 else 'medium' if post_risk >= 25 else 'low'

    if not llm:
        selected = alt_a
        new_route = alt_a['name']
        explanation = 'Rule-based reroute: LLM not available. Selected GQ NH Corridor as default optimal route.'
        action_items = ['Monitor new route', 'Update ETA', 'Notify carrier']
        financial_savings = round(current_dist * 12)
        fuel_savings = round(current_dist / base_eff * 0.1, 1)
    else:
        try:
            ldata = llm.recommend_reroute(
                shipment_id=shipment_id, origin=origin, destination=dest,
                current_risk=current_risk, route_a=alt_a, route_b=alt_b,
                live_weather=s.live_weather or {}, fuel_price_per_litre=fuel_price,
            )
            if isinstance(ldata, str):
                raw = _re.sub(r'```[a-z]*\n?', '', ldata).strip()
                try:
                    ldata = json.loads(raw)
                except Exception:
                    ldata = {}
            if not isinstance(ldata, dict):
                ldata = {}
        except Exception as e:
            logger.warning(f'LLM reroute error: {e}')
            ldata = {}

        new_route    = ldata.get('decision', alt_b['name'])
        selected     = alt_a if 'GQ' in new_route else alt_b
        explanation  = ldata.get('explanation', '')
        action_items = ldata.get('action_items', [])
        financial_savings = ldata.get('financial_savings_inr', round(current_dist * 12))
        fuel_savings = ldata.get('fuel_savings_litres', round(current_dist / base_eff * 0.1, 1))

    # Write reroute back to DB
    Shipment.objects.filter(id=shipment_id).update(
        status='rerouted',
        is_delayed=False,
        risk_level=post_level,
        risk_score=round(post_risk, 1),
        distance_remaining_km=selected['distance_km'],
        planned_transit_hours=selected['planned_transit_hours'],
        traffic_congestion_level=selected['traffic_level'],
    )

    # Persist reroute alert
    alert_id = f"RER-{uuid.uuid4().hex[:6].upper()}"
    Alert.objects.create(
        id=alert_id,
        shipment_id=shipment_id,
        panel='india',
        type='reroute_triggered',
        severity='medium',
        message=(
            f"Rerouted {shipment_id} → {new_route}. "
            f"Savings: INR {financial_savings} & {fuel_savings}L fuel. "
            f"Risk: {current_risk:.0f} → {post_risk:.0f}"
        ),
        risk_score=round(post_risk, 1),
    )

    return Response({
        'shipment_id':          shipment_id,
        'decision':             new_route,
        'financial_savings_inr': financial_savings,
        'fuel_savings_litres':  fuel_savings,
        'traffic_congestion_level': selected['traffic_level'],
        'explanation':          explanation,
        'action_items':         action_items,
        'route_details':        selected,
        'risk_before':          current_risk,
        'risk_after':           round(post_risk, 1),
    })


# ═══════════════════════════════════════════════════════════════════════════════
# WEATHER REFRESH (writes updated weather + risk back to DB rows)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
def india_weather_refresh(request):
    """
    POST /api/india/weather-refresh
    Fetches live OpenWeather data for all active Indian shipment origin cities
    and updates weather + risk fields directly in NeonDB.
    """
    qs = Shipment.objects.filter(panel='india', status__in=ACTIVE_STATUSES)

    # Gather unique origin cities
    cities = list(qs.values_list('origin_city', flat=True).distinct())
    updated = 0
    errors  = []

    WEATHER_CODE_LABEL = {
        'rain': '🌧️', 'light_rain': '🌦️', 'heavy_rain': '⛈️',
        'fog': '🌫️', 'storm': '🌩️', 'clear': '☀️',
        'cloudy': '☁️', 'overcast': '🌥️', 'snow': '❄️',
    }

    for city in cities:
        try:
            live_wx      = get_live_weather(city)
            weather_code = live_wx.get('weather_code', 'clear')
            icon         = WEATHER_CODE_LABEL.get(weather_code, '🌡️')
            weather_cond = (
                f"{icon} {live_wx.get('weather_condition', 'Clear')} "
                f"({live_wx.get('temp_c', 28.0)}°C)"
            )
            wx_severity = live_wx.get('weather_severity', 1.0)

            city_qs = qs.filter(origin_city=city)
            for s in city_qs:
                base = float(s.risk_score) - float(
                    (s.live_weather or {}).get('weather_severity', 1.0)
                ) * 3.0
                new_risk  = round(min(max(base + wx_severity * 3.0, 10.0), 100.0), 2)
                new_level = (
                    'critical' if new_risk >= 75 else
                    'high'     if new_risk >= 50 else
                    'medium'   if new_risk >= 25 else 'low'
                )
                s.weather_condition = weather_cond
                s.weather_code      = weather_code
                s.wind_speed_kmh    = live_wx.get('wind_speed_kmh', 10.0)
                s.visibility_km     = live_wx.get('visibility_km', 10.0)
                s.live_weather      = live_wx
                s.risk_score        = new_risk
                s.risk_level        = new_level
                s.save(update_fields=[
                    'weather_condition', 'weather_code', 'wind_speed_kmh',
                    'visibility_km', 'live_weather', 'risk_score', 'risk_level',
                ])
                updated += 1

        except Exception as e:
            errors.append(f'{city}: {e}')

    # Log to DB
    RefreshLog.objects.create(
        refresh_type='weather',
        cities_refreshed=len(cities),
        shipments_updated=updated,
        errors=errors,
    )

    return Response({
        'status':            'ok',
        'cities_refreshed':  len(cities),
        'shipments_updated': updated,
        'is_live':           True,
        'errors':            errors,
        'refreshed_at':      datetime.now(timezone.utc).isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════════════════
# AI-BASED ALERT GENERATION (trained-data pattern matching)
# ═══════════════════════════════════════════════════════════════════════════════

# ── Helpers ──────────────────────────────────────────────────────────────────

def _ml_factors_str(s, n=3):
    """Return top ML risk factors as a compact string."""
    factors = s.top_risk_factors or []
    return ' | '.join(factors[:n]) if factors else 'multiple risk factors'


def _action_label(s):
    """Human-readable label for the ML recommended_action field."""
    action_map = {
        'no_action':          'Monitor',
        'monitor':            'Monitor closely',
        'alert':              'Alert dispatched',
        'reroute':            'Reroute recommended',
        'halt':               'HALT — stop shipment',
        'emergency_response': 'Emergency response',
    }
    return action_map.get(str(s.recommended_action or 'monitor'), str(s.recommended_action or 'Monitor'))


# Alert message templates — enriched with full ML model output context
_ALERT_TEMPLATES = {
    'road_closure': {
        'type': 'road_closure_detected',
        'severity_fn': lambda rs: 'critical' if rs > 70 else 'high',
        'message_fn': lambda s: (
            f"🚧 Road closure on {s.origin_city}→{s.destination_city} corridor. "
            f"Carrier: {s.carrier_company} | Cargo: {s.cargo_type}. "
            f"Est. delay: {round(float(s.delay_duration_minutes or 60) / 60, 1)}h | "
            f"XGBoost risk: {float(s.risk_score):.0f}/100 | "
            f"Delay prob: {int(float(s.delay_probability or 0) * 100)}%. "
            f"ML factors: {_ml_factors_str(s)}. "
            f"Action: {_action_label(s)}."
        ),
    },
    'weather_storm': {
        'type': 'weather_warning',
        'severity_fn': lambda rs: 'critical' if rs > 75 else 'high',
        'message_fn': lambda s: (
            f"⛈️ Severe weather: {s.weather_condition} on {s.origin_city}→{s.destination_city}. "
            f"Visibility: {s.visibility_km:.1f}km | Wind: {s.wind_speed_kmh:.0f}km/h | "
            f"XGBoost risk: {float(s.risk_score):.0f}/100 → {s.risk_level.upper()}. "
            f"ML drivers: {_ml_factors_str(s, 2)}. "
            f"Action: {_action_label(s)}. Halt/shelter advisory issued."
        ),
    },
    'weather_fog': {
        'type': 'weather_warning',
        'severity_fn': lambda rs: 'high' if rs > 55 else 'medium',
        'message_fn': lambda s: (
            f"🌫️ Dense fog: {s.origin_city}→{s.destination_city}. "
            f"Visibility: {s.visibility_km:.1f}km | "
            f"XGBoost risk: {float(s.risk_score):.0f}/100 | "
            f"Delay prob: {int(float(s.delay_probability or 0) * 100)}%. "
            f"ETA extended by {round(float(s.delay_duration_minutes or 30) / 60, 1)}h. "
            f"ML: {_ml_factors_str(s, 2)}. Reduce speed, activate hazards."
        ),
    },
    'vehicle_breakdown': {
        'type': 'vehicle_breakdown',
        'severity_fn': lambda rs: 'critical' if rs > 65 else 'high',
        'message_fn': lambda s: (
            f"🔧 Vehicle breakdown: {s.id} stranded near {s.origin_city}. "
            f"Vehicle age: {s.vehicle_age_years:.1f}yrs | Driver exp: {s.driver_experience_years:.0f}yrs. "
            f"Cargo value: ₹{int(s.shipment_value_inr or 0):,} | "
            f"XGBoost risk: {float(s.risk_score):.0f}/100. "
            f"ML drivers: {_ml_factors_str(s)}. "
            f"Action: {_action_label(s)}. Recovery unit dispatched."
        ),
    },
    'customs_hold': {
        'type': 'customs_hold',
        'severity_fn': lambda rs: 'high' if rs > 50 else 'medium',
        'message_fn': lambda s: (
            f"🛃 Customs hold: {s.id} ({s.origin_city}→{s.destination_city}). "
            f"E-way bill: {'✅ Verified' if s.eway_bill_verified else '❌ Not verified'}. "
            f"Clearance ETA: {round(float(s.delay_duration_minutes or 120) / 60, 1)}h | "
            f"XGBoost risk: {float(s.risk_score):.0f}/100. "
            f"ML: {_ml_factors_str(s, 2)}. Compliance team notified."
        ),
    },
    'strike_event': {
        'type': 'strike_event',
        'severity_fn': lambda rs: 'critical' if rs > 70 else 'high',
        'message_fn': lambda s: (
            f"🪧 Strike/blockade on {s.origin_city}→{s.destination_city}. "
            f"Carrier {s.carrier_company} suspended | "
            f"Cascade risk: {int(float(s.cascade_risk_score or 0) * 100)}% | "
            f"XGBoost risk: {float(s.risk_score):.0f}/100. "
            f"ML drivers: {_ml_factors_str(s)}. "
            f"Action: {_action_label(s)}. Emergency reroute required."
        ),
    },
    'anomaly': {
        'type': 'anomaly_detected',
        'severity_fn': lambda rs: 'critical' if rs > 75 else 'high',
        'message_fn': lambda s: (
            f"🤖 XGBoost anomaly: {s.id} ({s.origin_city}→{s.destination_city}). "
            f"Risk spiked to {float(s.risk_score):.0f}/100 — "
            f"delay prob {int(float(s.delay_probability or 0.5) * 100)}% vs baseline. "
            f"Top ML factors: {_ml_factors_str(s, 3)}. "
            f"Cascade risk: {int(float(s.cascade_risk_score or 0) * 100)}%. "
            f"Recommended: {_action_label(s)}."
        ),
    },
    'high_risk': {
        'type': 'high_risk_flag',
        'severity_fn': lambda rs: 'critical' if rs > 80 else 'high',
        'message_fn': lambda s: (
            f"⚠️ High-risk: {s.id} | {s.origin_city}→{s.destination_city}. "
            f"XGBoost composite risk: {float(s.risk_score):.0f}/100 | "
            f"Delay prob: {int(float(s.delay_probability or 0) * 100)}% | "
            f"Cascade: {int(float(s.cascade_risk_score or 0) * 100)}%. "
            f"ML factors: {_ml_factors_str(s, 3)}. "
            f"Priority: {s.priority_level} | Carrier OTR: {int(float(s.carrier_on_time_rate or 0.8) * 100)}%. "
            f"Action: {_action_label(s)}."
        ),
    },
    'cascade_risk': {
        'type': 'cascade_risk',
        'severity_fn': lambda rs: 'critical',
        'message_fn': lambda s: (
            f"🌊 Cascade risk: {s.id} | {s.origin_city}→{s.destination_city}. "
            f"Node disruption: {int(float(s.cascade_risk_score or 0) * 100)}% | "
            f"Route disruptions (30d): {s.route_disruption_cnt_30d} | "
            f"Upstream delay: {int(float(s.upstream_shipment_delay_minutes or 0))}min. "
            f"XGBoost risk: {float(s.risk_score):.0f}/100. "
            f"ML drivers: {_ml_factors_str(s, 3)}. "
            f"Action: {_action_label(s)}. Proactive mitigation required."
        ),
    },
}

WEATHER_ALERT_CODES = frozenset({'storm', 'heavy_rain', 'fog', 'snow'})
WEATHER_ICON_MAP = {
    'storm': ('🌩️', 'Storm'), 'heavy_rain': ('⛈️', 'Heavy Rain'),
    'fog': ('🌫️', 'Fog'), 'snow': ('❄️', 'Snow'),
    'rain': ('🌧️', 'Rain'), 'light_rain': ('🌦️', 'Light Rain'),
    'clear': ('☀️', 'Clear'), 'cloudy': ('☁️', 'Cloudy'),
    'overcast': ('🌥️', 'Overcast'),
}


@api_view(['POST'])
def india_generate_alerts(request):
    """
    POST /api/india/generate-alerts
    Scans active shipments from DB, applies training-data-based risk pattern
    matching, and generates fresh alerts. Returns newly created alert objects.
    These can be streamed to the frontend as "live" notifications.
    """
    # How many shipments to scan (default: top 50 by risk)
    max_scan = int(request.data.get('max_scan', 50))
    force_new = request.data.get('force_new', False)  # skip dedup check

    qs = (
        Shipment.objects
        .filter(panel='india', status__in=ACTIVE_STATUSES)
        .order_by('-risk_score')[:max_scan]
    )

    created_alerts = []
    now = datetime.now(timezone.utc)

    # Dedup window: don't re-create same alert type for same shipment within 30 min
    recent_cutoff = now - timedelta(minutes=30)
    if not force_new:
        existing_pairs = set(
            Alert.objects
            .filter(panel='india', created_at__gte=recent_cutoff)
            .values_list('shipment_id', 'type')
        )
    else:
        existing_pairs = set()

    for shipment in qs:
        rs = float(shipment.risk_score or 0)
        wx = shipment.weather_code or 'clear'
        new_alerts_for_shipment = []

        # ── 1. Road closure ──────────────────────────────────────────────────
        if shipment.road_closure_flag and rs > 45:
            tmpl = _ALERT_TEMPLATES['road_closure']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # ── 2. Weather: storm / heavy rain (critical pattern) ───────────────
        if wx in ('storm', 'heavy_rain') and rs > 40:
            tmpl = _ALERT_TEMPLATES['weather_storm']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)
        elif wx == 'fog' and rs > 35:
            tmpl = _ALERT_TEMPLATES['weather_fog']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # ── 3. Vehicle breakdown ─────────────────────────────────────────────
        if shipment.vehicle_breakdown_flag and rs > 50:
            tmpl = _ALERT_TEMPLATES['vehicle_breakdown']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # ── 4. Customs hold ──────────────────────────────────────────────────
        if shipment.customs_hold_flag and rs > 30:
            tmpl = _ALERT_TEMPLATES['customs_hold']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # ── 5. Strike event ──────────────────────────────────────────────────
        if shipment.strike_event_flag and rs > 45:
            tmpl = _ALERT_TEMPLATES['strike_event']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # ── 6. ML Anomaly ────────────────────────────────────────────────────
        if shipment.is_anomaly and rs > 60:
            tmpl = _ALERT_TEMPLATES['anomaly']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # ── 7. High overall risk ─────────────────────────────────────────────
        if rs > 72 and (shipment.id, 'high_risk_flag') not in existing_pairs:
            new_alerts_for_shipment.append(_ALERT_TEMPLATES['high_risk'])

        # ── 8. Cascade risk ──────────────────────────────────────────────────
        if float(shipment.cascade_risk_score or 0) > 0.65 and rs > 55:
            tmpl = _ALERT_TEMPLATES['cascade_risk']
            if (shipment.id, tmpl['type']) not in existing_pairs:
                new_alerts_for_shipment.append(tmpl)

        # Persist each new alert
        for tmpl in new_alerts_for_shipment:
            alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
            severity = tmpl['severity_fn'](rs)
            msg = tmpl['message_fn'](shipment)
            wx_icon, wx_label = WEATHER_ICON_MAP.get(wx, ('🌡️', wx.title()))
            is_weather = wx in WEATHER_ALERT_CODES or 'weather' in tmpl['type']

            a = Alert.objects.create(
                id=alert_id,
                shipment_id=shipment.id,
                panel='india',
                type=tmpl['type'],
                severity=severity,
                message=msg,
                risk_score=rs,
                delay_probability=float(shipment.delay_probability or 0),
                cascade_risk=float(shipment.cascade_risk_score or 0),
                top_risk_factors=shipment.top_risk_factors or [],
                reroute_options=shipment.reroute_options or [],
                weather_warning=is_weather,
                weather_icon=wx_icon if is_weather else '',
                weather_label=wx_label if is_weather else '',
            )
            created_alerts.append(a.to_dict())

    # Always include recent high-severity alerts (last 30 min) so the frontend
    # gets real data to display even when dedup prevents new creation.
    # This powers the LiveAlertToast polling loop correctly.
    recent_window = now - timedelta(minutes=30)
    recent_alerts = list(
        Alert.objects
        .filter(panel='india', created_at__gte=recent_window)
        .order_by('-created_at')[:20]
    )
    recent_dicts = [a.to_dict() for a in recent_alerts]

    # Merge: newly created first, then recent ones not already in created list
    created_ids = {a['id'] for a in created_alerts}
    merged = created_alerts + [a for a in recent_dicts if a['id'] not in created_ids]

    return Response({
        'created': len(created_alerts),
        'alerts': merged,
        'scanned': qs.count(),
        'generated_at': now.isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════════════════
# ADD SHIPMENT (Admin — creates a new shipment in DB)
# ═══════════════════════════════════════════════════════════════════════════════

# Indian city coordinates for new shipment placement
_CITY_COORDS = {
    "Mumbai": (19.0760, 72.8777), "Delhi": (28.6139, 77.2090),
    "Bangalore": (12.9716, 77.5946), "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639), "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567), "Ahmedabad": (23.0225, 72.5714),
    "Surat": (21.1702, 72.8311), "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462), "Nagpur": (21.1458, 79.0882),
    "Coimbatore": (11.0168, 76.9558), "Chandigarh": (30.7333, 76.7794),
    "Indore": (22.7196, 75.8577), "Bhopal": (23.2599, 77.4126),
    "Patna": (25.5941, 85.1376), "Kochi": (9.9312, 76.2673),
    "Visakhapatnam": (17.6868, 83.2185), "Guwahati": (26.1445, 91.7362),
    "Rajkot": (22.3039, 70.8022), "Vadodara": (22.3072, 73.1812),
    "Nashik": (19.9975, 73.7898), "Varanasi": (25.3176, 82.9739),
    "Agra": (27.1767, 78.0081), "Ludhiana": (30.9010, 75.8573),
    "Amritsar": (31.6340, 74.8723), "Jodhpur": (26.2389, 73.0243),
    "Udaipur": (24.5854, 73.7125), "Kanpur": (26.4499, 80.3319),
}

_CITY_STATE = {
    "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Nashik": "Maharashtra",
    "Nagpur": "Maharashtra", "Delhi": "Delhi",
    "Bangalore": "Karnataka", "Coimbatore": "Tamil Nadu",
    "Chennai": "Tamil Nadu", "Kolkata": "West Bengal",
    "Hyderabad": "Telangana", "Ahmedabad": "Gujarat", "Surat": "Gujarat",
    "Vadodara": "Gujarat", "Rajkot": "Gujarat",
    "Jaipur": "Rajasthan", "Jodhpur": "Rajasthan", "Udaipur": "Rajasthan",
    "Lucknow": "Uttar Pradesh", "Kanpur": "Uttar Pradesh",
    "Varanasi": "Uttar Pradesh", "Agra": "Uttar Pradesh",
    "Chandigarh": "Punjab", "Amritsar": "Punjab", "Ludhiana": "Punjab",
    "Indore": "Madhya Pradesh", "Bhopal": "Madhya Pradesh",
    "Patna": "Bihar", "Kochi": "Kerala", "Guwahati": "Assam",
    "Visakhapatnam": "Andhra Pradesh",
}

import math as _math


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    d_lat = _math.radians(lat2 - lat1)
    d_lon = _math.radians(lon2 - lon1)
    a = (_math.sin(d_lat / 2) ** 2 +
         _math.cos(_math.radians(lat1)) * _math.cos(_math.radians(lat2)) *
         _math.sin(d_lon / 2) ** 2)
    return R * 2 * _math.atan2(_math.sqrt(a), _math.sqrt(1 - a))


@api_view(['POST'])
def india_add_shipment(request):
    """
    POST /api/india/shipments/add
    Admin endpoint to manually add a new shipment to the disruption system.
    Auto-calculates: coordinates, distance, risk score, live weather.
    Body: {
        origin_city, destination_city, carrier_company, cargo_type,
        transport_mode, vehicle_type, vehicle_age_years,
        driver_experience_years, shipment_value_inr, priority_level,
        order_type, planned_transit_hours (optional — auto-calculated if absent)
    }
    """
    data = request.data

    origin = data.get('origin_city', '').strip()
    destination = data.get('destination_city', '').strip()

    # Validate required fields
    if not origin or not destination:
        return Response({'error': 'origin_city and destination_city are required.'}, status=400)
    if origin == destination:
        return Response({'error': 'origin_city and destination_city must be different.'}, status=400)
    if origin not in _CITY_COORDS:
        return Response({'error': f'Unknown origin city: {origin}. Supported: {sorted(_CITY_COORDS.keys())}'}, status=400)
    if destination not in _CITY_COORDS:
        return Response({'error': f'Unknown destination city: {destination}. Supported: {sorted(_CITY_COORDS.keys())}'}, status=400)

    # Coordinates
    orig_lat, orig_lng = _CITY_COORDS[origin]
    dest_lat, dest_lng = _CITY_COORDS[destination]

    # Road distance (~1.3x haversine)
    straight_dist = _haversine(orig_lat, orig_lng, dest_lat, dest_lng)
    distance_km = round(straight_dist * 1.3, 1)

    # Auto planned transit (avg road speed ~55 km/h)
    planned_transit_hours = float(data.get('planned_transit_hours') or round(distance_km / 55.0, 1))

    # Generate unique ID
    shipment_id = f"IND-{uuid.uuid4().hex[:8].upper()}"

    # Live weather for origin
    try:
        live_wx = get_live_weather(origin)
    except Exception:
        live_wx = {'weather_condition': 'Clear', 'weather_code': 'clear',
                   'temp_c': 28.0, 'wind_speed_kmh': 10.0, 'visibility_km': 10.0,
                   'weather_severity': 1.0}

    weather_code = live_wx.get('weather_code', 'clear')
    wx_severity = float(live_wx.get('weather_severity', 1.0))
    weather_condition = (
        f"{live_wx.get('icon', '☀️')} {live_wx.get('weather_condition', 'Clear')} "
        f"({live_wx.get('temp_c', 28.0)}°C)"
    )

    # Risk score calculation (rule-based, matching training data pattern)
    vehicle_age = float(data.get('vehicle_age_years', 3))
    driver_exp = float(data.get('driver_experience_years', 5))
    carrier_rate = float(data.get('carrier_on_time_rate', 0.85))
    priority = data.get('priority_level', 'Scheduled-Freight')

    weather_risk = {'storm': 40, 'heavy_rain': 35, 'fog': 25, 'snow': 30,
                    'rain': 20, 'light_rain': 12, 'clear': 0, 'cloudy': 3}
    base_risk = 20.0
    base_risk += weather_risk.get(weather_code, 5)
    base_risk += (vehicle_age / 20) * 15          # older vehicle → more risk
    base_risk += max(0, (5 - driver_exp) / 5) * 10  # less experience → more risk
    base_risk += (1 - carrier_rate) * 20
    base_risk += wx_severity * 3.0
    if priority == 'Express':
        base_risk += 5  # express = less buffer time
    risk_score = round(min(max(base_risk, 10.0), 100.0), 1)
    risk_level = ('critical' if risk_score >= 75 else
                  'high' if risk_score >= 50 else
                  'medium' if risk_score >= 25 else 'low')

    # Build risk factors
    top_risk_factors = []
    if weather_code in ('storm', 'heavy_rain', 'fog', 'snow'):
        top_risk_factors.append(f"⛈️ {weather_condition} — weather risk on route")
    if vehicle_age > 8:
        top_risk_factors.append(f"🔧 Aging vehicle ({vehicle_age:.0f}yrs) — breakdown risk elevated")
    if driver_exp < 3:
        top_risk_factors.append(f"👨‍✈️ New driver ({driver_exp:.0f}yrs exp) — monitoring required")
    if carrier_rate < 0.7:
        top_risk_factors.append(f"📉 Carrier on-time rate: {int(carrier_rate*100)}%")
    if not top_risk_factors:
        top_risk_factors.append("✅ Standard risk — no critical factors detected")

    # Persist to DB
    shipment = Shipment.objects.create(
        id=shipment_id,
        panel='india',
        origin_city=origin,
        origin_state=_CITY_STATE.get(origin, 'India'),
        destination_city=destination,
        destination_state=_CITY_STATE.get(destination, 'India'),
        transport_mode=data.get('transport_mode', 'road'),
        lat=orig_lat,
        lng=orig_lng,
        origin_lat=orig_lat,
        origin_lng=orig_lng,
        destination_lat=dest_lat,
        destination_lng=dest_lng,
        carrier_company=data.get('carrier_company', '').strip() or 'Unknown Carrier',
        carrier_id=data.get('carrier_id', '').strip() or 'CARRIER-MANUAL',
        cargo_type=data.get('cargo_type', 'General').strip(),
        distance_km=distance_km,
        distance_covered_km=0,
        distance_remaining_km=distance_km,
        progress=0.0,
        planned_transit_hours=planned_transit_hours,
        eta_hours=planned_transit_hours,
        speed_kmh=55.0,
        status='loading',
        is_delayed=False,
        delay_hours_current=0,
        delay_duration_minutes=0,
        delay_severity='low',
        disruption_type='none',
        disruption_flag=0,
        risk_score=risk_score,
        risk_level=risk_level,
        is_anomaly=False,
        delay_probability=round(risk_score / 100 * 0.9, 3),
        cascade_risk_score=0.1,
        weather_code=weather_code,
        weather_condition=weather_condition,
        wind_speed_kmh=float(live_wx.get('wind_speed_kmh', 10.0)),
        visibility_km=float(live_wx.get('visibility_km', 10.0)),
        live_weather=live_wx,
        traffic_congestion_level='Low',
        vehicle_type=data.get('vehicle_type', 'Tata 407').strip(),
        vehicle_age_years=vehicle_age,
        driver_experience_years=driver_exp,
        driver_rest_hours_prior=float(data.get('driver_rest_hours_prior', 8)),
        num_toll_plazas=max(1, int(distance_km / 80)),
        num_state_border_crossings=1 if origin != destination else 0,
        eway_bill_verified=1,
        origin_wh_congestion_pct=40.0,
        dest_wh_congestion_pct=30.0,
        upstream_shipment_delay_minutes=0,
        order_type=data.get('order_type', 'B2B'),
        priority_level=priority,
        is_monsoon_season=0,
        is_festival_season=0,
        fuel_price_per_litre=float(data.get('fuel_price_per_litre', 104.0)),
        shipment_value_inr=float(data.get('shipment_value_inr', 100000)),
        value_usd=int(float(data.get('shipment_value_inr', 100000)) / 84),
        carrier_on_time_rate=carrier_rate,
        route_avg_delay_7d=0,
        route_disruption_cnt_30d=0,
        seasonal_risk_score=0.2,
        same_lane_delay_ratio=0.3,
        top_risk_factors=top_risk_factors,
        reroute_options=[],
        recommended_action='monitor',
    )

    # Auto-create an initial alert for new shipment
    Alert.objects.create(
        id=f"ALT-NEW-{uuid.uuid4().hex[:6].upper()}",
        shipment_id=shipment.id,
        panel='india',
        type='shipment_created',
        severity='low',
        message=(
            f"✅ New shipment {shipment_id} added: {origin} → {destination}. "
            f"Distance: {distance_km:.0f}km. ETA: {planned_transit_hours:.1f}h. "
            f"Carrier: {shipment.carrier_company}. Cargo: {shipment.cargo_type}. "
            f"Risk: {risk_score:.0f}/100 [{risk_level.upper()}]."
        ),
        risk_score=risk_score,
        delay_probability=shipment.delay_probability,
        cascade_risk=0.0,
        top_risk_factors=top_risk_factors,
        weather_warning=weather_code in WEATHER_ALERT_CODES,
        weather_icon=WEATHER_ICON_MAP.get(weather_code, ('🌡️', ''))[0],
        weather_label=WEATHER_ICON_MAP.get(weather_code, ('', weather_code.title()))[1],
    )

    return Response({
        'success': True,
        'shipment': shipment.to_dict(),
        'message': f'Shipment {shipment_id} created successfully.',
    }, status=201)


# ─── Legacy placeholder kept for backwards compatibility ─────────────────────
@api_view(['GET', 'POST'])
def india_login(request):
    """Kept so old client code calling /api/india/login gets a helpful message."""
    return Response({
        'detail': 'Login has moved to POST /api/auth/login',
        'new_endpoint': '/api/auth/login',
    }, status=308)


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER PANEL — ALERT NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Customer-facing alert message templates — human-readable, no jargon
_CUSTOMER_ALERT_TEMPLATES = {
    'delayed': {
        'type': 'shipment_delayed',
        'severity_fn': lambda s: 'critical' if float(s.delay_hours_current or 0) > 4 else 'high',
        'message_fn': lambda s: (
            f"🚚 Your shipment {s.id} ({s.origin_city}→{s.destination_city}) is delayed. "
            f"Current delay: {float(s.delay_hours_current or 0):.1f}h. "
            f"New ETA: {float(s.eta_hours or 0):.1f}h from now. "
            f"Carrier: {s.carrier_company}. Disruption: {s.disruption_type.replace('_', ' ').title() if s.disruption_type and s.disruption_type != 'none' else 'Congestion'}."
        ),
    },
    'weather': {
        'type': 'weather_impact',
        'severity_fn': lambda s: 'high' if s.weather_code in ('storm', 'heavy_rain') else 'medium',
        'message_fn': lambda s: (
            f"🌦️ Weather impacting your shipment {s.id} on route "
            f"{s.origin_city}→{s.destination_city}. "
            f"Condition: {s.weather_condition.split('(')[0].strip()}. "
            f"Visibility: {s.visibility_km:.1f}km. "
            f"Carrier {s.carrier_company} is monitoring the situation."
        ),
    },
    'customs': {
        'type': 'customs_hold',
        'severity_fn': lambda s: 'high',
        'message_fn': lambda s: (
            f"🛃 Customs hold on your shipment {s.id} ({s.origin_city}→{s.destination_city}). "
            f"E-way bill: {'Verified ✅' if s.eway_bill_verified else 'Pending ❌'}. "
            f"Estimated clearance time: {round(float(s.checkpoint_delay_minutes or 120) / 60, 1)}h. "
            f"Our team is coordinating with customs authorities."
        ),
    },
    'high_risk': {
        'type': 'risk_alert',
        'severity_fn': lambda s: 'critical' if float(s.risk_score or 0) > 80 else 'high',
        'message_fn': lambda s: (
            f"⚠️ Risk alert for shipment {s.id} ({s.origin_city}→{s.destination_city}). "
            f"Risk index: {float(s.risk_score or 0):.0f}/100. "
            f"Delay probability: {int(float(s.delay_probability or 0) * 100)}%. "
            f"Our logistics team is proactively managing your cargo."
        ),
    },
    'in_transit_update': {
        'type': 'shipment_update',
        'severity_fn': lambda s: 'low',
        'message_fn': lambda s: (
            f"📦 Shipment update: {s.id} is {int(s.progress * 100)}% complete "
            f"({s.origin_city}→{s.destination_city}). "
            f"Distance remaining: {s.distance_remaining_km:.0f}km. "
            f"ETA: {float(s.eta_hours or 0):.1f}h. "
            f"Carrier: {s.carrier_company}."
        ),
    },
}

_CUSTOMER_WX_CODES = frozenset({'storm', 'heavy_rain', 'fog', 'snow', 'rain'})


@api_view(['GET'])
def customer_alerts(request):
    """
    GET /api/customer/alerts?limit=10&offset=0
    Returns real-time alerts for the customer panel based on shipment conditions.
    Called every 2 minutes from the frontend — always returns fresh data.

    Strategy:
    - Scans top 20 shipments by risk_score
    - Generates contextual messages for delayed, weather-impacted, customs-held,
      and high-risk shipments
    - Deduplicates within a 2-minute window so each poll cycle gets fresh alerts
    - Returns a mix of newly created + recent alerts so the frontend always gets data
    """
    limit  = int(request.query_params.get('limit', 10))
    offset = int(request.query_params.get('offset', 0))

    # Fetch shipments to scan
    shipments = list(
        Shipment.objects
        .filter(panel='india', status__in=ACTIVE_STATUSES)
        .order_by('-risk_score')[:20]
    )

    now           = datetime.now(timezone.utc)
    dedup_cutoff  = now - timedelta(minutes=2)   # 2-min dedup window
    created_alerts = []

    # Existing (shipment_id, alert_type) pairs in last 2 min to avoid exact duplicates
    existing_pairs = set(
        Alert.objects
        .filter(panel='india', created_at__gte=dedup_cutoff)
        .values_list('shipment_id', 'type')
    )

    for s in shipments:
        rs = float(s.risk_score or 0)
        wx = s.weather_code or 'clear'
        candidates = []

        # 1. Delayed shipments
        if s.status == 'delayed' and float(s.delay_hours_current or 0) > 0.5:
            tmpl = _CUSTOMER_ALERT_TEMPLATES['delayed']
            if (s.id, tmpl['type']) not in existing_pairs:
                candidates.append(tmpl)

        # 2. Customs hold
        elif s.status == 'customs_hold' or s.customs_hold_flag:
            tmpl = _CUSTOMER_ALERT_TEMPLATES['customs']
            if (s.id, tmpl['type']) not in existing_pairs:
                candidates.append(tmpl)

        # 3. Severe weather on active shipments
        elif wx in _CUSTOMER_WX_CODES and rs > 30:
            tmpl = _CUSTOMER_ALERT_TEMPLATES['weather']
            if (s.id, tmpl['type']) not in existing_pairs:
                candidates.append(tmpl)

        # 4. High risk (not delayed but risky)
        elif rs > 70 and s.status in ('in_transit', 'loading', 'at_port'):
            tmpl = _CUSTOMER_ALERT_TEMPLATES['high_risk']
            if (s.id, tmpl['type']) not in existing_pairs:
                candidates.append(tmpl)

        # 5. Regular in-transit update for lower risk
        elif s.status == 'in_transit' and rs < 40:
            tmpl = _CUSTOMER_ALERT_TEMPLATES['in_transit_update']
            if (s.id, tmpl['type']) not in existing_pairs:
                candidates.append(tmpl)

        # Persist first candidate (max 1 alert per shipment per cycle)
        for tmpl in candidates[:1]:
            alert_id  = f"CUST-{uuid.uuid4().hex[:8].upper()}"
            severity  = tmpl['severity_fn'](s)
            msg       = tmpl['message_fn'](s)
            wx_icon, wx_label = WEATHER_ICON_MAP.get(wx, ('📦', wx.title()))
            is_weather = wx in _CUSTOMER_WX_CODES

            a = Alert.objects.create(
                id=alert_id,
                shipment_id=s.id,
                panel='india',
                type=tmpl['type'],
                severity=severity,
                message=msg,
                risk_score=rs,
                delay_probability=float(s.delay_probability or 0),
                cascade_risk=float(s.cascade_risk_score or 0),
                top_risk_factors=s.top_risk_factors or [],
                reroute_options=[],
                weather_warning=is_weather,
                weather_icon=wx_icon if is_weather else '',
                weather_label=wx_label if is_weather else '',
            )
            created_alerts.append(a.to_dict())

    # Always return recent alerts (last 5 min) alongside newly created ones
    # so the frontend gets data even in dedup windows
    recent_window = now - timedelta(minutes=5)
    recent = list(
        Alert.objects
        .filter(panel='india', created_at__gte=recent_window)
        .order_by('-created_at')[offset:offset + limit]
    )
    recent_dicts = [a.to_dict() for a in recent]

    # Merge: new first, then recent not already included
    created_ids = {a['id'] for a in created_alerts}
    merged = (created_alerts + [a for a in recent_dicts if a['id'] not in created_ids])
    # Apply pagination window
    paginated = merged[offset:offset + limit]

    return Response({
        'alerts':     paginated,
        'created':    len(created_alerts),
        'total':      len(merged),
        'polled_at':  now.isoformat(),
    })


@api_view(['POST'])
def customer_chat(request):
    """
    POST /api/customer/chat
    Request body: { "messages": [...] }
    Returns: { "response": "..." }
    """
    user, err = _require_auth(request, panel='customer')
    if err:
        return err

    messages = request.data.get('messages', [])
    if not isinstance(messages, list):
        return Response({'error': 'Messages must be a list.'}, status=400)

    # Fetch active shipments matching the customer's partition
    qs = list(
        Shipment.objects
        .filter(panel='india', status__in=ACTIVE_STATUSES)
        .order_by('-risk_score')[:30]
    )
    
    # Minimize fields to prevent Groq API Request Too Large (413) token limits
    customer_shipments = []
    for idx, s in enumerate(qs):
        if idx % 3 == 0:
            sd = s.to_dict()
            customer_shipments.append({
                'id': sd.get('id'),
                'origin': sd.get('origin'),
                'destination': sd.get('destination'),
                'carrier': sd.get('carrier'),
                'cargo_type': sd.get('cargo_type'),
                'status': sd.get('status'),
                'eta_hours': sd.get('eta_hours'),
                'risk_score': sd.get('risk_score'),
                'risk_level': sd.get('risk_level'),
                'weather': sd.get('weather_condition'),
                'delay_hours': sd.get('delay_hours_current'),
                'recommended_action': sd.get('recommended_action')
            })

    # Get LLM agent and call chat helper
    llm = _get_llm()
    if not llm:
        response_text = (
            "Sorry, our AI chat service is currently offline. "
            "Please contact your support officer directly for immediate assistance."
        )
    else:
        try:
            response_text = llm.customer_support_chat(messages, customer_shipments)
        except Exception as e:
            logger.exception("Error in customer chat:")
            response_text = (
                "Sorry, I encountered an issue processing your request. "
                "Please try again or contact support."
            )

    return Response({'response': response_text})


# ─── Support Tickets Views ───────────────────────────────────────────────────

@api_view(['POST'])
def customer_create_ticket(request):
    """
    POST /api/customer/tickets
    Request body: { "subject": "...", "subject_type": "...", "message": "..." }
    """
    user_dict, err = _require_auth(request, panel='customer')
    if err:
        return err

    subject      = request.data.get('subject', '').strip()
    subject_type = request.data.get('subject_type', 'General').strip()
    message      = request.data.get('message', '').strip()

    if not subject or not message:
        return Response({'error': 'Subject and message are required.'}, status=400)

    try:
        from api.models import SupportTicket
        customer_obj = Customer.objects.get(pk=user_dict['id'])
        ticket = SupportTicket.objects.create(
            customer=customer_obj,
            subject=subject,
            subject_type=subject_type,
            message=message
        )
        return Response({'success': True, 'ticket': ticket.to_dict()}, status=201)
    except Exception as e:
        logger.exception("Failed to create support ticket:")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def admin_get_tickets(request):
    """
    GET /api/admin/tickets
    """
    user_dict, err = _require_auth(request, panel='india')
    if err:
        return err

    try:
        from api.models import SupportTicket
        tickets = SupportTicket.objects.all()
        return Response([t.to_dict() for t in tickets])
    except Exception as e:
        logger.exception("Failed to fetch support tickets:")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def admin_resolve_ticket(request, ticket_id):
    """
    POST /api/admin/tickets/<ticket_id>/resolve
    """
    user_dict, err = _require_auth(request, panel='india')
    if err:
        return err

    try:
        from api.models import SupportTicket
        ticket = SupportTicket.objects.get(pk=ticket_id)
        ticket.status = 'resolved'
        ticket.save()
        return Response({'success': True, 'ticket': ticket.to_dict()})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found.'}, status=404)
    except Exception as e:
        logger.exception("Failed to resolve support ticket:")
        return Response({'error': str(e)}, status=500)
