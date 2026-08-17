# LogiSense — Logistics Intelligence Platform

Enterprise-grade supply chain disruption prediction and autonomous freight rerouting system.

## Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Start development server (runs on http://localhost:3000)
npm run dev
```

## Environment Variables

Copy `.env` and adjust as needed:

```
VITE_API_URL=http://localhost:8000      # FastAPI backend
VITE_WS_URL=ws://localhost:8000/ws     # WebSocket endpoint
VITE_USE_MOCK=true                      # Use mock data (set false to use live API)
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Executive Control Tower Dashboard |
| `/command-center` | Interactive Map Command Center |
| `/shipments` | Shipment Monitoring Table |
| `/disruption-engine` | Predictive Disruption Engine |
| `/rerouting` | Autonomous Rerouting Console |
| `/alerts` | Alert Intelligence Center |
| `/analytics` | Analytics & Forecasting |

## Backend

```bash
# Start FastAPI backend
cd ..
uvicorn backend.fastapi_backend_main:app --reload --port 8000
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (glassmorphism dark theme)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **State**: Zustand
- **API**: Axios
- **WebSockets**: Native WebSocket API
- **Backend**: FastAPI + Python
