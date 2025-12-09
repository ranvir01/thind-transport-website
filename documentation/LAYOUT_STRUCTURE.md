# Layout Structure Documentation

## Overview

This document provides comprehensive documentation for the website's navigation and layout architecture, including the Header, Footer, and overall page structure. The layout is designed to be responsive, accessible, and optimized for conversion.

---

## Page Structure

### Root Layout (`src/app/layout.tsx`)

The root layout provides the foundation for all pages on the website:

```
<html lang="en" className="scroll-smooth">
  <head>
    - Meta tags (viewport, canonical, etc.)
    - Structured data (Schema.org JobPosting)
  </head>
  <body>
    - Skip to main content link (accessibility)
    - Header (sticky navigation)
    - Main content area (dynamic per page)
    - Footer
    - Conversion optimization components
    - Toast notifications
  </body>
</html>
```

### Key Features

1. **Semantic HTML Structure**: Uses proper HTML5 semantic tags (`<header>`, `<nav>`, `<main>`, `<footer>`)
2. **Accessibility**: 
   - Skip to main content link for keyboard navigation
   - ARIA labels on interactive elements
   - Proper heading hierarchy
3. **Smooth Scroll**: Enabled on the `<html>` element for smooth navigation
4. **SEO Optimization**: Structured data for job postings, meta tags, canonical URLs

---

## Header Structure

### Location
`src/components/layout/Header.tsx`

### Architecture

The Header is composed of three main sections, all with sticky positioning:

#### 1. Top Bar (z-index: 60)
**Purpose**: Display live updates and quick contact information

**Layout**:
```
[Live Updates]                    [Contact Info]
- 🟢 LIVE: X drivers joined      - 📞 (206) 765-9218
- 🚛 X loads available now        - 📧 Email
```

**Features**:
- Real-time driver count updates
- Active load count
- Direct phone and email links
- Responsive: Email hidden on mobile

**Design System Colors**:
- Background: `primary-900` to `primary-800` gradient
- Text: White
- Icons: Green (activity), Yellow (truck)

---

#### 2. Urgent Hiring Banner (z-index: 55)
**Purpose**: Drive immediate action with prominent call-to-action

**Layout**:
```
[⚡ URGENT HIRING]  [$1,000-$2,500 Sign-On Bonus]  [Quick Apply] [Call Now]
```

**Features**:
- Animated pulse badge
- Sign-on bonus highlight
- Two primary CTAs (Apply & Call)
- Application time indicator

**Design System Colors**:
- Background: `secondary-600` to orange-600 gradient
- Buttons: White with `secondary-600` text, Yellow with dark text

---

#### 3. Main Navigation (z-index: 50)
**Purpose**: Primary site navigation and branding

**Desktop Layout**:
```
[Logo + Company Name]  [Navigation Links]  [Live Load Tracker]  [Apply Now CTA]
```

**Navigation Links**:
1. Home
2. Pay Rates (💰 icon)
3. Load Board (🚛 icon)
4. Routes (🧭 icon)
5. Reviews (⭐ icon + 4.8★ badge)

**Mobile Layout**:
- Hamburger menu button
- Full-screen slide-down menu
- Stacked navigation links with icons
- Featured CTAs at bottom

**Features**:
- Active state indication (blue background, blue text, dot indicator)
- Hover states with smooth transitions
- Live Load Tracker (desktop only, xl breakpoint)
- Prominent "Apply Now" button

**Design System Colors**:
- Background: White
- Active links: `primary-600` text, `primary-50` background
- Hover: `primary-600` text, `neutral-50` background
- Borders: `neutral-200`

---

#### 4. Quick Actions Bar (Mobile Only, Shows on Scroll)
**Purpose**: Provide quick access to key actions on mobile

**Layout**:
```
[Apply] [Call] [Pay] [Loads]
```

**Features**:
- Fixed to bottom of screen
- Only visible when scrolled down
- Only shown on mobile (< lg breakpoint)

---

### Header Navigation Hierarchy

