# Driver Onboarding System - Complete Guide

## 🎯 System Overview

Your website now has a comprehensive 3-stage driver onboarding system that matches your PDF DOT application form exactly.

## 📋 Three Stages

### Stage 1: Initial Contact (Existing "Apply Now" Form)
- **Location**: `/apply` page
- **Purpose**: Pre-check and first contact for new drivers
- **What it does**:
  - Collects basic info (name, email, phone, CDL, experience)
  - Sends email to `thindcarrier@gmail.com`
  - **NOW FIXED**: Email functionality working properly
  
### Stage 2: Meeting Scheduler  
- **Location**: `/schedule-meeting`
- **Purpose**: Book a call with the owner
- **What it does**:
  - Driver selects preferred date/time
  - Chooses phone or video call
  - Sends confirmation to both driver and owner
  - Required before full DOT application

### Stage 3: Full DOT Application Form
- **Location**: `/driver/application` (password-protected)
- **Access**: Requires driver account login
- **What it does**:
  - 6-step comprehensive DOT application
  - Matches your uploaded PDF exactly
  - Generates filled PDF automatically
  - Emails completed PDF to `thindcarrier@gmail.com`

## 🔐 Driver Account System

### Registration
- **URL**: `/driver/register`
- **Requires**: Invitation code (format: `THIND-*`)
- **Creates**: Secure account with password

### Login
- **URL**: `/driver/login`
- **Access**: After registration
- **Redirects**: To application form (if not completed) or dashboard

### Dashboard
- **URL**: `/driver/dashboard`
- **Shows**: Application status, profile, support info

## 📄 The 6-Step DOT Application

Matches your PDF form EXACTLY:

### Step 1: Personal Information
- Full name, DOB, SSN, age
- Contact details
- Physical exam expiration
- Current address (past 3 years)
- Education level

### Step 2: Employment History
- Past 3 years (DOT required)
- Employer details
- FMCSR compliance
- Safety-sensitive functions

### Step 3: Driving Record & CDL
- CDL number, state, class, endorsements
- License history (denied/suspended)
- Felony convictions
- Accidents & violations (past 3 years)

### Step 4: Experience & Qualifications
- Tractor-trailer experience
- Equipment types
- States operated
- Special training & awards

### Step 5: PSP Authorization
- FMCSA disclosure acknowledgment
- Background check authorization
- Digital signature

### Step 6: Review & Submit
- Review all information
- Final certification
- Submit → PDF generated → Email sent

## 📧 Email Flow

All emails go to: **thindcarrier@gmail.com**

### Email #1: Initial Contact
- From: "Apply Now" form
- Contains: Basic driver info
- Action: Review and decide to proceed

### Email #2: Meeting Request
- From: Meeting scheduler
- Contains: Preferred date/time, contact info
- Action: Confirm meeting, send calendar invite

### Email #3: Full DOT Application
- From: Application submission
- Contains: **PDF attachment** with complete DOT form
- Action: Review for compliance, proceed to onboarding

## 🚀 How to Use the System

### For You (Owner/Recruiter):

1. **Driver contacts via "Apply Now"**
   - You receive email #1
   - Review their basic info
   
2. **If interested, send them to meeting scheduler**
   - Give them link: `https://yoursite.com/schedule-meeting`
   - They book a time
   - You receive email #2
   
3. **After meeting, send invitation code**
   - Email driver with:
     - Invitation code (e.g., `THIND-2025-JAN-001`)
     - Registration link: `https://yoursite.com/driver/register`
   
4. **Driver completes full DOT form**
   - They register → log in → fill 6-step form
   - You receive email #3 with PDF attachment
   - PDF is ready to submit to branches

### For Drivers:

1. Visit website → Fill "Apply Now" form
2. Receive email → Click meeting scheduler link
3. Book meeting with owner
4. After meeting → Receive invitation code
5. Register account → Log in
6. Complete DOT application (6 steps)
7. Submit → Done!

## 🔧 Setup Required

### 1. Environment Variables

Create `.env.local` file with:

