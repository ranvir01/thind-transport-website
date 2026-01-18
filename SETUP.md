# Thind Transport Driver Onboarding System - Setup Guide

## Overview

This system provides a complete multi-stage driver onboarding process:

1. **Initial Contact Form** - Quick pre-check for new drivers (on `/apply`)
2. **Meeting Scheduler** - Book meetings with the owner (on `/schedule-meeting`)
3. **Driver Account Creation** - Secure registration system (on `/driver/register`)
4. **DOT Application Form** - Full 6-step DOT-compliant application (on `/driver/application`)
5. **PDF Generation** - Auto-generates filled DOT application PDF
6. **Email Delivery** - Sends completed application to thindcarrier@gmail.com
7. **Driver Dashboard** - Portal for drivers to track application status

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Email Configuration (required for all forms to work)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM="Thind Transport <noreply@thindtransport.com>"

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-this-with-openssl-rand-base64-32
```

### 3. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output and paste it as `NEXTAUTH_SECRET` in `.env.local`.

### 4. Gmail App Password Setup

**Important:** Do NOT use your regular Gmail password. Use an App Password:

1. Go to [Google Account → Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows Computer" (or other)
5. Copy the generated 16-character password
6. Use this as `SMTP_PASS` in `.env.local`

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Invitation Code System

Drivers need an invitation code to register. The system accepts codes that start with `THIND-` and are longer than 8 characters.

**Example valid codes:**
- `THIND-2025-001`
- `THIND-RECRUIT-JAN`
- `THIND-OO-WINTER`

You can customize this logic in `src/lib/driver-db.ts` → `verifyInvitationCode()`.

## System Flow

### For New Driver Inquiries

1. **Driver visits website** → Goes to `/apply`
2. **Fills contact form** → Email sent to thindcarrier@gmail.com
3. **Recruiter reviews** → Decides to proceed
4. **Send invitation** → Email driver with:
   - Invitation code (e.g., `THIND-2025-001`)
   - Link to meeting scheduler: `https://yoursite.com/schedule-meeting`

### Meeting Scheduling

1. **Driver schedules meeting** → `/schedule-meeting`
2. **System emails both parties** → Confirmation sent
3. **After meeting** → Send driver registration link

### Driver Registration & Application

1. **Driver registers** → `/driver/register` with invitation code
2. **Auto-redirected to login** → `/driver/login`
3. **Must complete DOT form** → `/driver/application` (6 steps)
4. **PDF generated & emailed** → Sent to thindcarrier@gmail.com
5. **Driver sees dashboard** → `/driver/dashboard`

## File Storage

### Driver Accounts
Stored in: `data/drivers.json`

### Applications
Stored in: `data/applications.json`

### Generated PDFs
Stored in: `uploads/applications/[LastName]_[FirstName]_[ID].pdf`

**For Production:** Replace JSON storage with a real database (PostgreSQL, MongoDB, etc.).

## Email Templates

All forms send professional HTML emails to `thindcarrier@gmail.com`:

1. **Contact Form** → Initial inquiry
2. **Meeting Request** → Scheduling details
3. **DOT Application** → Full application with PDF attachment

## Security Features

- Password hashing with bcrypt
- JWT sessions via NextAuth
- Protected routes with middleware
- Invitation code validation
- Form validation (client + server)

## Customization

### Change Email Recipient

Search for `thindcarrier@gmail.com` and replace with your email:
- `src/app/api/driver/submit-application/route.ts`
- `src/app/actions/submit-application.ts`
- `src/app/api/schedule-meeting/route.ts`
- `src/lib/email-service.ts`

### Modify Invitation Code Logic

Edit `src/lib/driver-db.ts` → `verifyInvitationCode()` function.

### Customize PDF Layout

Edit `src/lib/pdf-generator.ts` → `generateDriverApplicationPDF()` function.

## Troubleshooting

### Emails Not Sending

1. Check `.env.local` has correct SMTP credentials
2. Verify Gmail App Password (not regular password)
3. Check console for error messages
4. Test SMTP connection: `node -e "require('./test-smtp.js')"`

### Driver Can't Register

1. Verify invitation code format (`THIND-*`)
2. Check console for validation errors
3. Ensure password is 8+ characters

### PDF Not Generated

1. Check `uploads/applications/` directory exists
2. Verify file permissions
3. Check console for PDF generation errors

### Session Issues

1. Regenerate `NEXTAUTH_SECRET`
2. Clear browser cookies
3. Restart dev server

## Production Deployment

### Environment Variables

Set these on your hosting platform (Vercel, Netlify, etc.):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-production-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Thind Transport <noreply@thindtransport.com>"
NEXTAUTH_URL=https://thindtransport.com
NEXTAUTH_SECRET=your-production-secret
```

### Database Migration

Replace JSON file storage with a database:

1. Set up PostgreSQL/MongoDB
2. Update `src/lib/driver-db.ts` with database calls
3. Create tables/collections for drivers and applications
4. Migrate file uploads to cloud storage (AWS S3, Cloudinary)

### Security Checklist

- [ ] Use strong `NEXTAUTH_SECRET` in production
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up proper CORS policies
- [ ] Implement rate limiting for forms
- [ ] Regular security audits
- [ ] Backup driver data regularly

## Support

For issues, check:
- Console logs (browser + server)
- Network tab (for API errors)
- `data/` directory (for stored data)
- `uploads/` directory (for PDFs)

## Key Files Reference

- **Forms**: `src/components/driver-application/*Step.tsx`
- **PDF Generator**: `src/lib/pdf-generator.ts`
- **Email Service**: `src/lib/email-service.ts`
- **Auth**: `src/app/api/auth/[...nextauth]/route.ts`
- **Database**: `src/lib/driver-db.ts`
- **Middleware**: `src/middleware.ts`

---

Built for Thind Transport LLC - USDOT #2523064 | MC #876103

