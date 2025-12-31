# Database Setup - Vercel Postgres

## 🎯 Proper Solution for Production

Instead of manual environment variables, we're using **Vercel Postgres** - a real database that automatically persists all driver registrations.

---

## 📋 Setup Steps

### 1. Create Vercel Postgres Database

1. Go to your Vercel Dashboard: https://vercel.com
2. Select your project: `thind-transport-website`
3. Click **Storage** tab (top menu)
4. Click **Create Database**
5. Select **Postgres**
6. Choose a name: `driver-accounts`
7. Select region: **US West** (closest to you)
8. Click **Create**

### 2. Database is Auto-Configured

Vercel automatically adds these environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

No manual configuration needed!

### 3. Initialize Database Tables

After database is created, visit this URL **once**:

```
https://thindtransport.com/api/setup-db
```

This will:
- Create `drivers` table
- Create `applications` table
- Create necessary indexes
- Migrate your existing account from local JSON

You should see:
```json
{
  "success": true,
  "message": "Database setup complete"
}
```

### 4. Redeploy (if needed)

If tables don't create automatically:
1. Go to **Deployments** → **⋮** → **Redeploy**
2. Wait 2-3 minutes
3. Try step 3 again

---

## ✅ What This Gives You

### Automatic Features:
- ✅ **New driver registrations persist** automatically
- ✅ **No manual env var updates** needed
- ✅ **Scalable** - handles unlimited drivers
- ✅ **Production-ready** database
- ✅ **Automatic backups** by Vercel
- ✅ **Fast queries** with indexes

### How It Works:
1. Driver registers at `/driver/register`
2. Account automatically saved to Postgres
3. Can login immediately at `/driver/login`
4. No manual intervention needed!

---

## 🔄 Migration from Old System

The setup script automatically migrates your existing account:
- **Email:** `rjkind01@gmail.com`
- **Name:** Ranvir Thind
- **Status:** Ready to login

All future registrations will be saved to Postgres automatically.

---

## 🧪 Testing

After setup, test the full flow:

1. **Your existing account:**
   - Go to: https://thindtransport.com/driver/login
   - Login with: `rjkind01@gmail.com`
   - Should work immediately ✅

2. **New registration:**
   - Go to: https://thindtransport.com/driver/register
   - Register a test account
   - Logout and login with new account
   - Should persist across sessions ✅

---

## 📊 Database Schema

### `drivers` table:
```sql
- id (VARCHAR, PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- password_hash (TEXT)
- first_name (VARCHAR)
- last_name (VARCHAR)
- phone (VARCHAR)
- invitation_code (VARCHAR)
- created_at (TIMESTAMP)
- application_completed (BOOLEAN)
```

### `applications` table:
```sql
- id (VARCHAR, PRIMARY KEY)
- driver_id (VARCHAR, FOREIGN KEY)
- data (JSONB)
- submitted_at (TIMESTAMP)
- pdf_path (TEXT)
```

---

## 💰 Cost

**Vercel Postgres:**
- ✅ **Free tier:** 256 MB storage, 60 hours compute/month
- ✅ More than enough for driver accounts
- ✅ Scales automatically when needed
- ✅ Pay only if you exceed free tier

For your use case (driver registrations), you'll likely stay within free tier indefinitely.

---

## 🔧 Troubleshooting

### If setup fails:

1. **Check database is created:**
   - Vercel Dashboard → Storage tab
   - Should see `driver-accounts` database

2. **Check environment variables:**
   - Settings → Environment Variables
   - Should see `POSTGRES_URL` and related vars

3. **Check logs:**
   - Deployments → Click deployment → View Function Logs
   - Look for database connection errors

### If login still doesn't work:

1. Make sure you visited `/api/setup-db` first
2. Check Vercel logs for errors
3. Try redeploying the project

---

## 🚀 Next Steps

After database is set up:

1. **Remove temporary env var** (if you added it):
   - Go to Environment Variables
   - Delete `DRIVER_ACCOUNTS` (no longer needed)

2. **Test new registrations:**
   - Try registering a new driver account
   - Should persist automatically

3. **Monitor usage:**
   - Vercel Dashboard → Storage → driver-accounts
   - See database usage and query stats

---

All code changes committed and ready for Postgres! Just create the database in Vercel and run the setup endpoint. 🎉

