# Fix Vercel Environment Variables for Production

## 🔴 Problem
Login not working on `thindtransport.com` because `NEXTAUTH_URL` is set to wrong domain.

## ✅ Solution

### Step 1: Update Environment Variables on Vercel

1. Go to your Vercel dashboard: https://vercel.com
2. Select your project: `thind-transport-website`
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Find `NEXTAUTH_URL` variable
6. Click the **Edit** button (three dots)
7. Change the value from:
   ```
   https://thindtransport.vercel.app
   ```
   To:
   ```
   https://thindtransport.com
   ```
8. Make sure it's checked for **Production** environment
9. Click **Save**

### Step 2: Redeploy

After updating the environment variable:
1. Go to **Deployments** tab
2. Click the **three dots** on the latest deployment
3. Click **Redeploy**
4. OR just push a new commit to trigger deployment

---

## All Environment Variables for Production

Make sure these are set for **Production** environment:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=thindcarrier@gmail.com
SMTP_PASS=ctcuolcpwdzkqibm
SMTP_FROM=Thind Transport <noreply@thindtransport.com>
NEXTAUTH_URL=https://thindtransport.com
NEXTAUTH_SECRET=eCPX8pZGqJ7vR4mN2wL9sF6hK3tY5jU8aB1cD2eF3gH4
```

---

## Why This Matters

NextAuth uses `NEXTAUTH_URL` to:
- Generate callback URLs for authentication
- Validate session cookies
- Handle redirects after login

If the URL doesn't match the domain you're accessing, authentication will fail silently.

---

## After Fixing

1. Wait 2-3 minutes for redeploy to complete
2. Go to: https://thindtransport.com/driver/login
3. Try logging in again
4. Should redirect to: https://thindtransport.com/driver/application

---

## Testing

**Credentials:**
- Email: `rjkind01@gmail.com`
- Password: (your password)

**Expected Flow:**
1. Login page → Enter credentials → Click "Sign In"
2. See "Logged in successfully!" toast
3. Redirect to `/driver/application` (DOT form)
4. If application not completed, see form
5. If application completed, redirect to `/driver/dashboard`