```
Top Bar (Info)
└── Live Updates
└── Contact Info

Urgent Banner (Conversion)
└── Hiring Message
└── CTAs (Apply, Call)

Main Navigation (Primary)
├── Branding
│   └── Logo + Company Name
├── Navigation Links
│   ├── Home
│   ├── Pay Rates
│   ├── Load Board
│   ├── Routes
│   └── Reviews
├── Live Load Tracker
└── Primary CTA (Apply Now)

Mobile Menu (< lg breakpoint)
├── All Navigation Links
├── Featured CTAs
└── Contact Options
```

---

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile (< 640px) | - Hamburger menu<br>- Top bar simplified<br>- Quick actions bar on scroll |
| Tablet (640px - 1023px) | - Hamburger menu<br>- Top bar full content<br>- No live load tracker |
| Desktop (1024px - 1279px) | - Full navigation visible<br>- No live load tracker<br>- All features except XL-specific |
| Large Desktop (≥ 1280px) | - Full navigation<br>- Live load tracker visible<br>- All features enabled |

---

## Footer Structure

### Location
`src/components/layout/Footer.tsx`

### Architecture

The Footer is organized into four main columns on desktop, stacking on mobile:

#### Column 1: Company Info & Contact
**Content**:
- Company logo and name
- Company description (founded date, experience)
- Contact information:
  - 📞 Phone: (206) 765-9218 with "24/7 Dispatch Support" label
  - 📧 Email: thindcarrier@gmail.com with "Email Us Anytime" label
  - 📍 Address: PO Box 5114, Kent, WA 98064

**Design System Colors**:
- Primary text: `neutral-200`
- Secondary text: `neutral-400`
- Links: Hover to `primary-400`
- Icons: `primary-400`

---

#### Column 2: Quick Links & Social Media
**Content**:
- **Quick Links**:
  - Home
  - Pay Rates & Benefits
  - Load Board
  - Routes
  - Driver Reviews
  - Apply Now (bold)

- **Social Media** (Below Quick Links):
  - Facebook
  - Twitter
  - LinkedIn
  - Instagram

**Features**:
- Hover animation: Links translate right slightly
- Social icons in rounded circles
- Social icons change from `neutral-800` to `primary-600` on hover

**Design System Colors**:
- Links: `neutral-400` → `primary-400` on hover
- Social icons background: `neutral-800` → `primary-600` on hover
- Social icons: `neutral-400` → white on hover

---

#### Column 3: Certifications & Safety
**Content**:
- **Certifications**:
  - FMCSA Certified
  - DOT Compliant
  - A+ Safety Rating
  - $1M+ Liability Coverage

- **DOT/MC Info Box**:
  - "Licensed & Insured" label
  - DOT# 2893456
  - MC# 123456

**Features**:
- Each certification has an icon
- DOT/MC info in highlighted box with border
- Clear visual hierarchy with icons

**Design System Colors**:
- Icons: `primary-400`
- Info box background: `neutral-800`
- Info box border: `neutral-700`

---

#### Column 4: Premier Partners & Fortune 500 Clients
**Content**:
- **Premier Partners** (Top 4):
  - Landstar Inway (Premier Partner)
  - JB Hunt (Strategic Partner)
  - C.H. Robinson (Diamond Carrier)
  - Schneider National (Elite Partner)

- **Fortune 500 Clients** (Top 3):
  - Amazon Logistics
  - Walmart Supply Chain
  - Lowe's Home Improvement

**Features**:
- External link icons for partners
- Package icons for clients
- Duration displayed for each client

**Design System Colors**:
- Icons: `primary-400`
- Primary text: White
- Secondary text: `neutral-500`

---

#### Bottom Bar
**Content**:
- Copyright notice
- Services: Flatbed • Reefer • Dry Van
- "Nationwide Service" label

**Design System Colors**:
- Background: `neutral-950` (darkest)
- Text: `neutral-500`
- Border: `neutral-800`

---

#### Floating Action Button (Mobile Only)
**Purpose**: Quick call access on mobile devices

