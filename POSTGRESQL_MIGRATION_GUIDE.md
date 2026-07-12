# PostgreSQL Migration Guide

This guide explains how to migrate from SQLite to PostgreSQL for the LocalServices platform.

## Changes Made

✅ **Schema Updated**: `prisma/schema.prisma` now uses PostgreSQL provider
✅ **Environment Variables**: `.env` and `.env.example` configured for PostgreSQL

## Prerequisites

1. **Install PostgreSQL** (if not already installed):
   - Windows: Download from https://www.postgresql.org/download/windows/
   - Or use Docker: `docker run --name localservices-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=localservices -p 5432:5432 -d postgres:15`

2. **Verify PostgreSQL is running**:
   ```bash
   psql -U postgres -h localhost
   ```

## Migration Steps

### Option 1: Fresh PostgreSQL Database (Recommended)

1. **Ensure PostgreSQL is running** on `localhost:5432`

2. **Create the database** (if not exists):
   ```bash
   psql -U postgres -h localhost -c "CREATE DATABASE localservices;"
   ```

3. **Update your .env file** with your PostgreSQL credentials:
   ```
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/localservices"
   ```

4. **Run Prisma migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name convert_to_postgresql
   ```

5. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

6. **Seed the database** (optional):
   ```bash
   npm run seed
   ```

### Option 2: Using Docker (Easiest for Development)

1. **Start PostgreSQL with Docker**:
   ```bash
   docker run --name localservices-postgres ^
     -e POSTGRES_USER=postgres ^
     -e POSTGRES_PASSWORD=postgres ^
     -e POSTGRES_DB=localservices ^
     -p 5432:5432 ^
     -d postgres:15
   ```

2. **Verify connection**:
   ```bash
   docker exec -it localservices-postgres psql -U postgres -d localservices
   ```

3. **Run migration** (from backend directory):
   ```bash
   npx prisma migrate dev --name convert_to_postgresql
   npx prisma generate
   npm run seed
   ```

### Option 3: Migrate Existing SQLite Data

If you need to preserve existing SQLite data:

1. **Export data from SQLite**:
   ```bash
   cd backend
   node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const users = await prisma.user.findMany(); console.log(JSON.stringify(users, null, 2)); } main();"
   ```

2. **Switch to PostgreSQL** (follow Option 1 or 2)

3. **Import data** using custom seed scripts or manual data migration

## Database Connection Strings

### Local Development
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/localservices"
```

### Production (Example formats)

**Heroku Postgres**:
```
DATABASE_URL="postgresql://user:password@host.compute.amazonaws.com:5432/dbname"
```

**Railway**:
```
DATABASE_URL="postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway"
```

**Render**:
```
DATABASE_URL="postgresql://user:password@oregon-postgres.render.com:5432/dbname"
```

**Supabase**:
```
DATABASE_URL="postgresql://postgres:password@db.projectref.supabase.co:5432/postgres?pgbouncer=true"
```

## Key Differences: SQLite vs PostgreSQL

### Data Types
- SQLite `TEXT` → PostgreSQL `TEXT` ✅ (no change)
- SQLite `INTEGER` → PostgreSQL `INTEGER` ✅ (no change)
- SQLite `REAL` → PostgreSQL `DOUBLE PRECISION` ✅ (handled by Prisma)

### Features Now Available in PostgreSQL
1. **Full-text search**: Better search capabilities
2. **JSON operations**: More powerful JSON queries
3. **Better concurrency**: Multiple simultaneous connections
4. **Better performance**: For production workloads
5. **Native UUID**: Better UUID support
6. **Transactions**: More robust transaction support

## Verification

After migration, verify everything works:

```bash
# Check database connection
npx prisma db pull

# View database in Prisma Studio
npx prisma studio

# Run the application
npm run dev
```

## Troubleshooting

### Cannot connect to database
- Ensure PostgreSQL is running: `psql -U postgres -h localhost`
- Check firewall settings on port 5432
- Verify DATABASE_URL in .env file

### Migration fails
- Drop and recreate database: `dropdb localservices && createdb localservices`
- Then run migration again

### Permission denied
- Ensure PostgreSQL user has proper permissions:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE localservices TO postgres;
  ```

## Rollback to SQLite (if needed)

If you need to revert:

1. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. Run:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

## Next Steps

- ✅ Migration complete
- [ ] Test all API endpoints
- [ ] Update deployment configuration (Render, Railway, etc.)
- [ ] Configure connection pooling for production
- [ ] Set up database backups
- [ ] Monitor query performance

## Production Deployment

When deploying to production:

1. **Use connection pooling** (PgBouncer recommended)
2. **Enable SSL**: Add `?sslmode=require` to DATABASE_URL
3. **Set connection limits**: Configure in Prisma schema
4. **Enable logging**: Monitor slow queries
5. **Regular backups**: Automated PostgreSQL backups

Example production connection:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=5&pool_timeout=10"
```

---

**Migration Status**: ✅ Schema converted to PostgreSQL
**Next**: Start PostgreSQL and run migration commands above
