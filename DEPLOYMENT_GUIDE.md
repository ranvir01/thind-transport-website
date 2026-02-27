# Thind Transport Website - Deployment Guide

## Domain: thindtransport.com

This guide walks you through deploying your website to Vercel and connecting your Namecheap domain.

---

## Step 1: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Thind Transport Website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/thind-transport-website.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd "D:\Thind Transport Website"
   vercel
   ```
   - Follow the prompts
   - Choose "No" for linking to existing project (first time)
   - Confirm the settings

---

## Step 2: Add Custom Domain in Vercel

1. Go to your Vercel dashboard
2. Select your "thind-transport" project
3. Click **Settings** → **Domains**
4. Add these domains:
   - `thindtransport.com` (primary)
   - `www.thindtransport.com` (redirects to primary)

Vercel will show you the DNS records needed.

---

## Step 3: Configure DNS in Namecheap

### For Root Domain (thindtransport.com)

1. Log in to [Namecheap](https://namecheap.com)
2. Go to **Domain List** → Click **Manage** next to your domain
3. Go to **Advanced DNS** tab
4. Delete any existing A records for `@`
5. Add these **A Records**:

   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | A Record | @ | 76.76.21.21 | Automatic |

### For WWW Subdomain

Add a **CNAME Record**:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME Record | www | cname.vercel-dns.com | Automatic |

### Alternative: Use Vercel Nameservers (Simplest)

Instead of adding individual records, you can point Namecheap to use Vercel's nameservers:

1. In Namecheap, go to **Domain** → **Nameservers**
2. Select "Custom DNS"
3. Add Vercel's nameservers:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
4. Save changes

---

## Step 4: Verify Domain in Vercel

1. Back in Vercel, click **Refresh** on the domain settings
2. Wait for DNS propagation (usually 5-30 minutes, can take up to 48 hours)
3. Vercel will automatically provision SSL certificates

You'll see green checkmarks when everything is working:
- ✅ Valid Configuration
- ✅ SSL Certificate

---

## Step 5: Force HTTPS & WWW Redirect

In Vercel domain settings:
- Set `thindtransport.com` as the **Primary Domain**
- `www.thindtransport.com` will automatically redirect to the primary

---

## DNS Records Summary

### Recommended Setup:

```
Type        Host    Value                    TTL
─────────────────────────────────────────────────────
A           @       76.76.21.21              Auto
CNAME       www     cname.vercel-dns.com     Auto
```

---

## Troubleshooting

### Domain not working?

1. **Check DNS propagation**: Use [whatsmydns.net](https://whatsmydns.net) to check if DNS has propagated
2. **Clear browser cache**: Try incognito/private browsing
3. **Wait**: DNS changes can take up to 48 hours

### SSL Certificate Issues?

Vercel automatically provisions SSL. If there are issues:
1. Ensure DNS records are correct
2. Try removing and re-adding the domain in Vercel
3. Check Vercel deployment logs for errors

### Build Failing?

```bash
# Test locally first
npm run build
npm run start
```

---

## Environment Variables (If Needed)

If you add environment variables later (like API keys), add them in:
- Vercel Dashboard → Project → Settings → Environment Variables

---

## Post-Deployment Checklist

- [ ] Website loads at https://thindtransport.com
- [ ] www.thindtransport.com redirects to thindtransport.com
- [ ] SSL certificate is valid (green padlock)
- [ ] All pages load correctly
- [ ] Forms are working
- [ ] Images are loading
- [ ] Mobile responsive design works
- [ ] Test phone number links (tel:)
- [ ] Test email links (mailto:)

---

## Useful Commands

```bash
# Local development
npm run dev

# Production build test
npm run build
npm run start

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Namecheap DNS**: https://www.namecheap.com/support/knowledgebase/
- **Next.js Docs**: https://nextjs.org/docs

---

## Quick Reference

| Service | URL |
|---------|-----|
| Live Site | https://thindtransport.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Namecheap | https://namecheap.com |

---

*Last Updated: December 2025*

