# Gmail App Password Setup Instructions

## Why You Need This
Your website contact form needs to send emails through Gmail. For security, Gmail no longer accepts regular passwords from applications. You need to create an "App Password."

## Step-by-Step Instructions

### 1. Enable 2-Factor Authentication (Required First)
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Under "Signing in to Google," click "2-Step Verification"
4. Follow the prompts to set up 2FA (usually via phone)

### 2. Generate App Password
1. After 2FA is enabled, return to https://myaccount.google.com/security
2. Scroll down to "2-Step Verification" section
3. At the bottom, click "App passwords"
4. You may need to sign in again
5. Select app: "Mail"
6. Select device: "Other (Custom name)"
7. Enter name: "Thind Website"
8. Click "Generate"
9. Google will show you a 16-character password like: `abcd efgh ijkl mnop`

### 3. Add to Your Website
1. Open your project in Cursor
2. Find the file `.env.local` (if it doesn't exist, create it)
3. Add these lines:

```
EMAIL_USER=thindcarrier@gmail.com
EMAIL_PASS=abcdefghijklmnop
OWNER_EMAIL=thindcarrier@gmail.com
```

**IMPORTANT:** Remove the spaces from the app password! Copy: `abcd efgh ijkl mnop` → Paste as: `abcdefghijklmnop`

### 4. Restart Your Development Server
```bash
# Stop the server (Ctrl+C in terminal)
# Start it again
npm run dev
```

### 5. Test the Contact Form
1. Go to http://localhost:3000/apply
2. Fill out the form
3. Click submit
4. Check `thindcarrier@gmail.com` for the email

## Troubleshooting

### "Invalid login" error
- Make sure 2FA is enabled first
- The app password should be 16 characters with no spaces
- Don't use your regular Gmail password

### "Less secure apps" message
- Ignore this - you don't need to enable "less secure apps"
- App passwords are the secure modern method

### Still not working?
1. Double-check the EMAIL_USER matches your Gmail exactly
2. Regenerate the app password and try again
3. Make sure you restarted the dev server after changing .env.local

## Security Notes
- ✅ `.env.local` is in `.gitignore` (never committed to GitHub)
- ✅ App passwords can be revoked anytime at myaccount.google.com
- ✅ App passwords can only send mail, they can't read your inbox
- ❌ Never share your app password publicly

