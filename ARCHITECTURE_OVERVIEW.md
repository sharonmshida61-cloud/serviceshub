# LocalServices Platform Architecture

## 🏗️ System Architecture (After PostgreSQL Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                     React + Vite SPA                             │
│                   http://localhost:5173                          │
│                                                                  │
│  Components: Browse, Bookings, Messages, Reviews, Admin, etc.   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST API
                            │ axios
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                   Node.js + Express API                          │
│                   http://localhost:4000                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes Layer                                              │  │
│  │  - /api/auth           - /api/bookings                     │  │
│  │  - /api/businesses     - /api/reviews                      │  │
│  │  - /api/categories     - /api/messages                     │  │
│  │  - /api/payments       - /api/admin                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Middleware Layer                                          │  │
│  │  - JWT Authentication  - Role-based Authorization          │  │
│  │  - Error Handling     - Request Logging                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM Layer                                          │  │
│  │  @prisma/client - Generated Type-Safe Client               │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Prisma Queries
                            │ SQL over TCP
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL DATABASE                         │
│                   postgresql://localhost:5432                    │
│                                                                  │
│  📊 Tables:                                                      │
│  - User                    - Business                            │
│  - Category                - Service                             │
│  - Booking                 - Review                              │
│  - Payment                 - Message                             │
│  - LoyaltyCard             - Portfolio                           │
│  - Notification            - QRCheckIn                           │
│  - And 15+ more tables...                                        │
│                                                                  │
│  🔧 Features:                                                    │
│  - ACID Transactions       - Full-Text Search                    │
│  - JSON Operations         - Concurrent Access                   │
│  - UUID Primary Keys       - Advanced Indexing                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Examples

### 1. Customer Books a Service

```
┌──────────┐     ┌──────────┐     ┌─────────┐     ┌──────────────┐
│ Customer │────▶│ Frontend │────▶│ Backend │────▶│  PostgreSQL  │
│  Browser │     │   React  │     │ Express │     │   Database   │
└──────────┘     └──────────┘     └─────────┘     └──────────────┘
     │                │                 │                  │
     │ Click "Book"   │                 │                  │
     │───────────────▶│                 │                  │
     │                │                 │                  │
     │                │ POST /api/bookings                 │
     │                │──────────────────▶                 │
     │                │                 │                  │
     │                │            JWT Auth                │
     │                │            Validate                │
     │                │                 │                  │
     │                │                 │ INSERT INTO      │
     │                │                 │   Booking        │
     │                │                 │─────────────────▶│
     │                │                 │                  │
     │                │                 │ ◀── Success      │
     │                │                 │                  │
     │                │ ◀── Booking ID  │                  │
     │                │                 │                  │
     │ ◀── Success    │                 │                  │
     │   Redirect     │                 │                  │
     └────────────────┴─────────────────┴──────────────────┘
```

### 2. Admin Adds New Category

```
Admin Dashboard → POST /api/categories → Prisma → PostgreSQL

INSERT INTO Category (id, name, slug, attributeSchema, ...)
VALUES ('uuid', 'Dog Groomers', 'dog-groomers', '[...]', ...)

✅ New category available immediately
   - Search includes new category
   - Business owners can register
   - Dynamic forms generated from schema
```

## 📦 Database Schema Overview

### Core Entities

```
User ─────────┬─────▶ Business (owns)
              │
              ├─────▶ Booking (creates)
              │
              ├─────▶ Review (writes)
              │
              └─────▶ Message (sends)

Business ─────┬─────▶ Service (offers)
              │
              ├─────▶ Portfolio (showcases)
              │
              ├─────▶ Availability (defines)
              │
              └─────▶ LoyaltyCard (rewards)

Category ─────┬─────▶ Business (classifies)
              │
              └─────▶ Service (types)

Booking ──────┬─────▶ Payment (requires)
              │
              ├─────▶ Review (generates)
              │
              ├─────▶ Message (about)
              │
              └─────▶ QRCheckIn (enables)
```

### Key Relationships

- **One User** can own **many Businesses**
- **One Business** belongs to **one Category**
- **One Business** offers **many Services**
- **One Booking** links Customer + Business + Service
- **One Booking** has **one Payment** (when paid)
- **One Booking** can have **one Review** (when completed)

## 🔐 Authentication & Authorization

```
┌────────────┐
│   Login    │
│ Credentials│
└──────┬─────┘
       │
       ▼
┌────────────────────┐
│  Backend Validates │
│  bcrypt password   │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Generate JWT      │
│  Contains:         │
│  - userId          │
│  - role            │
│  - email           │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Return Token      │
│  to Frontend       │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Store in          │
│  localStorage      │
└────────────────────┘

Subsequent Requests:
Authorization: Bearer <JWT>
       │
       ▼
┌────────────────────┐
│  Middleware        │
│  Verifies JWT      │
│  Extracts userId   │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Route Handler     │
│  Access to         │
│  req.user          │
└────────────────────┘
```

## 🎭 User Roles

