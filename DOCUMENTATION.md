# Thind Transport Website - Project Documentation

## Overview

Thind Transport is a professional trucking company website with a comprehensive driver onboarding system. The platform allows prospective drivers to apply, create accounts, and complete DOT-compliant application forms that generate PDFs for submission.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe JavaScript |
| **NextAuth v5 (Auth.js)** | Authentication system |
| **Vercel Postgres** | Production database |
| **bcrypt** | Password hashing |
| **Tailwind CSS** | Styling framework |
| **Shadcn UI** | Component library |
| **pdf-lib** | PDF generation |
| **Nodemailer** | Email sending |

---

## Project Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── driver/        # Driver-related APIs
│   │   └── debug-*/       # Debug endpoints (remove in production)
│   ├── driver/            # Driver portal pages
│   │   ├── login/         # Login page
│   │   ├── register/      # Registration page
│   │   └── application/   # Multi-step application form
│   └── (public pages)     # Marketing pages
├── components/            # React components
│   ├── driver-application/ # Application form steps
│   ├── ui/                # Shadcn UI components
│   └── layout/            # Layout components
├── lib/                   # Utility functions
│   ├── driver-db.ts       # Database abstraction layer
│   ├── driver-db-postgres.ts # Postgres implementation
│   └── constants.ts       # Company info & rates
└── middleware.ts          # Route protection
```

---

## Authentication System

### How It Works

1. **Registration** (`/driver/register`)
   - User provides email, password, invitation code (THIND-2026)
   - Password hashed with bcrypt (10 rounds)
   - Account stored in Vercel Postgres

2. **Login** (`/driver/login`)
   - NextAuth v5 credentials provider
   - JWT-based sessions (30-day expiry)
   - Cookie name: `__Secure-authjs.session-token` (production)

3. **Route Protection** (`middleware.ts`)
   - Uses `getToken()` from `next-auth/jwt`
   - Protects `/driver/application` and `/driver/dashboard`
   - Redirects unauthenticated users to login

### Key Authentication Files

| File | Purpose |
|------|---------|
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth configuration |
| `src/middleware.ts` | Route protection middleware |
| `src/lib/driver-db-postgres.ts` | Database operations |

### Critical Configuration (NextAuth v5)

```typescript
// Cookie name changed from v4 to v5!
// v4: next-auth.session-token
// v5: authjs.session-token

// Middleware must use correct cookie name:
const token = await getToken({
  req: request,
  secret: process.env.NEXTAUTH_SECRET,
  cookieName: '__Secure-authjs.session-token', // Production
});
```

---

## Database Schema

### Drivers Table

```sql
CREATE TABLE drivers (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  invitation_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  application_completed BOOLEAN DEFAULT FALSE
);
```

### Applications Table

```sql
CREATE TABLE applications (
  id VARCHAR(255) PRIMARY KEY,
  driver_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pdf_path TEXT,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);
```

---

## Environment Variables

### Required for Production (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Production domain | `https://thindtransport.com` |
| `NEXTAUTH_SECRET` | Random secret for JWT | `your-random-secret-here` |
| `POSTGRES_URL` | Vercel Postgres connection | (auto-set by Vercel) |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | `thindcarrier@gmail.com` |
| `SMTP_PASS` | Email password/app key | (Google App Password) |

---

## Driver Onboarding Workflow

```
1. Apply Now Form → Quick contact info submission
         ↓
2. Meeting Scheduled → Recruiter contacts driver
         ↓
3. Invitation Code Sent → THIND-2026 (or custom)
         ↓
4. Create Account → /driver/register
         ↓
5. Login → /driver/login
         ↓
6. Complete DOT Application → 7-step form
         ↓
7. PDF Generated → Sent to thindcarrier@gmail.com
         ↓
8. Driver Portal Access → View status, documents
```

---

## Debugging History & Solutions

### Issue 1: Login works locally but not on production
**Root Cause:** Multiple issues compounding:
1. Postgres returning `first_name` (snake_case) instead of `firstName` (camelCase)
2. NextAuth v5 uses `authjs` cookie name, not `next-auth`

**Solution:**
```typescript
// Handle snake_case from Postgres
const firstName = driver.firstName || (driver as any).first_name || '';
const lastName = driver.lastName || (driver as any).last_name || '';

// Use correct cookie name in middleware
cookieName: '__Secure-authjs.session-token'
```

### Issue 2: Session cookie not being set
**Root Cause:** Custom cookie configuration conflicting with NextAuth defaults

**Solution:** Remove custom cookie config, use `trustHost: true` only

### Issue 3: File-based storage not working on Vercel
**Root Cause:** Vercel has read-only filesystem

**Solution:** Migrated to Vercel Postgres for persistent storage

---

## Key Patterns & Conventions

### Database Column Naming
- Postgres uses snake_case: `first_name`, `password_hash`
- TypeScript uses camelCase: `firstName`, `passwordHash`
- Always handle both in database queries

### Form Validation
- Client-side: Zod schemas with React Hook Form
- Server-side: Validate in API routes before database operations

### Error Handling
- Always provide user-friendly error messages
- Log detailed errors server-side for debugging
- Use toast notifications for feedback

---

## Deployment

### Vercel Deployment Checklist

1. ✅ Set all environment variables in Vercel dashboard
2. ✅ Ensure `NEXTAUTH_URL` matches production domain
3. ✅ Connect Vercel Postgres database
4. ✅ Run `/api/setup-db` once to create tables
5. ✅ Test login flow in incognito window

### Git Workflow

```bash
# Development
npm run dev

# Deploy to production
git add -A
git commit -m "Description of changes"
git push origin main
# Vercel auto-deploys from main branch
```

---

## Resume-Friendly Project Description

> **Full-Stack Driver Onboarding Platform**
> 
> Built a comprehensive trucking company website with Next.js 15, featuring a multi-step driver application system. Implemented secure authentication using NextAuth v5 with JWT sessions, PostgreSQL database integration, and automated PDF generation for DOT-compliant forms.
> 
> **Key Achievements:**
> - Designed and implemented a 7-step application form with real-time validation
> - Integrated Vercel Postgres for production-ready data persistence
> - Solved complex authentication issues involving cookie naming conventions between NextAuth v4 and v5
> - Built email notification system for application submissions
> - Created protected routes with middleware-based authentication
> 
> **Technologies:** Next.js 15, TypeScript, NextAuth v5, PostgreSQL, Tailwind CSS, Vercel

---

## Contact & Support

- **Company Email:** thindcarrier@gmail.com
- **Phone:** (206) 765-6300
- **Website:** https://thindtransport.com

---

*Last Updated: January 2026*