```env
# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM="Thind Transport <noreply@thindtransport.com>"

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

### 2. Gmail App Password

**IMPORTANT**: Don't use your regular Gmail password!

1. Go to: https://myaccount.google.com/apppasswords
2. Generate new app password
3. Use that as `SMTP_PASS`

### 3. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy output → paste as `NEXTAUTH_SECRET`

## 📂 Where Files Are Stored

- **Driver Accounts**: `data/drivers.json`
- **Applications**: `data/applications.json`
- **Generated PDFs**: `uploads/applications/[LastName]_[FirstName]_[ID].pdf`

## 🎫 Invitation Codes

Current system accepts codes starting with `THIND-` (8+ characters).

**Valid examples:**
- `THIND-2025-001`
- `THIND-JAN-RECRUIT`
- `THIND-OO-WINTER25`

**To customize**: Edit `src/lib/driver-db.ts` → `verifyInvitationCode()`

## 🔒 Security Features

- Passwords hashed with bcrypt
- JWT-based sessions
- Protected routes (can't access application without login)
- Form validation (client + server side)
- Invitation code verification

## ✅ What's Been Fixed

1. ✅ Contact form email sending (was broken, now fixed)
2. ✅ Changed from Gmail-specific to generic SMTP
3. ✅ All emails route to `thindcarrier@gmail.com`
4. ✅ PDF generator matches your uploaded DOT form
5. ✅ Driver account system with authentication
6. ✅ Meeting scheduler integrated
7. ✅ Dashboard for drivers to see status

## 🧪 Testing the Complete Flow

### Test as a New Driver:

1. **Apply**: Go to `/apply` → Fill form → Check email received
2. **Schedule**: Go to `/schedule-meeting` → Book time → Check email
3. **Register**: Go to `/driver/register` → Use code `THIND-TEST-123` → Create account
4. **Login**: Go to `/driver/login` → Enter credentials
5. **Apply**: Complete all 6 steps → Submit
6. **Verify**: Check `thindcarrier@gmail.com` for PDF attachment
7. **Check PDF**: Open PDF, verify all fields are filled correctly

### Verify Each Email:

- ✉️ Email #1: Basic contact info
- ✉️ Email #2: Meeting details
- ✉️ Email #3: PDF attachment with full DOT form

## 🎨 Pages Created/Modified

### New Pages:
- `/driver/register` - Account creation
- `/driver/login` - Sign in
- `/driver/application` - 6-step DOT form
- `/driver/dashboard` - Driver portal
- `/schedule-meeting` - Meeting booking

### Modified Pages:
- `/apply` - Fixed email functionality

### New Components:
- `PersonalInfoStep.tsx`
- `EmploymentHistoryStep.tsx`
- `DrivingRecordStep.tsx`
- `ExperienceStep.tsx`
- `AuthorizationStep.tsx`
- `ReviewStep.tsx`

### New Services:
- `pdf-generator.ts` - Creates DOT PDF
- `email-service.ts` - Sends emails
- `driver-db.ts` - Stores driver data
- `auth.ts` - Authentication helpers

## 📞 Support Info on Website

All pages show:
- **Email**: thindcarrier@gmail.com
- **Phone**: (206) 765-6300
- **USDOT**: 2523064
- **MC**: 876103

## 🚨 Troubleshooting

### Emails not sending?
- Check `.env.local` has correct SMTP settings
- Verify Gmail App Password (not regular password)
- Check console for errors

### Can't register?
- Use invitation code starting with `THIND-`
- Password must be 8+ characters

### PDF not attached?
- Check `uploads/applications/` folder exists
- Verify write permissions

### Session errors?
- Clear browser cookies
- Regenerate `NEXTAUTH_SECRET`
- Restart dev server

## 🎯 Next Steps (Optional Enhancements)

1. **Database**: Replace JSON files with PostgreSQL/MongoDB
2. **Cloud Storage**: Move PDFs to AWS S3 or Cloudinary
3. **SMS Notifications**: Add Twilio integration
4. **Calendar Integration**: Connect to Google Calendar
5. **Payment Processing**: Add lease purchase terms
6. **Document Upload**: Allow drivers to upload CDL/medical card
7. **Admin Dashboard**: Build interface to manage all applications

## 📖 Full Documentation

See `SETUP.md` for detailed technical documentation.

---

**System Status**: ✅ Fully Operational

**All emails route to**: thindcarrier@gmail.com

**Test invitation code**: THIND-TEST-123 (or any code starting with "THIND-")

Built for: Thind Transport LLC | USDOT #2523064 | MC #876103