```
┌─────────────────────────────────────────────────────────┐
│                         ADMIN                            │
│  - Manage all businesses                                 │
│  - Approve/reject listings                               │
│  - Manage categories                                     │
│  - Ban/unban users                                       │
│  - View all analytics                                    │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────┼─────────────────────────────┐
│                    BUSINESS_OWNER                        │
│  - Create/manage own businesses                          │
│  - Manage services & pricing                             │
│  - View/respond to bookings                              │
│  - Reply to reviews                                      │
│  - Manage portfolio                                      │
└──────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────┼─────────────────────────────┐
│                        EMPLOYEE                          │
│  - View business bookings                                │
│  - Check in customers (QR)                               │
│  - Manage appointments                                   │
└──────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────┼─────────────────────────────┐
│                        CUSTOMER                          │
│  - Browse businesses                                     │
│  - Create bookings                                       │
│  - Write reviews                                         │
│  - Send messages                                         │
│  - Track loyalty points                                  │
└──────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Architecture

### Development (Local)

```
┌─────────────────────┐
│   Docker Desktop    │
│                     │
│  ┌───────────────┐ │
│  │  PostgreSQL   │ │
│  │  Container    │ │
│  │  :5432        │ │
│  └───────────────┘ │
└─────────────────────┘
         ▲
         │ DATABASE_URL
         │
┌─────────────────────┐
│   Terminal 1        │
│   cd backend        │
│   npm run dev       │
│   :4000             │
└─────────────────────┘
         ▲
         │ API_URL
         │
┌─────────────────────┐
│   Terminal 2        │
│   cd frontend       │
│   npm run dev       │
│   :5173             │
└─────────────────────┘
```

### Production (Render)

```
┌─────────────────────────────────────────────┐
│              Render Platform                 │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │     PostgreSQL Database Service         │ │
│  │     (Managed Database)                  │ │
│  └─────────────┬──────────────────────────┘ │
│                │ Internal Network            │
│  ┌─────────────▼──────────────────────────┐ │
│  │     Backend Web Service                 │ │
│  │     - Auto scaling                      │ │
│  │     - Health checks                     │ │
│  │     - SSL/TLS                           │ │
│  └─────────────┬──────────────────────────┘ │
│                │                             │
│  ┌─────────────▼──────────────────────────┐ │
│  │     Frontend Static Site                │ │
│  │     - CDN distribution                  │ │
│  │     - SSL/TLS                           │ │
│  │     - Custom domain                     │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                   │
                   ▼
            ┌─────────────┐
            │   Users     │
            │  (Global)   │
            └─────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool & dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management
- **CSS** - Styling

### Backend
- **Node.js 18+** - Runtime
- **Express 4** - Web framework
- **Prisma 5** - ORM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **multer** - File uploads
- **qrcode** - QR code generation

### Database
- **PostgreSQL 15** - Primary database
- **Prisma Migrate** - Schema migrations
- **UUID** - Primary keys
- **JSON** - Dynamic attributes

### DevOps
- **Docker** - Local PostgreSQL
- **Docker Compose** - Container orchestration
- **Git** - Version control
- **Render** - Hosting platform

## 📊 Database Migration Path

```
BEFORE (SQLite):
┌──────────────────┐
│   dev.db file    │
│  (Single file)   │
│                  │
│  Limitations:    │
│  - No concurrent │
│  - File-based    │
│  - Dev only      │
└──────────────────┘

                ↓
          MIGRATION
      (Prisma schema update)
                ↓

AFTER (PostgreSQL):
┌──────────────────┐
│  PostgreSQL DB   │
│  (Client-Server) │
│                  │
│  Benefits:       │
│  + Concurrent    │
│  + Scalable      │
│  + Production    │
│  + Full features │
└──────────────────┘
```

## 🔄 Request Lifecycle Example

```
1. User clicks "Book Service" button
   └─▶ Frontend validates form

2. POST /api/bookings with JWT token
   └─▶ Express receives request

3. Auth Middleware
   ├─▶ Verify JWT signature
   ├─▶ Extract userId from token
   └─▶ Attach to req.user

4. Route Handler
   ├─▶ Validate booking data (Zod)
   ├─▶ Check business availability
   └─▶ Create booking with Prisma

5. Prisma Query
   ├─▶ Generate SQL query
   ├─▶ Execute on PostgreSQL
   └─▶ Return booking object

6. Response
   ├─▶ Format JSON response
   ├─▶ Return to frontend
   └─▶ Frontend redirects user

7. Side Effects (async)
   ├─▶ Send notification to business
   ├─▶ Generate QR code
   └─▶ Update availability cache
```

---

## 📝 Key Files

- `backend/prisma/schema.prisma` - Database schema definition
- `backend/src/index.js` - Express app entry point
- `backend/src/routes/*.js` - API route handlers
- `backend/src/middleware/*.js` - Auth & role middleware
- `frontend/src/App.jsx` - React app entry point
- `frontend/src/pages/*.jsx` - Page components
- `docker-compose.yml` - PostgreSQL container config
- `render.yaml` - Production deployment config

This architecture provides a scalable, maintainable, and production-ready foundation for the LocalServices platform! 🚀
