# Quick Reference Guide - AR Carrier Xpress Design System

## 🎨 Color Variables - Copy & Paste

### Primary Colors
```css
var(--primary)              /* Main brand color - Orange/Red */
var(--primary-foreground)   /* Text on primary */
var(--success)              /* Green - positive actions */
var(--success-foreground)   /* Text on success */
var(--warning)              /* Yellow - cautions */
var(--warning-foreground)   /* Text on warning */
var(--error)                /* Red - errors */
var(--error-foreground)     /* Text on error */
```

### Background Colors
```css
var(--background)           /* Page background */
var(--foreground)           /* Main text color */
var(--card)                 /* Card backgrounds */
var(--card-foreground)      /* Text on cards */
var(--muted)                /* Muted backgrounds */
var(--muted-foreground)     /* Secondary text */
```

### UI Elements
```css
var(--border)               /* Border colors */
var(--input)                /* Input borders */
var(--ring)                 /* Focus ring */
var(--radius)               /* Border radius (0.65rem) */
```

---

## 🧩 Component Classes - Quick Reference

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
```

### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-muted">Muted</span>
```

### Cards
```html
<div class="card p-6">Basic Card</div>
<div class="card card-shadow p-6">Card with Shadow</div>
```

### Inputs
```html
<input type="text" class="input" placeholder="Text">
```

### Gradients
```html
<div class="gradient-primary">Background Gradient</div>
<h1 class="gradient-text">Text Gradient</h1>
```

---

## 🎯 Utility Classes

### Background Colors
```html
<div class="bg-primary">Primary Background</div>
<div class="bg-secondary">Secondary Background</div>
<div class="bg-card">Card Background</div>
<div class="bg-muted">Muted Background</div>
<div class="bg-success">Success Background</div>
```

### Text Colors
```html
<p class="text-foreground">Normal Text</p>
<p class="text-muted-foreground">Muted Text</p>
<p class="text-primary">Primary Text</p>
<p class="text-success">Success Text</p>
```

### Border Radius
```html
<div class="rounded-default">0.65rem</div>
<div class="rounded-lg">0.975rem</div>
<div class="rounded-xl">1.3rem</div>
<div class="rounded-2xl">1.95rem</div>
```

---

## 🌙 Dark Mode Implementation

### HTML Setup
```html
<!-- Add to <body> -->
<button class="dark-mode-toggle" id="darkModeToggle" aria-label="Toggle Dark Mode">
    <i class="fas fa-moon"></i>
</button>
```

### JavaScript (Add before </body>)
```javascript
<script>
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;
    const icon = darkModeToggle.querySelector('i');
    
    // Check saved preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        html.classList.add('dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    
    // Toggle on click
    darkModeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        
        if (html.classList.contains('dark')) {
            localStorage.setItem('darkMode', 'enabled');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            localStorage.setItem('darkMode', 'disabled');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });
</script>
```

---

## 📝 Common Patterns

### Card with Header
```html
<div class="card p-6">
    <h3 class="text-xl font-bold mb-4">Card Title</h3>
    <p class="text-muted-foreground mb-4">Description text</p>
    <button class="btn btn-primary">Action</button>
</div>
```

### Badge with Icon
```html
<span class="badge badge-success">
    <i class="fas fa-check"></i>
    Active
</span>
```

### Button with Icon
```html
<button class="btn btn-primary">
    <i class="fas fa-arrow-right"></i>
    Continue
</button>
```

### Form Field
```html
<div>
    <label class="block text-sm font-medium mb-2">Email</label>
    <input type="email" class="input" placeholder="john@example.com">
</div>
```

### Gradient Hero Text
```html
<h1 class="text-5xl font-black">
    Welcome to <span class="gradient-text">AR Carrier Xpress</span>
</h1>
```

---

## 🎨 OKLCH Color Examples

### How to Create OKLCH Colors
```css
/* Format: oklch(Lightness Chroma Hue) */
oklch(0.5 0.2 180)    /* Mid-light, colorful, cyan */
oklch(0.8 0.15 120)   /* Light, medium-saturated, green */
oklch(0.3 0.18 30)    /* Dark, colorful, orange */

/* With alpha */
oklch(0.5 0.2 180 / 0.5)  /* 50% transparent */
oklch(0.8 0.15 120 / 0.8) /* 80% opaque */
```

