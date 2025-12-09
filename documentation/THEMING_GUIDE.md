# Theming Guide - AR Carrier Xpress

## Overview

The website now uses a modern CSS theming system with CSS variables and the **oklch color format**. This provides:

- **Better color consistency** across the website
- **Perceptually uniform colors** (oklch is more visually accurate than hex/rgb)
- **Easy maintenance** - change colors in one place
- **Professional design system** following modern web standards
- **Scalability** - easily add new color variations

## What Changed

### Before
```css
/* Old approach - hardcoded hex colors scattered throughout */
background: #1e40af;
color: #dc2626;
border: #10b981;
```

### After
```css
/* New approach - semantic CSS variables with oklch colors */
background-color: var(--primary);
color: var(--secondary);
border-color: var(--accent);
```

## Color System

### Color Format: oklch()

We use the **oklch color space** which offers:
- **L** (Lightness): 0-1 (0 = black, 1 = white)
- **C** (Chroma): 0-0.4 (saturation/vividness)
- **H** (Hue): 0-360 (color angle)

Example: `oklch(0.45 0.15 250)` = Rich blue with 45% lightness, 15% saturation, at 250° hue

### Primary Colors

| Variable | Color | Usage |
|----------|-------|-------|
| `--primary` | Rich Blue | Company branding, primary buttons, links |
| `--secondary` | Bold Red | Urgency, warnings, secondary CTAs |
| `--accent` | Vibrant Green | Main CTA buttons, success messages |
| `--warning` | Bright Orange | Urgent badges, limited-time offers |
| `--success` | Success Green | Confirmations, positive feedback |

### Neutral Colors

| Variable | Usage |
|----------|-------|
| `--background` | Page background (white) |
| `--foreground` | Main text color (near black) |
| `--muted` | Subtle backgrounds |
| `--muted-foreground` | Secondary text |
| `--border` | Default border color |
| `--input` | Input field borders |

### Component Colors

| Variable | Usage |
|----------|-------|
| `--card` | Card backgrounds |
| `--card-foreground` | Text on cards |
| `--popover` | Popup/modal backgrounds |
| `--destructive` | Error messages, delete actions |

## Using the Theme

### Background and Foreground Convention

Colors follow a `background` / `foreground` pattern:

```html
<!-- Primary blue background with white text -->
<div class="bg-primary">
  This text is automatically white
</div>

<!-- Accent green background with white text -->
<button class="bg-accent">
  Apply Now
</button>
```

### Utility Classes

#### Typography Colors
```html
<span class="text-primary">Blue text</span>
<span class="text-secondary">Red text</span>
<span class="text-accent">Green text</span>
<span class="text-muted">Gray text</span>
<span class="text-success">Success green</span>
<span class="text-warning">Warning orange</span>
```

#### Backgrounds
```html
<div class="bg-primary">Primary blue background</div>
<div class="bg-secondary">Secondary red background</div>
<div class="bg-accent">Accent green background</div>
<div class="bg-muted">Subtle gray background</div>
<div class="bg-card">Card background</div>
```

#### Borders
```html
<div class="border">Default border</div>
<div class="border border-primary">Blue border</div>
<div class="border border-accent">Green border</div>
```

### Pre-built Components

#### Buttons
```html
<!-- Primary button (blue) -->
<button class="btn btn-primary">Click Me</button>

<!-- Accent button (green) - for main CTAs -->
<button class="btn btn-accent">Apply Now</button>

<!-- Secondary button (red) -->
<button class="btn btn-secondary">Urgent Action</button>

<!-- Warning button (orange) -->
<button class="btn btn-warning">Limited Time</button>
```

#### Badges
```html
<!-- Primary badge -->
<span class="badge badge-primary">Most Popular</span>

<!-- Accent badge -->
<span class="badge badge-accent">Higher Earnings</span>

<!-- Urgent badge (animated) -->
<span class="badge badge-urgent">🔥 HIRING NOW</span>

<!-- Warning badge -->
<span class="badge badge-warning">Limited Spots</span>
```

#### Cards
```html
<!-- Basic card -->
<div class="card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

<!-- Hoverable card -->
<div class="card card-hover">
  <h3>Interactive Card</h3>
  <p>Lifts up on hover</p>
</div>
```

