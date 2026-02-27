# Design System Guidelines

## Overview

This document outlines the comprehensive design system for the trucking/transportation company website. The design system establishes a modern, professional, and consistent visual language that builds trust and drives conversions.

---

## Color Palette

### Primary Colors - Blue (Trust & Professionalism)

The primary color palette uses a strong blue to convey trust, reliability, and professionalism - essential qualities for a transportation company.

| Shade | Hex Code | Usage |
|-------|----------|-------|
| Primary 50 | `#eff6ff` | Light backgrounds, subtle highlights |
| Primary 100 | `#dbeafe` | Very light backgrounds |
| Primary 200 | `#bfdbfe` | Light borders, subtle accents |
| Primary 300 | `#93c5fd` | Hover states on light backgrounds |
| Primary 400 | `#60a5fa` | Secondary buttons, icons |
| **Primary 500** | `#3b82f6` | **Main primary color - buttons, links, CTAs** |
| **Primary 600** | `#2563eb` | **Hover states, active states** |
| Primary 700 | `#1d4ed8` | Darker hover states |
| Primary 800 | `#1e40af` | Dark text on light backgrounds |
| Primary 900 | `#1e3a8a` | Very dark accents |
| Primary 950 | `#172554` | Darkest shade for contrast |

**When to Use:**
- Primary buttons and call-to-action buttons
- Navigation links and active navigation states
- Important interactive elements
- Trust indicators and badges
- Links in body text
- Focus states and accessibility indicators

**Tailwind Usage:** `bg-primary-500`, `text-primary-600`, `border-primary-500`

---

### Secondary Colors - Red (Action & Energy)

The secondary color palette uses a bold red to create urgency, draw attention, and encourage action.

| Shade | Hex Code | Usage |
|-------|----------|-------|
| Secondary 50 | `#fef2f2` | Light backgrounds, error backgrounds |
| Secondary 100 | `#fee2e2` | Very light error backgrounds |
| Secondary 200 | `#fecaca` | Light borders for error states |
| Secondary 300 | `#fca5a5` | Subtle error highlights |
| Secondary 400 | `#f87171` | Warning states |
| **Secondary 500** | `#ef4444` | **Main secondary color - urgent CTAs, alerts** |
| **Secondary 600** | `#dc2626` | **Hover states, active error states** |
| Secondary 700 | `#b91c1c` | Darker error states |
| Secondary 800 | `#991b1b` | Dark error text |
| Secondary 900 | `#7f1d1d` | Very dark error accents |
| Secondary 950 | `#450a0a` | Darkest error shade |

**When to Use:**
- Urgent call-to-action buttons (e.g., "Apply Now", "Get Started Today")
- Alert messages and notifications
- Error states and validation messages
- Important announcements
- Limited-time offers or promotions
- Destructive actions (use sparingly)

**Tailwind Usage:** `bg-secondary-500`, `text-secondary-600`, `border-secondary-500`

---

### Neutral Colors - Professional Grays

The neutral palette provides a professional foundation for text, backgrounds, and UI elements.

| Shade | Hex Code | Usage |
|-------|----------|-------|
| Neutral 50 | `#f9fafb` | **Main background color** |
| Neutral 100 | `#f3f4f6` | Light section backgrounds |
| Neutral 200 | `#e5e7eb` | Borders, dividers |
| Neutral 300 | `#d1d5db` | Disabled states, subtle borders |
| Neutral 400 | `#9ca3af` | Placeholder text, icons |
| Neutral 500 | `#6b7280` | Secondary text, labels |
| Neutral 600 | `#4b5563` | Muted text |
| Neutral 700 | `#374151` | Body text on light backgrounds |
| Neutral 800 | `#1f2937` | Headings on light backgrounds |
| **Neutral 900** | `#111827` | **Primary text color** |
| Neutral 950 | `#030712` | Darkest text for maximum contrast |

**When to Use:**
- Background colors (Neutral 50-100)
- Borders and dividers (Neutral 200-300)
- Body text (Neutral 700-900)
- Headings (Neutral 800-900)
- Placeholder text (Neutral 400)
- Disabled states (Neutral 300-400)

**Tailwind Usage:** `bg-neutral-50`, `text-neutral-900`, `border-neutral-200`

---

### Semantic Colors

#### Success (Green)

| Shade | Hex Code | Usage |
|-------|----------|-------|
| Success 500 | `#22c55e` | Success messages, completed states |
| Success 600 | `#16a34a` | Success hover states |

**When to Use:**
- Success messages and confirmations
- Completed form steps
- Positive indicators (e.g., "Verified", "Active")
- Success badges and status indicators

**Tailwind Usage:** `bg-success-500`, `text-success-600`

---

#### Warning (Amber/Orange)