**Features**:
- Fixed to bottom-right corner
- Phone icon
- Only visible on mobile (< md breakpoint)
- Direct tel: link

**Design System Colors**:
- Background: Green-500
- Icon: White

---

### Footer Organization Hierarchy

```
Main Footer Content
├── Company Info & Contact
│   ├── Logo + Name
│   ├── Description
│   └── Contact Info (Phone, Email, Address)
├── Quick Links & Social
│   ├── Navigation Links
│   └── Social Media Icons
├── Certifications & Safety
│   ├── Certifications List
│   └── DOT/MC Info Box
└── Premier Partners
    ├── Partner Brokers
    └── Fortune 500 Clients

Bottom Bar
├── Copyright
└── Services List

Floating Action Button (Mobile)
```

---

### Responsive Behavior

| Breakpoint | Footer Layout |
|------------|---------------|
| Mobile (< 640px) | - Single column stack<br>- All 4 columns stacked vertically<br>- Floating action button visible |
| Tablet (640px - 1023px) | - 2 columns grid<br>- Better spacing<br>- Floating action button visible |
| Desktop (≥ 1024px) | - 4 columns grid<br>- Full layout<br>- No floating action button |

---

## Navigation Patterns

### Primary Navigation Flow

1. **Top-Level Pages**: Accessible from main navigation
   - Home (`/`)
   - Pay Rates (`/pay-rates`)
   - Load Board (`/load-board`)
   - Routes (`/routes`)
   - Testimonials (`/testimonials`)
   - Apply (`/apply`)

2. **Quick Access CTAs** (Always Visible):
   - Apply Now (Green button, header & footer)
   - Call Now (Phone number, top bar & footer)

3. **Mobile Navigation**:
   - Hamburger menu for all navigation links
   - Quick actions bar on scroll (Apply, Call, Pay, Loads)
   - Floating action button for calls

---

## Design System Integration

### Colors Used

#### Header
- **Top Bar**: `primary-900`, `primary-800` (gradient)
- **Urgent Banner**: `secondary-600`, orange-600 (gradient)
- **Main Nav**: White background, `neutral-200` border
- **Active States**: `primary-600` text, `primary-50` background
- **Hover States**: `primary-600` text, `neutral-50` background

#### Footer
- **Background**: `neutral-900`, `neutral-950`
- **Text Primary**: White, `neutral-200`
- **Text Secondary**: `neutral-400`, `neutral-500`
- **Icons**: `primary-400`
- **Borders**: `neutral-800`, `neutral-700`
- **Links Hover**: `primary-400`
- **Social Hover**: `primary-600` background

### Typography

#### Header
- Logo: `text-xl font-black` (H1 equivalent)
- Nav Links: `text-sm font-medium`
- Top Bar: `text-xs`, `text-sm`
- Badges: `text-[10px]`

#### Footer
- Company Name: `text-xl font-bold` (H3)
- Section Headings: `text-sm font-semibold uppercase tracking-wide`
- Body Text: `text-sm`
- Secondary Text: `text-xs`

---

## Accessibility Features

### Header
1. **Skip to Main Content**: Visible on focus, jumps to main content
2. **ARIA Labels**: All interactive elements labeled
3. **Keyboard Navigation**: Full keyboard support
4. **Focus States**: Visible focus indicators on all interactive elements
5. **Mobile Menu**: Proper ARIA expanded/collapsed states

### Footer
1. **Semantic HTML**: Proper use of `<footer>`, `<nav>`, headings
2. **Link Labels**: Clear, descriptive link text
3. **External Links**: `rel="noopener noreferrer"` for security
4. **Icon Labels**: ARIA labels on social media icons

---

## Performance Optimizations

### Header
1. **Sticky Positioning**: Uses CSS sticky instead of JS scroll listeners where possible
2. **Conditional Rendering**: Mobile menu and quick actions bar only render when needed
3. **Optimized Re-renders**: State updates batched and optimized

### Footer
1. **Static Content**: Most footer content is static for better performance
2. **Image Optimization**: Next.js Image component for logo
3. **Link Prefetching**: Next.js Link component for instant navigation

