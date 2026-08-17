# Django Backend and React Frontend Startup Instructions
# =======================================================

# 1. Activate your virtual environment (if not already done):
# On Windows:
#   .\venv\Scripts\activate
# On macOS/Linux:
#   source venv/bin/activate

# 2. Run the Django ASGI backend (handles REST API + WebSockets):
python django_backend/manage.py runserver 8000

# 3. Run the React Vite development server (in a separate terminal):
# Go to the frontend directory:
#   cd frontend
# Start dev server:
#   npm run dev

# 4. Verification:
# Run tests to verify Django backend endpoints:
python test_api_endpoints.py
