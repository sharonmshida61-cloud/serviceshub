# PostgreSQL Migration Checklist

## ✅ Completed (No Action Required)

- [x] Updated Prisma schema to use PostgreSQL
- [x] Updated package.json scripts for proper migrations
- [x] Created Docker Compose configuration
- [x] Created setup scripts (Windows & Unix)
- [x] Updated README.md with PostgreSQL instructions
- [x] Created comprehensive migration guide
- [x] Created quick reference documentation
- [x] Created render.yaml for production deployment
- [x] Verified .env.example has PostgreSQL configuration
- [x] Verified .gitignore excludes SQLite files

## 📋 Next Steps (Action Required)

### Local Development Setup

- [ ] **Install PostgreSQL** (choose one):
  - [ ] Option A: Install Docker Desktop
  - [ ] Option B: Install PostgreSQL locally from postgresql.org
  - [ ] Option C: Already have PostgreSQL running

- [ ] **Start PostgreSQL**:
  ```bash
  # With Docker (recommended):
  docker-compose up -d
  
  # OR with local PostgreSQL:
  # Ensure PostgreSQL service is running
  # Windows: Check Services app
  # Mac: brew services start postgresql
  # Linux: sudo systemctl start postgresql
  ```

- [ ] **Verify PostgreSQL is Running**:
  ```bash
  # With Docker:
  docker ps | grep postgres
  
  # With local PostgreSQL:
  psql -U postgres -h localhost -c "SELECT version();"
  ```

- [ ] **Create Database** (if using local PostgreSQL):
  ```bash
  createdb localservices
  # OR
  psql -U postgres -c "CREATE DATABASE localservices;"
  ```

- [ ] **Update .env file** (if needed):
  ```bash
  cd backend
  # Edit .env file and verify DATABASE_URL is correct:
  # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/localservices"
  ```

- [ ] **Install Backend Dependencies**:
  ```bash
  cd backend
  npm install
  ```

- [ ] **Run Database Migration**:
  ```bash
  cd backend
  npx prisma migrate dev --name init
  ```

- [ ] **Generate Prisma Client**:
  ```bash
  npx prisma generate
  ```

- [ ] **Seed Database**:
  ```bash
  npm run seed
  ```

- [ ] **Start Backend Server**:
  ```bash
  npm run dev
  # Should start on http://localhost:4000
  ```

- [ ] **Verify Backend Works**:
  ```bash
  # Test in browser or with curl:
  curl http://localhost:4000/health
  # Should return: {"status": "ok"}
  ```

- [ ] **Open Prisma Studio** (optional but recommended):
  ```bash
  npm run prisma:studio
  # Opens at http://localhost:5555
  # Verify you can see all tables with data
  ```

- [ ] **Start Frontend** (in a new terminal):
  ```bash
  cd frontend
  npm install
  npm run dev
  # Should start on http://localhost:5173
  ```

- [ ] **Test Application**:
  - [ ] Can load frontend in browser
  - [ ] Can login with seed accounts
  - [ ] Can browse businesses
  - [ ] Can create bookings
  - [ ] Can view admin dashboard (as admin user)

### Production Deployment

- [ ] **Choose Hosting Provider**:
  - [ ] Render (easiest - use render.yaml)
  - [ ] Railway
  - [ ] Heroku
  - [ ] Supabase
  - [ ] AWS/GCP/Azure
  - [ ] Other

- [ ] **Set Up Managed PostgreSQL**:
  - [ ] Create PostgreSQL database instance
  - [ ] Note connection string
  - [ ] Enable SSL if available
  - [ ] Configure backups

- [ ] **Deploy Backend**:
  - [ ] Set DATABASE_URL environment variable
  - [ ] Set JWT_SECRET environment variable
  - [ ] Set CORS_ORIGIN environment variable
  - [ ] Deploy code
  - [ ] Run migrations (usually automatic)
  - [ ] Verify health check endpoint

- [ ] **Deploy Frontend**:
  - [ ] Set VITE_API_URL environment variable
  - [ ] Build and deploy
  - [ ] Verify it loads

- [ ] **Post-Deployment**:
  - [ ] Test all major features
  - [ ] Set up monitoring
  - [ ] Configure automated backups
  - [ ] Set up SSL certificates
  - [ ] Configure domain names

### Data Migration (If Migrating Existing Data)

- [ ] **Export SQLite Data** (if you have existing data):
  ```bash
  # Create backup script to export data
  # Use Prisma Client to read all data
  # Save as JSON
  ```

- [ ] **Import to PostgreSQL**:
  ```bash
  # Create import script
  # Use Prisma Client to write data
  ```

## 🎯 Quick Commands Reference

### Check if PostgreSQL is Running
```bash
# Docker:
docker ps | grep postgres

# Local:
psql -U postgres -h localhost -c "SELECT 1;"
```

### View Database
```bash
cd backend
npm run prisma:studio
```

### Reset Everything (Development Only!)
```bash
cd backend
npm run prisma:reset
npm run seed
```

### View Logs
```bash
# Docker:
docker-compose logs -f postgres

# Backend:
cd backend
npm run dev
```

## 🚨 Common Issues & Solutions

### Issue: "Can't reach database server"
**Solution**: Start PostgreSQL
```bash
docker-compose up -d
# OR ensure local PostgreSQL is running
```

### Issue: "Database does not exist"
**Solution**: Create database
```bash
# Docker: Already created automatically
# Local: createdb localservices
```

### Issue: "Password authentication failed"
**Solution**: Check DATABASE_URL in .env matches your PostgreSQL credentials

### Issue: Migration fails
**Solution**: Reset and try again
```bash
cd backend
npm run prisma:reset
npx prisma migrate dev --name init
npm run seed
```

### Issue: Port 5432 already in use
**Solution**: Stop other PostgreSQL instance or change port
```bash
# Stop local PostgreSQL:
# Windows: services.msc -> PostgreSQL -> Stop
# Mac: brew services stop postgresql
# Linux: sudo systemctl stop postgresql
```

## 📚 Documentation Files

Quick links to all documentation:

1. **MIGRATION_COMPLETE.md** - Start here! Quick setup guide
2. **POSTGRESQL_MIGRATION_GUIDE.md** - Detailed migration instructions
3. **POSTGRES_QUICKREF.md** - Command reference
4. **CHANGES_SUMMARY.md** - What changed in this migration
5. **README.md** - Updated project README

## ✅ Verification Commands

Run these to verify everything is working:

```bash
# 1. Database connection
cd backend
npx prisma db pull

# 2. View data
npm run prisma:studio

# 3. Backend API
curl http://localhost:4000/health

# 4. Get categories
curl http://localhost:4000/api/categories

# 5. Check for errors in logs
# Look at terminal where backend is running
```

## 🎉 Success Criteria

You know the migration is successful when:

- ✅ Backend starts without errors
- ✅ Prisma Studio shows all tables with data
- ✅ Can login to the application
- ✅ Can browse and search businesses
- ✅ Can create and view bookings
- ✅ All API endpoints return expected data

## 🆘 Need Help?

1. Check **POSTGRES_QUICKREF.md** for common commands
2. Check **POSTGRESQL_MIGRATION_GUIDE.md** for detailed troubleshooting
3. Review logs: `docker-compose logs -f` or backend terminal
4. Verify .env file has correct DATABASE_URL
5. Try resetting database: `npm run prisma:reset`

---

**Current Status**: Migration code complete ✅
**Next Step**: Start PostgreSQL and run migrations (see checklist above)
**Estimated Time**: 5-10 minutes for initial setup