#### Form Inputs
```html
<input type="text" class="input" placeholder="Enter text">
<textarea class="input" placeholder="Enter message"></textarea>
<select class="input">
  <option>Choose option</option>
</select>
```

#### Trust Badges
```html
<div class="trust-badge">
  <i class="fas fa-check-circle text-success"></i>
  <span>DOT Compliant</span>
</div>
```

#### Social Proof
```html
<div class="social-proof">
  <i class="fas fa-users"></i>
  <span>12 drivers applied today</span>
</div>
```

### Special Sections

#### Hero Section
```html
<section class="hero-gradient">
  <!-- Subtle gradient background optimized for hero sections -->
</section>
```

#### Urgency Section
```html
<section class="urgency-section">
  <!-- Red gradient for urgent messages -->
</section>
```

#### CTA Section
```html
<section class="cta-section">
  <!-- Blue to red gradient for call-to-action sections -->
</section>
```

## Customizing Colors

To change the color scheme, edit the `:root` variables in `theme.css`:

```css
:root {
  /* Change primary color from blue to another color */
  --primary: oklch(0.45 0.15 250); /* Blue */
  
  /* To change to purple: */
  --primary: oklch(0.45 0.15 280); /* Purple */
  
  /* To change to teal: */
  --primary: oklch(0.45 0.15 200); /* Teal */
}
```

### oklch Color Picker Tools

- [oklch.com](https://oklch.com/) - Interactive color picker
- [oklch.evilmartians.io](https://oklch.evilmartians.io/) - Color space explorer

## Adding New Colors

To add a custom color:

1. **Define the variable in `theme.css`:**
```css
:root {
  --info: oklch(0.55 0.18 220); /* Blue info color */
  --info-foreground: oklch(0.99 0 0); /* White text */
}
```

2. **Add to theme inline block:**
```css
@theme inline {
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
}
```

3. **Create utility classes:**
```css
.bg-info {
  background-color: var(--info);
  color: var(--info-foreground);
}

.text-info {
  color: var(--info);
}

.btn-info {
  background-color: var(--info);
  color: var(--info-foreground);
}
```

4. **Use in HTML:**
```html
<button class="btn btn-info">Info Button</button>
<span class="text-info">Info text</span>
```

## Shadows

Pre-defined shadow levels:

```html
<div class="shadow-sm">Subtle shadow</div>
<div class="shadow">Default shadow</div>
<div class="shadow-md">Medium shadow</div>
<div class="shadow-lg">Large shadow</div>
<div class="shadow-xl">Extra large shadow</div>
```

## Border Radius

Consistent border radius values:

```html
<div class="rounded-sm">Small radius</div>
<div class="rounded">Default radius</div>
<div class="rounded-md">Medium radius</div>
<div class="rounded-lg">Large radius</div>
<div class="rounded-xl">Extra large radius</div>
```

## Animations

Pre-built animations:

```html
<!-- Fade in animation -->
<div class="animate-fade-in">Content fades in</div>

<!-- Slide up animation -->
<div class="animate-slide-up">Content slides up</div>
```

## Benefits of This System

### 1. Consistency
All colors are defined in one place, ensuring visual consistency across the entire website.

### 2. Maintainability
Change a color once in `theme.css` and it updates everywhere automatically.

### 3. Accessibility
oklch provides better perceptual uniformity, making it easier to create accessible color combinations.

### 4. Scalability
Easy to add new color variations without touching existing code.

### 5. Modern Standards
Follows modern CSS best practices used by design systems like shadcn/ui, Tailwind CSS, and Material Design.

### 6. Browser Support
oklch is supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 15.4+).

## Migration Notes

The website has been updated to use this theming system:

- ✅ `index.html` - Homepage
- ✅ `application.html` - Application form
- ✅ `pay.html` - Pay rates page
- ✅ `theme.css` - Central theme file

Other pages can be updated similarly by:
1. Adding `<link rel="stylesheet" href="theme.css">` to the `<head>`
2. Replacing hardcoded colors with theme classes
3. Using semantic component classes (btn, card, badge, etc.)

## Support

For questions or customization help, refer to:
- [CSS Variables MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [oklch Color Space](https://oklch.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

