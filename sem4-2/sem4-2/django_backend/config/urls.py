"""
URL Configuration — Supply Chain Intelligence Platform
API routes are handled by api.urls.
All other routes serve the React SPA (index.html).
"""

from django.urls import path, include, re_path
from django.conf import settings
from django.views.generic import TemplateView
from django.contrib.staticfiles.views import serve as static_serve
import os

# Serve React's index.html for any non-API route
class ReactAppView(TemplateView):
    def get(self, request, *args, **kwargs):
        from django.http import FileResponse, Http404
        index_path = settings.FRONTEND_DIR / 'index.html'
        if not index_path.exists():
            from django.http import HttpResponse
            return HttpResponse(
                "<h2>Frontend not built.</h2>"
                "<p>Run: <code>cd frontend && npm run build</code></p>",
                content_type='text/html',
                status=503
            )
        return FileResponse(open(index_path, 'rb'), content_type='text/html')


def serve_frontend_asset(request, path):
    """Serve static assets from frontend/dist/"""
    from django.http import FileResponse, Http404
    file_path = settings.FRONTEND_DIR / path
    if file_path.exists() and file_path.is_file():
        import mimetypes
        content_type, _ = mimetypes.guess_type(str(file_path))
        return FileResponse(open(file_path, 'rb'), content_type=content_type or 'application/octet-stream')
    raise Http404


urlpatterns = [
    # ── All API endpoints ─────────────────────────────────────────────────────
    path('', include('api.urls')),

    # ── Frontend static assets (JS, CSS, images from dist/assets/) ────────────
    re_path(r'^assets/(?P<path>.+)$', serve_frontend_asset),
    re_path(r'^favicon\.svg$', serve_frontend_asset, {'path': 'favicon.svg'}),
    re_path(r'^favicon\.ico$', serve_frontend_asset, {'path': 'favicon.ico'}),

    # ── Catch-all: serve React index.html for all other routes ────────────────
    re_path(r'^.*$', ReactAppView.as_view()),
]