### Lightness (L)
- `0.0` = Black
- `0.5` = Medium
- `1.0` = White

### Chroma (C)
- `0.0` = Grayscale
- `0.1` = Subtle color
- `0.3` = Vivid color

### Hue (H)
- `0°` = Red
- `120°` = Green
- `240°` = Blue

---

## 📱 Responsive Classes (Tailwind)

```html
<!-- Hidden on mobile, visible on desktop -->
<div class="hidden md:block">Desktop Only</div>

<!-- Full width on mobile, half on desktop -->
<div class="w-full md:w-1/2">Responsive Width</div>

<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col md:flex-row">Responsive Flex</div>
```

---

## 🔧 Customization Examples

### Custom Button Color
```css
.btn-custom {
    background-color: var(--warning);
    color: var(--warning-foreground);
}

.btn-custom:hover {
    background-color: oklch(0.75 0.17 65); /* Lighter warning */
}
```

### Custom Card Style
```css
.card-accent {
    background-color: var(--accent);
    color: var(--accent-foreground);
    border-left: 4px solid var(--primary);
}
```

### Custom Gradient
```css
.gradient-custom {
    background: linear-gradient(135deg, 
        var(--primary), 
        var(--success)
    );
}
```

---

## ⚡ Performance Tips

1. **Use CSS Variables:** Faster than inline styles
   ```html
   <!-- Good -->
   <div style="background: var(--primary)"></div>
   
   <!-- Better -->
   <div class="bg-primary"></div>
   ```

2. **Prefer Classes:** Reusable and cached
   ```html
   <!-- Good -->
   <button style="padding: 1rem; background: var(--primary)">

   <!-- Better -->
   <button class="btn btn-primary">
   ```

3. **Minimize Inline Styles:** Use utility classes instead

---

## 🎓 Learning Checklist

- [ ] Open `design-system.html` in browser
- [ ] Toggle dark mode
- [ ] Review all color options
- [ ] Test button variations
- [ ] Try badge styles
- [ ] Create a test card
- [ ] Build a form with inputs
- [ ] Test responsive behavior
- [ ] Read `DESIGN_SYSTEM_README.md`
- [ ] Check browser compatibility

---

## 🚀 New Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
    
    <!-- Required -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Your content here -->
    
    <!-- Dark Mode Toggle -->
    <button class="dark-mode-toggle" id="darkModeToggle" aria-label="Toggle Dark Mode">
        <i class="fas fa-moon"></i>
    </button>
    
    <!-- Dark Mode Script -->
    <script>
        const darkModeToggle = document.getElementById('darkModeToggle');
        const html = document.documentElement;
        const icon = darkModeToggle.querySelector('i');
        
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'enabled') {
            html.classList.add('dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        
        darkModeToggle.addEventListener('click', () => {
            html.classList.toggle('dark');
            
            if (html.classList.contains('dark')) {
                localStorage.setItem('darkMode', 'enabled');
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                localStorage.setItem('darkMode', 'disabled');
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
    </script>
</body>
</html>
```

---

## 📌 Bookmarks

- **Main Stylesheet:** `styles.css`
- **Visual Showcase:** `design-system.html`
- **Full Documentation:** `DESIGN_SYSTEM_README.md`
- **Implementation Guide:** `DESIGN_IMPLEMENTATION_SUMMARY.md`

---

## 💡 Pro Tips

1. **Always use CSS variables** instead of hard-coded colors
2. **Test both light and dark mode** when creating new components
3. **Use existing components** before creating new ones
4. **Check `design-system.html`** for inspiration
5. **Keep contrast ratios** above WCAG AA standards (4.5:1 for text)

---

## 🎯 Common Tasks

### Change Primary Color
Edit `styles.css` line 21:
```css
--primary: oklch(0.577 0.245 27.325);
```

### Add New Component Class
Add to `styles.css` in Components section:
```css
.my-component {
    background: var(--card);
    padding: 1rem;
    border-radius: var(--radius);
}
```

### Disable Dark Mode on Specific Page
Remove dark mode toggle and script from that page.

### Force Dark Mode
```javascript
document.documentElement.classList.add('dark');
```

---

*Quick reference for AR Carrier Xpress Design System - Keep this handy!*