| Shade | Hex Code | Usage |
|-------|----------|-------|
| Warning 500 | `#f59e0b` | Warning messages, caution states |
| Warning 600 | `#d97706` | Warning hover states |

**When to Use:**
- Warning messages and alerts
- Caution indicators
- Pending states
- Important notices that require attention

**Tailwind Usage:** `bg-warning-500`, `text-warning-600`

---

#### Error (Red)

| Shade | Hex Code | Usage |
|-------|----------|-------|
| Error 500 | `#ef4444` | Error messages, validation errors |
| Error 600 | `#dc2626` | Error hover states |

**When to Use:**
- Error messages and validation errors
- Failed states
- Critical alerts
- Form validation errors

**Tailwind Usage:** `bg-error-500`, `text-error-600`

**Note:** Error colors are the same as Secondary colors, reinforcing the urgency and importance of error states.

---

## Typography System

### Font Families

- **Primary Font Stack:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
  - Uses system fonts for optimal performance and native feel
  - Falls back gracefully across all platforms

### Typography Scale

The typography scale creates a clear visual hierarchy with consistent sizing and spacing.

#### Display Sizes (Hero & Large Headlines)

| Size | Font Size | Line Height | Weight | Usage |
|------|-----------|-------------|--------|-------|
| Display 2XL | 72px (4.5rem) | 1.0 | 700 (Bold) | Large hero headlines, landing page titles |
| Display XL | 60px (3.75rem) | 1.1 | 700 (Bold) | Hero headlines, main page titles |
| Display LG | 48px (3rem) | 1.2 | 700 (Bold) | Section headers, major page titles |
| Display MD | 36px (2.25rem) | 1.3 | 600 (Semibold) | Subsection headers, card titles |
| Display SM | 30px (1.875rem) | 1.4 | 600 (Semibold) | Large card headers, feature titles |

**Tailwind Usage:** `text-display-2xl`, `text-display-xl`, `text-display-lg`, `text-display-md`, `text-display-sm`

---

#### Heading Sizes (Standard Headings)

| Size | Font Size | Line Height | Weight | Usage |
|------|-----------|-------------|--------|-------|
| H1 | 40px (2.5rem) | 1.2 | 700 (Bold) | Page titles, main headings |
| H2 | 32px (2rem) | 1.3 | 600 (Semibold) | Section headings, subsection titles |
| H3 | 24px (1.5rem) | 1.4 | 600 (Semibold) | Subsection headings, card titles |
| H4 | 20px (1.25rem) | 1.5 | 600 (Semibold) | Small section headings |
| H5 | 18px (1.125rem) | 1.5 | 600 (Semibold) | Minor headings, list headers |
| H6 | 16px (1rem) | 1.5 | 600 (Semibold) | Smallest headings, labels |

**Tailwind Usage:** `text-h1`, `text-h2`, `text-h3`, `text-h4`, `text-h5`, `text-h6`

**Note:** These styles are automatically applied to `<h1>` through `<h6>` tags via global CSS.

---

#### Body Text Sizes

| Size | Font Size | Line Height | Weight | Usage |
|------|-----------|-------------|--------|-------|
| Body LG | 18px (1.125rem) | 1.75 | 400 (Regular) | Large body text, important paragraphs |
| Body | 16px (1rem) | 1.75 | 400 (Regular) | **Standard body text, paragraphs** |
| Body SM | 14px (0.875rem) | 1.5 | 400 (Regular) | Small body text, captions |
| Body XS | 12px (0.75rem) | 1.5 | 400 (Regular) | Extra small text, fine print |

**Tailwind Usage:** `text-body-lg`, `text-body`, `text-body-sm`, `text-body-xs`

**Note:** Standard body text (16px) is the default for `<p>` tags via global CSS.

---

#### Label Sizes

| Size | Font Size | Line Height | Weight | Usage |
|------|-----------|-------------|--------|-------|
| Label LG | 14px (0.875rem) | 1.5 | 600 (Semibold) | Large form labels, section labels |
| Label | 12px (0.75rem) | 1.5 | 600 (Semibold) | Standard form labels, input labels |
| Label SM | 10px (0.625rem) | 1.5 | 600 (Semibold) | Small labels, badges, tags |

**Tailwind Usage:** `text-label-lg`, `text-label`, `text-label-sm`

---

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Thin | 100 | Rarely used, decorative text |
| Extra Light | 200 | Rarely used, decorative text |
| Light | 300 | Rarely used, subtle emphasis |
| Regular | 400 | **Body text, default weight** |
| Medium | 500 | Subtle emphasis, buttons |
| Semibold | 600 | **Headings (H2-H6), labels, emphasis** |
| Bold | 700 | **Headings (H1, Display), strong emphasis** |
| Extra Bold | 800 | Rarely used, maximum emphasis |
| Black | 900 | Rarely used, maximum emphasis |

