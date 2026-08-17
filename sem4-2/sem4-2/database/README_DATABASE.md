# LogiSense — NeonDB PostgreSQL Setup Guide

## 1. Create a NeonDB project

1. Go to **https://console.neon.tech** → Sign up / Log in
2. Click **"New Project"** → name it `logisense`
3. Choose region closest to you (e.g. `us-east-2`)
4. Once created, go to **Connection Details** → copy the connection string:
   ```
   postgresql://neondb_owner:<password>@ep-<hash>.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Set DATABASE_URL in .env

Open `c:\Users\vishv\Desktop\SEM4-1\.env` and replace the placeholder:

```env
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR_HASH.us-east-2.aws.neon.tech/neondb?sslmode=require
DJANGO_SECRET_KEY=replace-with-a-long-random-string
```

## 3. Run Django migrations

```cmd
cd c:\Users\vishv\Desktop\SEM4-1\django_backend
python manage.py migrate
```

This creates all 7 tables in NeonDB:
- `admin_contacts` — vishv & jani support contacts
- `users` — operators + customer accounts (bcrypt hashed passwords)
- `demo_requests` — landing page form submissions
- `shipments` — up to 500 Indian supply chain shipments
- `alerts` — high-risk shipment alerts
- `cascade_events` — cascading failure predictions
- `refresh_log` — weather refresh audit trail

## 4. Seed the database

```cmd
python manage.py seed_db
```

Options:
```cmd
python manage.py seed_db --count 500   # default: 500 shipments
python manage.py seed_db --count 200   # lighter load
python manage.py seed_db --clear       # wipe & re-seed
python manage.py seed_db --users-only  # only create admin contacts + jani user
```

What it seeds:
- `AdminContact`: vishv (global admin) and jani (India ops)
- `User`: operator `jani` with password `jani@1309` (bcrypt hashed, 12 rounds)
- 500 `Shipment` rows loaded from `data/supply_chain_1M.csv`
- ~20 `Alert` rows auto-generated from high-risk shipments

## 5. Start the backend

```cmd
cd c:\Users\vishv\Desktop\SEM4-1\django_backend
python manage.py runserver 8000
```

## 6. Start the frontend

```cmd
cd c:\Users\vishv\Desktop\SEM4-1\frontend
npm run dev
```

---

## Database Schema Summary

### users table
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| username | VARCHAR(64) UNIQUE | 3-64 chars, lowercase+digits+_. only |
| email | VARCHAR(256) UNIQUE | optional for customers |
| password_hash | VARCHAR(256) | bcrypt $2b$ hash, 12 rounds |
| panel | VARCHAR(16) | `india` or `customer` |
| display_name | VARCHAR(128) | |
| company_name | VARCHAR(256) | customers only |
| role | VARCHAR(32) | `operator`, `admin`, `customer` |
| admin_contact_id | INT FK | references admin_contacts |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| last_login | TIMESTAMPTZ | updated on every login |

### shipments table
500 rows loaded from `supply_chain_1M.csv`. All ~60 fields from the
in-memory store are persisted including risk scores, weather, flags,
coordinates, and JSONB columns for risk factors and reroute options.

Key indexes:
- `status` — filters active shipments
- `risk_score DESC` — dashboard top-risk queries
- `origin_city`, `destination_city` — route filtering
- Partial index on active statuses for fast dashboard load
- BRIN index on `created_at` for time-range queries

### Password security
- Hashed with **bcrypt** ($2b$), **12 rounds** — industry standard
- Never stored or transmitted in plaintext
- Timing-safe comparison via `bcrypt.checkpw()`
- Token: HMAC-SHA256 signed, 8-hour TTL, server-verified on every refresh

---

## Auth Flow (new server-side)

```
Browser                    Django + NeonDB
  |                              |
  |  POST /api/auth/login        |
  |  { username, password }  →   |  bcrypt.checkpw(password, db_hash)
  |                          ←   |  { token, user }
  |  store token in            
  |  sessionStorage              
  |                              
  |  GET /api/india/shipments    
  |  Authorization: Bearer <token>  (optional — endpoints are public)
  |                              
  |  POST /api/auth/verify       
  |  { token }               →   |  HMAC verify + expiry check
  |                          ←   |  { user } or 401
```

## Customer Registration

```
POST /api/auth/register
{
  "username":    "acme_logistics",
  "password":    "SecurePass123",
  "displayName": "Rajesh Kumar",
  "companyName": "Acme Logistics Pvt Ltd",
  "adminChoice": "vishv",   // or "jani"
  "email":       "rajesh@acme.com"   // optional
}
```

Returns `{ token, user }` — customer is immediately logged in.

## Demo Request

```
POST /api/demo-request
{
  "fullName": "Priya Sharma",
  "email":    "priya@company.com",
  "phone":    "+91 98765 43210",
  "company":  "Sharma Exports",
  "role":     "Shipper",
  "volume":   "500 - 5000"
}
```

Stored in `demo_requests` table, visible from any PostgreSQL client.