---

## Conversion Optimization

### Header CTAs
1. **Urgent Hiring Banner**: Prominent, animated, multiple CTAs
2. **Apply Now Button**: Always visible on desktop
3. **Quick Actions Bar**: Mobile-specific quick access
4. **Live Load Tracker**: Social proof and engagement
5. **Phone Number**: Always visible in top bar

### Footer CTAs
1. **Multiple Apply Links**: Quick Links section, highlighted
2. **Contact Options**: Phone, email prominently displayed
3. **Social Proof**: Certifications, partners, clients
4. **Trust Indicators**: DOT/MC numbers, safety ratings

---

## Maintenance Guidelines

### Adding New Navigation Links

**Header** (`src/components/layout/Header.tsx`):
1. Add link to desktop navigation using `<NavLink>` component
2. Add link to mobile menu in the `{mobileMenuOpen && ...}` section
3. Optionally add to quick actions bar if critical

**Footer** (`src/components/layout/Footer.tsx`):
1. Add to Quick Links section in Column 2
2. Maintain alphabetical or priority order

### Updating Contact Information

**Constants File** (`src/lib/constants.ts`):
- Update `COMPANY_INFO` object
- Changes automatically propagate to Header and Footer

### Modifying Colors

**Design System** (`src/app/globals.css` & `DESIGN_GUIDELINES.md`):
- Update color variables in Tailwind config or globals.css
- Use semantic color names (primary, secondary, neutral)
- Maintain WCAG AA contrast ratios

---

## Testing Checklist

### Header
- [ ] Logo links to home page
- [ ] All navigation links work correctly
- [ ] Active state shows on current page
- [ ] Mobile menu opens/closes properly
- [ ] Quick actions bar appears on scroll (mobile)
- [ ] Phone and email links work
- [ ] Live load tracker displays and updates
- [ ] Sticky positioning works across all scroll positions

### Footer
- [ ] All links navigate correctly
- [ ] Social media links open in new tabs
- [ ] Phone link works on mobile
- [ ] Email link opens email client
- [ ] Responsive layout works on all breakpoints
- [ ] Floating action button appears on mobile only
- [ ] Hover effects work on all interactive elements

### Accessibility
- [ ] Skip to main content link visible on focus
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces elements correctly
- [ ] Focus indicators visible and clear
- [ ] Color contrast meets WCAG AA standards

### Responsive
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640px - 1023px)
- [ ] Desktop layout (1024px - 1279px)
- [ ] Large desktop layout (≥ 1280px)

---

## Browser Support

The layout is fully tested and supported on:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

---

## Future Enhancements

### Potential Improvements
1. **Mega Menu**: For load board and routes with visual previews
2. **Search Functionality**: Global search in header
3. **Notification Bell**: For driver portal updates
4. **Language Selector**: Multi-language support
5. **Dark Mode Toggle**: User preference for dark/light mode
6. **Breadcrumb Navigation**: On interior pages

---

## Questions or Updates

For questions about the layout structure or to propose updates, please:
1. Review this documentation first
2. Check the Design System Guidelines (`DESIGN_GUIDELINES.md`)
3. Test changes across all breakpoints
4. Maintain accessibility standards
5. Document any new patterns added

**Last Updated**: Step 3 - Navigation & Layout Architecture Complete

---

## Quick Reference

### File Locations
- **Header**: `src/components/layout/Header.tsx`
- **Footer**: `src/components/layout/Footer.tsx`
- **Root Layout**: `src/app/layout.tsx`
- **Constants**: `src/lib/constants.ts`
- **Global Styles**: `src/app/globals.css`

### Key Components
- `NavLink`: Reusable navigation link with active states
- `LiveLoadTracker`: Real-time load updates component
- Container: `.container` class for consistent max-width

### Z-Index Scale
- Top Bar: 60
- Urgent Banner: 55
- Main Navigation: 50
- Quick Actions Bar: 70 (mobile only)
- Skip Link: 100 (accessibility)

---

*End of Layout Structure Documentation*