**Tailwind Usage:** `font-thin`, `font-light`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`, `font-black`

---

### Line Heights

| Name | Value | Usage |
|------|-------|-------|
| None | 1.0 | Tight spacing for display text |
| Tight | 1.25 | Headlines, compact text |
| Snug | 1.375 | Subheadings |
| Normal | 1.5 | **Standard for headings and labels** |
| Relaxed | 1.75 | **Standard for body text** |
| Loose | 2.0 | Extra spacing for readability |

**Tailwind Usage:** `leading-none`, `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed`, `leading-loose`

---

## Usage Guidelines

### Color Usage Best Practices

1. **Primary Blue (Primary 500-600):**
   - Use for primary actions, navigation, and trust-building elements
   - Maintains consistency across the site
   - Creates a professional, trustworthy appearance

2. **Secondary Red (Secondary 500-600):**
   - Use sparingly for urgent CTAs and important alerts
   - Creates visual hierarchy and draws attention
   - Avoid overuse to maintain impact

3. **Neutral Grays:**
   - Use Neutral 50-100 for backgrounds
   - Use Neutral 700-900 for text (ensure WCAG AA contrast)
   - Use Neutral 200-300 for borders and dividers

4. **Semantic Colors:**
   - Use consistently for their intended purpose (success, warning, error)
   - Don't mix semantic colors with brand colors
   - Ensure sufficient contrast for accessibility

### Typography Best Practices

1. **Hierarchy:**
   - Use Display sizes for hero sections and landing pages
   - Use H1-H6 for standard page structure
   - Maintain consistent hierarchy within sections

2. **Readability:**
   - Use Body (16px) as the default for paragraphs
   - Use Body LG (18px) for important content
   - Use Body SM (14px) for secondary information

3. **Spacing:**
   - Maintain adequate spacing between headings and body text
   - Use line-height 1.75 for body text for optimal readability
   - Use tighter line heights (1.2-1.4) for headings

4. **Consistency:**
   - Stick to the defined typography scale
   - Don't create custom font sizes outside the scale
   - Use semantic HTML tags (h1-h6, p) to leverage global styles

---

## Accessibility Considerations

### Color Contrast

- **Text on Light Backgrounds:** Use Neutral 700-900 for body text, Neutral 800-900 for headings
- **Text on Dark Backgrounds:** Use Neutral 50-100 for text
- **Interactive Elements:** Ensure Primary 600 and Secondary 600 meet WCAG AA contrast ratios
- **Error States:** Error colors (Error 500-600) meet contrast requirements

### Focus States

- All interactive elements should have visible focus states
- Use `ring-2 ring-primary-500 ring-offset-2` for focus indicators
- Ensure focus states are keyboard-accessible

### Typography Accessibility

- Minimum font size: 12px (Body XS) for fine print only
- Standard body text: 16px (Body) for optimal readability
- Line height: 1.75 for body text ensures comfortable reading
- Letter spacing: Adjusted for headings to improve readability

---

## Implementation Notes

### Tailwind CSS Classes

All colors and typography are available as Tailwind utility classes:

**Colors:**
- `bg-primary-500`, `text-primary-600`, `border-primary-500`
- `bg-secondary-500`, `text-secondary-600`, `border-secondary-500`
- `bg-neutral-50`, `text-neutral-900`, `border-neutral-200`
- `bg-success-500`, `bg-warning-500`, `bg-error-500`

**Typography:**
- `text-display-2xl`, `text-display-xl`, `text-display-lg`
- `text-h1`, `text-h2`, `text-h3`, `text-h4`, `text-h5`, `text-h6`
- `text-body-lg`, `text-body`, `text-body-sm`, `text-body-xs`
- `text-label-lg`, `text-label`, `text-label-sm`

### Global Styles

Default styles are applied via `globals.css`:
- `<body>` uses Neutral 50 background and Neutral 900 text
- `<h1>` through `<h6>` have predefined styles
- `<a>` tags use Primary 600 with hover states
- `<p>` tags use Body size with Neutral 700 color

---

## Design Tokens Reference

For developers implementing components, refer to these design tokens:

**Primary Color:** `#3b82f6` (Primary 500)
**Secondary Color:** `#ef4444` (Secondary 500)
**Background Color:** `#f9fafb` (Neutral 50)
**Text Color:** `#111827` (Neutral 900)
**Border Color:** `#e5e7eb` (Neutral 200)

**Default Font Size:** `1rem` (16px)
**Default Line Height:** `1.75`
**Default Font Weight:** `400` (Regular)

---

## Questions or Updates

For questions about this design system or to propose updates, please refer to the project documentation or contact the design team.

**Last Updated:** Design System v1.0 - Initial Implementation

