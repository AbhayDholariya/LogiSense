"""
URL patterns — LogiSense Supply Chain Intelligence Platform (Django + NeonDB)
"""

from django.urls import path
from api import views

urlpatterns = [
    # ── Server health ─────────────────────────────────────────────────────────
    path('health', views.health_check),

    # ── Auth (server-side bcrypt + HMAC token) ────────────────────────────────
    # POST /api/auth/login   — checks admin_users then customers tables
    # POST /api/auth/verify  — validates token, re-checks DB
    # NOTE: /api/auth/register intentionally REMOVED — no public self-registration
    path('api/auth/login',    views.auth_login),       # POST
    path('api/auth/verify',   views.auth_verify),      # POST

    # ── Demo request (landing page form) ─────────────────────────────────────
    path('api/demo-request',  views.submit_demo_request),  # POST

    # ── Admin — Demo Request Management (India panel auth required) ───────────
    path('api/admin/demo-requests',                        views.list_demo_requests),         # GET
    path('api/admin/demo-requests/<int:demo_id>/accept',   views.accept_demo_request),        # POST
    path('api/admin/demo-requests/<int:demo_id>/reject',   views.reject_demo_request),        # POST

    # ── India Supply Chain Panel ──────────────────────────────────────────────
    path('api/india/login',   views.india_login),          # legacy redirect
    path('api/india/health',  views.india_health),
    path('api/india/shipments',              views.india_shipments),
    path('api/india/shipments/add',          views.india_add_shipment),        # POST — add new shipment (BEFORE <id> pattern)
    path('api/india/shipments/<str:shipment_id>', views.india_shipment_detail),
    path('api/india/alerts',                 views.india_alerts),
    path('api/india/cascade-events',         views.india_cascade_events),
    path('api/india/analyze',                views.india_analyze),
    path('api/india/cascade',                views.india_cascade),
    path('api/india/reroute/<str:shipment_id>', views.india_reroute),
    path('api/india/weather-refresh',        views.india_weather_refresh),
    path('api/india/generate-alerts',        views.india_generate_alerts),    # POST — AI-based alert generation

    # ── Customer Panel ────────────────────────────────────────────────────────
    path('api/customer/alerts',              views.customer_alerts),           # GET — customer shipment alerts
    path('api/customer/chat',                views.customer_chat),             # POST — customer AI chatbot
    path('api/customer/tickets',             views.customer_create_ticket),    # POST — customer support ticket

    # ── Support Tickets (Admin / India Panel) ──────────────────────────────────
    path('api/admin/tickets',                         views.admin_get_tickets),       # GET — admin list tickets
    path('api/admin/tickets/<int:ticket_id>/resolve', views.admin_resolve_ticket),     # POST — admin resolve ticket
]
