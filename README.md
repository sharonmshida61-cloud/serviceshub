# Nearby — a multi-category local services platform

One platform where customers discover, compare, book, pay for, message, and
review local service providers — barbers, salons, car washes, laundry,
cleaning, plumbers, electricians, mechanics, photographers, tutors, tailors,
fitness trainers, event planners, massage therapists, freelancers, home
repair, and any category an admin adds later **without touching code**.

## Why it's easy to add a new category

Every business category (Barbers, Plumbers, Tutors...) is a **row in the
`Category` table**, not a hardcoded type. Each category carries a small JSON
`attributeSchema` describing its extra fields (e.g. "vehicle sizes served"
for Car Washes, "subjects taught" for Tutors). The frontend renders forms for
those fields dynamically from the schema. To launch a new category — say,
"Dog Groomers" — an admin fills in a form in the Admin dashboard (or calls
`POST /api/categories`); no deploy required.

## Architecture

```
local-services-platform/
├── backend/     Node.js + Express REST API, Prisma ORM, PostgreSQL
└── frontend/    React + Vite single-page app
```

**Roles**: `CUSTOMER`, `BUSINESS_OWNER`, `EMPLOYEE`, `ADMIN` — enforced by
JWT auth + role middleware on every protected route (see
`backend/src/middleware/`).

**Core flow**: Discover → Compare → Book → Pay → Message → Review, all
backed by dedicated route files under `backend/src/routes/`. Payments go
through a small provider abstraction (`backend/src/utils/payments.js`) so a
real gateway (Stripe, Flutterwave, M-Pesa, Paystack...) can be dropped in
without touching the booking logic.

## Running it locally

Requires Node.js 18+ and PostgreSQL 12+.

### 1. Database Setup

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Verify it's running
docker ps
```

**Option B: Local PostgreSQL Installation**
- Install PostgreSQL from https://www.postgresql.org/download/
- Create database: `createdb localservices`
- Or use pgAdmin/psql to create the database

### 2. Backend

```bash
cd backend
cp .env.example .env       # edit DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run seed                # creates categories + demo accounts
npm run dev                  # http://localhost:4000
```

**Important**: Update your `.env` file with your PostgreSQL connection:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/localservices"
```

Seed accounts (all use password `password123`):

| Role           | Email                         | Notes                        |
|----------------|--------------------------------|-------------------------------|
| Admin          | admin@platform.test           | approves listings, manages categories |
| Business Owner | owner.barber@platform.test    | owns "Fresh Fade Barbershop" |
| Business Owner | owner.cleaning@platform.test  | owns "Amara Home Cleaning"   |
| Employee       | employee1@platform.test       | staff at Fresh Fade Barbershop |
| Customer       | customer1@platform.test       | has one completed booking + review |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

The frontend expects the API at `http://localhost:4000/api` by default; set
`VITE_API_URL` in a `frontend/.env` file to point elsewhere.

## Deploying to Render

This repository now includes a [render.yaml](render.yaml) blueprint for a simple Render deployment:

- **Backend web service**: runs the Express API from [backend](backend)
- **Frontend static site**: builds the Vite app from [frontend](frontend)
- **Environment variables**: set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `VITE_API_URL` and `API_BASE_URL`

### Render service settings

Backend:
- Build command: `cd backend && npm install && npm run prisma:generate`
- Start command: `cd backend && npm start`
- Health check path: `/health`

Frontend:
- Build command: `cd frontend && npm install && npm run build`
- Publish directory: `frontend/dist`

### Database

The application now uses PostgreSQL for both development and production. The Prisma schema is configured to use PostgreSQL, providing better performance, scalability, and production-ready features compared to SQLite.

## Moving to production

- **Database**: The app uses PostgreSQL — just point `DATABASE_URL` at a 
  managed Postgres instance (Render, Railway, Supabase, AWS RDS, etc.).
  Enable SSL with `?sslmode=require` in production.
- **Payments**: implement the same `charge()` signature in
  `backend/src/utils/payments.js` against a real gateway.
- **File storage**: avatars/photos aren't wired to a storage bucket in this
  build — add an upload endpoint + S3/Cloudinary when needed.
- **Realtime messaging**: messages are polled/fetched over REST here; swap
  in WebSockets or Server-Sent Events for live chat if needed.
- **Search**: business search is a simple SQL filter; for large catalogs,
  add Postgres full-text search or an external index (Meilisearch, Algolia).

## What's included vs. stubbed

| Feature | Status |
|---|---|
| Multi-category discovery, search, filter, compare | ✅ full |
| Booking lifecycle (request → confirm/decline → complete/cancel) | ✅ full |
| Role-based auth (customer, business owner, employee, admin) | ✅ full |
| Messaging between customer and business | ✅ full (REST-based, not realtime) |
| Reviews + owner replies + rating aggregation | ✅ full |
| Admin: approve listings, manage categories, manage user roles | ✅ full |
| Payments | ✅ full flow, mock gateway (instant "charge") |
| Employee scheduling / calendar slots | ⚠️ basic weekly-availability model only |
| Notifications (email/SMS) | ❌ not included — hook in at booking/status-change events |
