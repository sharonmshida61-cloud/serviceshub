# 🚂 Railway Deployment - SUPER SIMPLE!

## Why Railway?
- ✅ $5 free credit every month (enough for small projects)
- ✅ One-click PostgreSQL setup
- ✅ Automatic HTTPS
- ✅ No complex configuration files
- ✅ Way simpler than Render!

---

## 🚀 Deploy Backend + Database to Railway (5 minutes)

### Step 1: Sign Up
1. Go to: **https://railway.app**
2. Click **"Start a New Project"**
3. Sign in with **GitHub** (easiest)

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **`serviceshub`**
4. Railway will detect it's a monorepo

### Step 3: Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Done! Database is created instantly

### Step 4: Deploy Backend
1. Click **"+ New"** → **"GitHub Repo"**
2. Select your `serviceshub` repo
3. Railway will ask which service - type: **`backend`**
4. Configure:
   ```
   Root Directory: backend
   Start Command: npm start
   Build Command: npm install && npx prisma generate
   ```

### Step 5: Add Environment Variables
Railway will auto-detect some, but add these:

Click on your backend service → **Variables** tab:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-random-secret-here
PORT=4000
```

**Important:** Railway automatically links your PostgreSQL!
- Just type `${{Postgres.DATABASE_URL}}` and it auto-connects

### Step 6: Deploy!
- Railway automatically deploys
- Wait 5 minutes
- Your backend is live! 🎉

### Step 7: Seed Database
1. In Railway, click your backend service
2. Click **"Settings"** → **"Deploy Triggers"**
3. Or use Railway CLI:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run seed
railway run npm run seed
```

**Or use the Railway web terminal:**
1. Click your backend service
2. Look for the terminal/console option
3. Run: `npm run seed`

---

## 🌐 Deploy Frontend to Vercel (2 minutes)

### Step 1: Sign Up
1. Go to: **https://vercel.com**
2. Click **"Sign Up"** with GitHub

### Step 2: Import Project
1. Click **"Add New"** → **"Project"**
2. Import your `serviceshub` repository
3. Vercel detects it's a monorepo

### Step 3: Configure Frontend
```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

### Step 4: Add Environment Variable
Click **"Environment Variables"** and add:

```env
VITE_API_URL=https://your-railway-backend-url.railway.app/api
```

**Get your Railway backend URL:**
- Go to Railway dashboard
- Click your backend service
- Copy the URL shown (looks like: `https://serviceshub-production.up.railway.app`)

### Step 5: Deploy!
- Click **"Deploy"**
- Wait 2-3 minutes
- Your frontend is live! 🎉

---

## 📝 Summary URLs

After deployment:
- **Frontend (Vercel):** `https://serviceshub.vercel.app`
- **Backend (Railway):** `https://serviceshub-production.up.railway.app`
- **Database:** Auto-managed by Railway

---

## 💰 Costs

**FREE TIER:**
- Vercel: Unlimited (free forever for personal projects)
- Railway: $5 credit/month (plenty for small project)

**When you run out of Railway credit:**
- Add $5/month to keep it running
- Or upgrade to $5/month hobby plan

---

## ✅ Why This is Better Than Render

| Feature | Railway + Vercel | Render |
|---------|------------------|--------|
| Setup Time | 5 minutes | 20+ minutes |
| Configuration | Simple UI | Complex YAML |
| Free Tier | $5 credit/month | Very limited |
| Speed | Fast | Slow cold starts |
| Database Setup | 1 click | Complex |
| Documentation | Clear | Confusing |

---

## 🆘 Troubleshooting

**Backend won't start:**
- Check Environment Variables are set
- Make sure DATABASE_URL is connected: `${{Postgres.DATABASE_URL}}`

**Frontend can't reach backend:**
- Check VITE_API_URL is correct
- Make sure Railway backend URL includes `/api`

**Database connection error:**
- Railway auto-connects PostgreSQL
- Just use `${{Postgres.DATABASE_URL}}` variable

---

**Railway is WAY simpler than Render! Give it a try! 🚂**
