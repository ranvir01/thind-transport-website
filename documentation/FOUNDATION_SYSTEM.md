# Foundation Design System

**Version:** 1.0.0  
**Last Updated:** Foundation Build Complete  
**Status:** ✅ Ready for Component Development

---

## 📋 Table of Contents

1. [Color System](#color-system)
2. [Typography Hierarchy](#typography-hierarchy)
3. [Spacing System](#spacing-system)
4. [Dark Mode Support](#dark-mode-support)
5. [Usage Examples](#usage-examples)
6. [Implementation Guidelines](#implementation-guidelines)

---

## 🎨 Color System

### Primary Colors - Strong Blue

**Purpose:** Trust, professionalism, primary actions, navigation

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| Primary 50 | `#eff6ff` | `bg-primary-50` | Very light backgrounds, subtle highlights |
| Primary 100 | `#dbeafe` | `bg-primary-100` | Light backgrounds |
| Primary 200 | `#bfdbfe` | `bg-primary-200` | Light borders, subtle accents |
| Primary 300 | `#93c5fd` | `bg-primary-300` | Hover states on light backgrounds |
| Primary 400 | `#60a5fa` | `bg-primary-400` | Secondary buttons, icons |
| **Primary 500** | `#3b82f6` | `bg-primary-500` | **Main primary color - buttons, links, CTAs** |
| **Primary 600** | `#2563eb` | `bg-primary-600` | **Hover states, active states** |
| Primary 700 | `#1d4ed8` | `bg-primary-700` | Darker hover states |
| **Primary 800** | `#1e40af` | `bg-primary-800` | **Dark text on light backgrounds** |
| Primary 900 | `#1e3a8a` | `bg-primary-900` | Very dark accents |
| Primary 950 | `#172554` | `bg-primary-950` | Darkest shade for contrast |

**Key Colors:**
- Main Primary: `#3b82f6` (Primary 500)
- Range: `#1e40af` (Primary 800) to `#3b82f6` (Primary 500) ✅

---

### Secondary Colors - Bold Red (Accent)

**Purpose:** Action, energy, urgent CTAs, alerts

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| Secondary 50 | `#fef2f2` | `bg-secondary-50` | Light backgrounds, error backgrounds |
| Secondary 100 | `#fee2e2` | `bg-secondary-100` | Very light error backgrounds |
| Secondary 200 | `#fecaca` | `bg-secondary-200` | Light borders for error states |
| Secondary 300 | `#fca5a5` | `bg-secondary-300` | Subtle error highlights |
| Secondary 400 | `#f87171` | `bg-secondary-400` | Warning states |
| **Secondary 500** | `#ef4444` | `bg-secondary-500` | **Main secondary color - urgent CTAs, alerts** |
| **Secondary 600** | `#dc2626` | `bg-secondary-600` | **Hover states, active error states** |
| Secondary 700 | `#b91c1c` | `bg-secondary-700` | Darker error states |
| Secondary 800 | `#991b1b` | `bg-secondary-800` | Dark error text |
| Secondary 900 | `#7f1d1d` | `bg-secondary-900` | Very dark error accents |
| Secondary 950 | `#450a0a` | `bg-secondary-950` | Darkest error shade |

**Key Colors:**
- Main Secondary: `#ef4444` (Secondary 500)
- Range: `#dc2626` (Secondary 600) to `#ef4444` (Secondary 500) ✅

---

### Neutral Colors - Professional Grays

**Purpose:** Backgrounds, text, borders, UI elements

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| **Neutral 50** | `#f9fafb` | `bg-neutral-50` | **Main background color** |
| Neutral 100 | `#f3f4f6` | `bg-neutral-100` | Light section backgrounds |
| **Neutral 200** | `#e5e7eb` | `bg-neutral-200` | **Borders, dividers** |
| Neutral 300 | `#d1d5db` | `bg-neutral-300` | Disabled states, subtle borders |
| Neutral 400 | `#9ca3af` | `bg-neutral-400` | Placeholder text, icons |
| Neutral 500 | `#6b7280` | `bg-neutral-500` | Secondary text, labels |
| Neutral 600 | `#4b5563` | `bg-neutral-600` | Muted text |
| Neutral 700 | `#374151` | `bg-neutral-700` | Body text on light backgrounds |
| Neutral 800 | `#1f2937` | `bg-neutral-800` | Headings on light backgrounds |
| **Neutral 900** | `#111827` | `bg-neutral-900` | **Primary text color** |
| Neutral 950 | `#030712` | `bg-neutral-950` | Darkest text for maximum contrast |

**Key Colors:**
- Background: `#f9fafb` (Neutral 50)
- Text: `#111827` (Neutral 900)
- Borders: `#e5e7eb` (Neutral 200)

---

### Semantic Colors

#### Success (Green)

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| Success 500 | `#22c55e` | `bg-success-500` | Success messages, completed states |
| Success 600 | `#16a34a` | `bg-success-600` | Success hover states |

**Usage:** Success messages, confirmations, positive indicators

---

#### Warning (Amber/Orange)

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| Warning 500 | `#f59e0b` | `bg-warning-500` | Warning messages, caution states |
| Warning 600 | `#d97706` | `bg-warning-600` | Warning hover states |

**Usage:** Warning messages, caution indicators, pending states

---

#### Error (Red)

| Shade | Hex Code | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| Error 500 | `#ef4444` | `bg-error-500` | Error messages, validation errors |
| Error 600 | `#dc2626` | `bg-error-600` | Error hover states |

**Usage:** Error messages, validation errors, failed states

**Note:** Error colors match Secondary colors for consistency.

---

## 📝 Typography Hierarchy

### Font Family

**Primary Stack:**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Benefits:**
- Uses native system fonts for optimal performance
- Consistent across platforms
- No external font loading required

---

### Display Sizes (Hero & Large Headlines)

| Size | Font Size | Line Height | Weight | Letter Spacing | Tailwind Class | Usage |
|------|-----------|-------------|--------|----------------|----------------|-------|
| Display 2XL | 72px (4.5rem) | 1.0 | 700 (Bold) | -0.02em | `text-display-2xl` | Large hero headlines, landing page titles |
| Display XL | 60px (3.75rem) | 1.1 | 700 (Bold) | -0.02em | `text-display-xl` | Hero headlines, main page titles |
| Display LG | 48px (3rem) | 1.2 | 700 (Bold) | -0.01em | `text-display-lg` | Section headers, major page titles |
| Display MD | 36px (2.25rem) | 1.3 | 600 (Semibold) | -0.01em | `text-display-md` | Subsection headers, card titles |
| Display SM | 30px (1.875rem) | 1.4 | 600 (Semibold) | 0 | `text-display-sm` | Large card headers, feature titles |

---

### Heading Sizes (Standard Headings)

| Size | Font Size | Line Height | Weight | Letter Spacing | Tailwind Class | HTML Tag | Usage |
|------|-----------|-------------|--------|----------------|----------------|----------|-------|
| H1 | 40px (2.5rem) | 1.2 | 700 (Bold) | -0.01em | `text-h1` | `<h1>` | Page titles, main headings |
| H2 | 32px (2rem) | 1.3 | 600 (Semibold) | -0.01em | `text-h2` | `<h2>` | Section headings, subsection titles |
| H3 | 24px (1.5rem) | 1.4 | 600 (Semibold) | 0 | `text-h3` | `<h3>` | Subsection headings, card titles |
| H4 | 20px (1.25rem) | 1.5 | 600 (Semibold) | 0 | `text-h4` | `<h4>` | Small section headings |
| H5 | 18px (1.125rem) | 1.5 | 600 (Semibold) | 0 | `text-h5` | `<h5>` | Minor headings, list headers |
| H6 | 16px (1rem) | 1.5 | 600 (Semibold) | 0 | `text-h6` | `<h6>` | Smallest headings, labels |

**Note:** These styles are automatically applied to `<h1>` through `<h6>` tags via global CSS.

---

### Body Text Sizes

| Size | Font Size | Line Height | Weight | Letter Spacing | Tailwind Class | Usage |
|------|-----------|-------------|--------|----------------|----------------|-------|
| Body LG | 18px (1.125rem) | 1.75 | 400 (Regular) | 0 | `text-body-lg` | Large body text, important paragraphs |
| Body | 16px (1rem) | 1.75 | 400 (Regular) | 0 | `text-body` | **Standard body text, paragraphs** |
| Body SM | 14px (0.875rem) | 1.5 | 400 (Regular) | 0 | `text-body-sm` | Small body text, captions |
| Body XS | 12px (0.75rem) | 1.5 | 400 (Regular) | 0 | `text-body-xs` | Extra small text, fine print |

**Note:** Standard body text (16px) is the default for `<p>` tags via global CSS.

---

### Label Sizes

| Size | Font Size | Line Height | Weight | Letter Spacing | Tailwind Class | Usage |
|------|-----------|-------------|--------|----------------|----------------|-------|
| Label LG | 14px (0.875rem) | 1.5 | 600 (Semibold) | 0.01em | `text-label-lg` | Large form labels, section labels |
| Label | 12px (0.75rem) | 1.5 | 600 (Semibold) | 0.01em | `text-label` | Standard form labels, input labels |
| Label SM | 10px (0.625rem) | 1.5 | 600 (Semibold) | 0.02em | `text-label-sm` | Small labels, badges, tags |

---

### Font Weights

| Weight | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Thin | 100 | `font-thin` | Rarely used, decorative text |
| Extra Light | 200 | `font-extralight` | Rarely used, decorative text |
| Light | 300 | `font-light` | Rarely used, subtle emphasis |
| Regular | 400 | `font-normal` | **Body text, default weight** |
| Medium | 500 | `font-medium` | Subtle emphasis, buttons |
| Semibold | 600 | `font-semibold` | **Headings (H2-H6), labels, emphasis** |
| Bold | 700 | `font-bold` | **Headings (H1, Display), strong emphasis** |
| Extra Bold | 800 | `font-extrabold` | Rarely used, maximum emphasis |
| Black | 900 | `font-black` | Rarely used, maximum emphasis |

---

### Line Heights

| Name | Value | Tailwind Class | Usage |
|------|-------|----------------|-------|
| None | 1.0 | `leading-none` | Tight spacing for display text |
| Tight | 1.25 | `leading-tight` | Headlines, compact text |
| Snug | 1.375 | `leading-snug` | Subheadings |
| Normal | 1.5 | `leading-normal` | **Standard for headings and labels** |
| Relaxed | 1.75 | `leading-relaxed` | **Standard for body text** |
| Loose | 2.0 | `leading-loose` | Extra spacing for readability |

---

## 📏 Spacing System

### Base Unit

**Base Unit:** 4px (0.25rem)

All spacing values are multiples of 4px for consistency and alignment.

---

### Standard Spacing Scale

| Spacing | Value | Pixels | Tailwind Class | Usage |
|---------|-------|--------|----------------|-------|
| 0 | 0 | 0px | `p-0`, `m-0` | No spacing |
| 0.5 | 0.125rem | 2px | `p-0.5`, `m-0.5` | Minimal spacing |
| 1 | 0.25rem | 4px | `p-1`, `m-1` | Tight spacing |
| 1.5 | 0.375rem | 6px | `p-1.5`, `m-1.5` | Very tight spacing |
| 2 | 0.5rem | 8px | `p-2`, `m-2` | Small spacing |
| 2.5 | 0.625rem | 10px | `p-2.5`, `m-2.5` | Small-medium spacing |
| 3 | 0.75rem | 12px | `p-3`, `m-3` | Medium-small spacing |
| 3.5 | 0.875rem | 14px | `p-3.5`, `m-3.5` | Medium spacing |
| 4 | 1rem | 16px | `p-4`, `m-4` | **Standard spacing** |
| 4.5 | 1.125rem | 18px | `p-4.5`, `m-4.5` | Standard-medium spacing |
| 5 | 1.25rem | 20px | `p-5`, `m-5` | Medium spacing |
| 6 | 1.5rem | 24px | `p-6`, `m-6` | **Common component spacing** |
| 7.5 | 1.875rem | 30px | `p-7.5`, `m-7.5` | Medium-large spacing |
| 8 | 2rem | 32px | `p-8`, `m-8` | Large spacing |
| 10 | 2.5rem | 40px | `p-10`, `m-10` | **Section spacing** |
| 12 | 3rem | 48px | `p-12`, `m-12` | Large section spacing |
| 14 | 3.5rem | 56px | `p-14`, `m-14` | Extra large spacing |
| 16 | 4rem | 64px | `p-16`, `m-16` | **Major section spacing** |
| 20 | 5rem | 80px | `p-20`, `m-20` | Hero section spacing |
| 24 | 6rem | 96px | `p-24`, `m-24` | Maximum spacing |
| 25 | 6.25rem | 100px | `p-25`, `m-25` | **Desktop section spacing** |
| 32 | 8rem | 128px | `p-32`, `m-32` | Extra maximum spacing |

---

### Spacing Guidelines

#### Padding Standards

- **Component Padding:** `p-4` to `p-6` (16px-24px)
- **Card Padding:** `p-6` to `p-8` (24px-32px)
- **Section Padding:** `py-10` to `py-16` (40px-64px vertical)
- **Container Padding:** `px-4` to `px-8` (16px-32px horizontal)

#### Margin Standards

- **Element Spacing:** `mb-4` to `mb-6` (16px-24px)
- **Section Spacing:** `mb-10` to `mb-16` (40px-64px)
- **Desktop Section Spacing:** `mb-25` (100px)
- **Mobile Section Spacing:** `mb-10` to `mb-12` (40px-48px)

#### Gap Standards (for Flexbox/Grid)

- **Tight Gap:** `gap-2` to `gap-4` (8px-16px)
- **Standard Gap:** `gap-4` to `gap-6` (16px-24px)
- **Large Gap:** `gap-8` to `gap-10` (32px-40px)

---

## 🌙 Dark Mode Support

### Configuration

Dark mode is configured using Tailwind's class-based strategy:

```typescript
darkMode: ["class"]
```

### Implementation

To enable dark mode, add the `dark` class to the root HTML element:

```html
<html class="dark">
```

### Dark Mode Colors

Dark mode variants are automatically handled by Tailwind's color system. Use the same color classes - Tailwind will apply appropriate dark mode variants when the `dark` class is present.

**Example:**
```tsx
// Light mode: bg-neutral-50, text-neutral-900
// Dark mode: bg-neutral-900, text-neutral-50
<div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50">
  Content
</div>
```

### Dark Mode Best Practices

1. **Always test both modes:** Ensure components work in both light and dark modes
2. **Use semantic colors:** Prefer semantic color names (primary, neutral) over specific shades
3. **Contrast ratios:** Maintain WCAG AA contrast ratios (4.5:1 for text) in both modes
4. **Explicit dark variants:** Use `dark:` prefix for dark mode-specific styles when needed

---

## 💡 Usage Examples

### Color Usage

```tsx
// Primary button
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Click Me
</button>

// Secondary/Accent button
<button className="bg-secondary-500 hover:bg-secondary-600 text-white">
  Urgent Action
</button>

// Neutral background with text
<div className="bg-neutral-50 text-neutral-900">
  <p>Content here</p>
</div>

// Success message
<div className="bg-success-50 border border-success-500 text-success-700">
  Success!
</div>

// Error message
<div className="bg-error-50 border border-error-500 text-error-700">
  Error occurred
</div>
```

### Typography Usage

```tsx
// Hero headline
<h1 className="text-display-xl font-bold">
  Welcome to Our Site
</h1>

// Section heading
<h2 className="text-h2 font-semibold">
  About Us
</h2>

// Body text
<p className="text-body text-neutral-700">
  This is standard body text with proper line height.
</p>

// Large body text
<p className="text-body-lg text-neutral-700">
  This is larger body text for emphasis.
</p>

// Label
<label className="text-label font-semibold text-neutral-700">
  Email Address
</label>
```

### Spacing Usage

```tsx
// Component with padding
<div className="p-6 bg-white rounded-lg">
  Content
</div>

// Section with vertical spacing
<section className="py-16">
  <h2 className="mb-6">Section Title</h2>
  <p className="mb-4">Paragraph 1</p>
  <p className="mb-4">Paragraph 2</p>
</section>

// Grid with gap
<div className="grid grid-cols-3 gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Flexbox with gap
<div className="flex gap-4">
  <button>Button 1</button>
  <button>Button 2</button>
</div>
```

### Combined Example

```tsx
// Card component
<div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200">
  <h3 className="text-h3 font-semibold text-neutral-900 mb-4">
    Card Title
  </h3>
  <p className="text-body text-neutral-700 mb-6">
    Card description goes here.
  </p>
  <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-md font-medium">
    Learn More
  </button>
</div>
```

---

## 📐 Implementation Guidelines

### Do's ✅

1. **Use design system colors:** Always use `primary-*`, `secondary-*`, `neutral-*` colors
2. **Follow typography scale:** Use predefined text sizes (`text-h1`, `text-body`, etc.)
3. **Consistent spacing:** Use spacing tokens (multiples of 4px)
4. **Semantic HTML:** Use proper HTML tags (`<h1>`, `<p>`, etc.) to leverage global styles
5. **Dark mode support:** Always consider dark mode when building components
6. **Accessibility:** Maintain WCAG AA contrast ratios (4.5:1 for text)

### Don'ts ❌

1. **Don't use arbitrary colors:** Avoid hard-coded hex colors outside the system
2. **Don't create custom font sizes:** Stick to the defined typography scale
3. **Don't use arbitrary spacing:** Use spacing tokens instead of arbitrary values
4. **Don't skip dark mode:** Always test components in both light and dark modes
5. **Don't ignore accessibility:** Ensure sufficient color contrast

---

## 🔗 Quick Reference

### Most Used Colors

- **Primary:** `bg-primary-500`, `text-primary-600`
- **Secondary:** `bg-secondary-500`, `text-secondary-600`
- **Background:** `bg-neutral-50`
- **Text:** `text-neutral-900`
- **Borders:** `border-neutral-200`

### Most Used Typography

- **Hero:** `text-display-xl font-bold`
- **Heading:** `text-h2 font-semibold`
- **Body:** `text-body` (default on `<p>`)
- **Label:** `text-label font-semibold`

### Most Used Spacing

- **Component Padding:** `p-6` (24px)
- **Section Padding:** `py-16` (64px vertical)
- **Element Margin:** `mb-6` (24px)
- **Gap:** `gap-6` (24px)

---

## 📚 Related Documentation

- **Design Guidelines:** See `DESIGN_GUIDELINES.md` for detailed design system documentation
- **Component Library:** See component documentation for reusable components
- **Wireframes:** See `design.md` for page layout wireframes

---

## ✅ Foundation Complete

This foundation system is now ready for:
- ✅ Component development
- ✅ Page integration
- ✅ Consistent styling across the application

**Next Steps:** Proceed with component building using this foundation system.

---

**Last Updated:** Foundation System v1.0.0  
**Status:** Complete and Ready for Use

