# AR Carrier Xpress - Next.js Migration Guide

## 🚀 Setting Up the Modern Next.js Version

This guide will help you create a modern, professional Next.js version of the AR Carrier Xpress website using shadcn/ui components.

---

## Step 1: Create Next.js Project

```bash
# Using pnpm (recommended)
pnpm create next-app@latest ar-carrier-nextjs

# OR using npm
npx create-next-app@latest ar-carrier-nextjs

# OR using yarn
yarn create next-app ar-carrier-nextjs
```

### Configuration Options:
When prompted, select:
- ✅ TypeScript: **Yes**
- ✅ ESLint: **Yes**
- ✅ Tailwind CSS: **Yes**
- ✅ `src/` directory: **Yes**
- ✅ App Router: **Yes**
- ✅ Import alias: **@/\***

---

## Step 2: Install shadcn/ui

```bash
cd ar-carrier-nextjs

# Initialize shadcn/ui
pnpm dlx shadcn@latest init
```

### shadcn Configuration:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

---

## Step 3: Add Essential Components

```bash
# Add commonly used components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add slider
```

---

## Step 4: Install Additional Dependencies

```bash
# React Icons (for Font Awesome style icons)
pnpm add react-icons

# Form handling
pnpm add react-hook-form zod @hookform/resolvers

# Animation
pnpm add framer-motion

# Next themes (for dark mode support if needed)
pnpm add next-themes
```

---

## Step 5: Project Structure

```
ar-carrier-nextjs/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with navigation
│   │   ├── page.tsx            # Homepage
│   │   ├── pay-rates/
│   │   │   └── page.tsx        # Pay rates page
│   │   ├── apply/
│   │   │   └── page.tsx        # Application page
│   │   ├── testimonials/
│   │   │   └── page.tsx        # Reviews page
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MobileMenu.tsx
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── StatsSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   └── TestimonialsPreview.tsx
│   │   ├── pay/
│   │   │   ├── PayRatesCard.tsx
│   │   │   ├── BenefitsCard.tsx
│   │   │   └── CompensationTable.tsx
│   │   └── application/
│   │       ├── ApplicationForm.tsx
│   │       └── MultiStepForm.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   └── types/
│       └── index.ts
│
├── public/
│   ├── images/
│   │   └── ar-carrier-logo.png
│   └── favicon.ico
│
└── package.json
```

---

## Step 6: Key Files to Create

### 1. `src/lib/constants.ts`
```typescript
export const COMPANY_INFO = {
  name: "AR Carrier Xpress",
  location: "Kent, WA",
  phone: "(206) 555-1234",
  email: "info@arcarrierxpress.com",
  dot: "1234567",
  mc: "123456",
} as const;

export const STATS = {
  yearsInBusiness: 15,
  trucksInFleet: 50,
  activeDrivers: 75,
  statesCovered: 5,
} as const;

export const PAY_RATES = {
  ownerOperator: {
    commission: "90-92%",
    annualGross: "$120K-$180K",
    fuelSurcharge: "100%",
  },
  companyDriver: {
    regional: {
      starting: "$0.55-$0.60/mile",
      experienced: "$0.60-$0.70/mile",
      annual: "$65,000-$80,000",
    },
    local: {
      hourly: "$24-$32/hour",
      annual: "$55,000-$70,000",
    },
  },
} as const;
```

### 2. `src/types/index.ts`
```typescript
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  yearsWithCompany: number;
  rating: number;
  comment: string;
  image?: string;
}

export interface ApplicationFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Driving Experience
  driverType: "owner-operator" | "company-driver";
  cdlClass: string;
  experienceYears: string;
  cdlIssueDate: string;
  cdlExpirationDate: string;
  endorsements: string[];
  accidents: string;
  violations: string;
  
  // Preferences
  routeType: string;
  availability: string;
  comments?: string;
}
```

---

## Step 7: Create Homepage Component

### `src/app/page.tsx`
```typescript
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsPreview from "@/components/home/TestimonialsPreview";
import CTASection from "@/components/home/CTASection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TestimonialsPreview />
      <CTASection />
    </main>
  );
}
```

---

## Step 8: Example Hero Component

### `src/components/home/HeroSection.tsx`
```typescript
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FaTruck, FaHome, FaShieldAlt, FaClock } from "react-icons/fa";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-slate-50 to-slate-100 py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <Badge variant="secondary" className="mb-4">
              Based in Kent, WA
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
              Professional Trucking Careers in the{" "}
              <span className="bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
                Pacific Northwest
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              AR Carrier Xpress is a family-owned trucking company serving 
              Washington and surrounding states. We offer competitive pay, 
              modern equipment, and flexible routes for both owner operators 
              and company drivers.
            </p>
            
            {/* Key Benefits */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <BenefitCard icon={FaTruck} value="50+" label="Modern Trucks" />
              <BenefitCard icon={FaHome} value="Weekly" label="Home Time" />
              <BenefitCard icon={FaShieldAlt} value="DOT" label="Safety Compliant" />
              <BenefitCard icon={FaClock} value="24/7" label="Dispatch Support" />
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg">
                <Link href="/apply">Apply Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pay-rates">View Pay Rates</Link>
              </Button>
            </div>
          </div>
          
          {/* Right Content - Image/Stats */}
          <div className="relative">
            {/* Add truck image or stats card here */}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ 
  icon: Icon, 
  value, 
  label 
}: { 
  icon: any; 
  value: string; 
  label: string; 
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center mb-2">
        <Icon className="text-blue-600 text-2xl mr-3" />
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
```

---

## Step 9: Run Development Server

```bash
pnpm dev
```

Visit: http://localhost:3000

---

## Benefits of This Approach

### 🚀 **Performance**
- Server-side rendering for faster initial loads
- Automatic code splitting
- Optimized images with Next.js Image component
- Better SEO

### 🎨 **Modern UI**
- shadcn/ui components (beautiful, accessible)
- Consistent design system
- Dark mode support (optional)
- Smooth animations

### 💪 **Better DX**
- TypeScript for type safety
- Component-based architecture
- Hot module reloading
- Better debugging

### 🔧 **Maintainability**
- Organized file structure
- Reusable components
- Centralized constants
- Easier to update and scale

---

## Migration Checklist

- [ ] Create Next.js project
- [ ] Install shadcn/ui
- [ ] Add essential components
- [ ] Create constants file
- [ ] Build layout components (Header, Footer)
- [ ] Migrate homepage
- [ ] Migrate pay rates page
- [ ] Migrate application form
- [ ] Migrate testimonials
- [ ] Add form validation
- [ ] Test all pages
- [ ] Deploy to Vercel

---

## Deployment

Deploy to Vercel (recommended for Next.js):

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## Next Steps

1. **Start with the layout** - Create Header and Footer components
2. **Build the homepage** - Convert the current index.html sections
3. **Add forms** - Use react-hook-form with zod validation
4. **Migrate pages one by one** - Pay rates → Application → Testimonials
5. **Add SEO metadata** - Use Next.js metadata API
6. **Test thoroughly** - Ensure all functionality works
7. **Deploy** - Push to production

---

**Your current HTML/CSS website has been improved, but a Next.js version will take it to the next level!** 🚀

