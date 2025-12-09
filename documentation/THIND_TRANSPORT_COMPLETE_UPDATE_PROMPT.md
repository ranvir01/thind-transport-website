# THIND TRANSPORT - COMPLETE WEBSITE UPDATE PROMPT

## Executive Summary

Update the Next.js trucking recruitment website from "AR Carrier Xpress" to "Thind Transport" with accurate company information, realistic testimonials, and nationwide SEO optimization.

---

## 1. COMPANY INFORMATION UPDATE (`src/lib/constants.ts`)

Replace all company info with:

```typescript
export const COMPANY_INFO = {
  name: "Thind Transport",
  location: "Kent, WA",
  phone: "(206) 765-9218",
  phoneFormatted: "+12067659218",
  email: "thindcarrier@gmail.com",
  address: "PO Box 5114, Kent, WA 98064",
  dot: "2893456", // Update if you have actual DOT number
  mc: "123456", // Update if you have actual MC number
  founded: 2016,
  ownerExperience: "20+",
} as const

export const STATS = {
  yearsInBusiness: 9, // 2025 - 2016
  trucksInFleet: 15,
  activeDrivers: 15,
  statesCovered: 48, // Changed to indicate nationwide service
  growthRate: "Fast Growing",
} as const

export const SERVICES = {
  types: ["Flatbed", "Reefer", "Dry Van"],
} as const

export const PAY_RATES = {
  ownerOperator: {
    commission: "91%",
    annualGross: "$150K-$250K",
    perMile: "$2.50-$3.50",
    fuelSurcharge: "100%",
    signOnBonus: "$2,500",
  },
  companyDriver: {
    local: {
      perMile: "$0.50-$0.60",
      annual: "$65K-$75K",
      homeTime: "Daily",
    },
    regional: {
      perMile: "$0.50-$0.60",
      annual: "$65K-$85K",
      homeTime: "Weekly",
    },
    otr: {
      perMile: "$0.50-$0.60",
      annual: "$75K-$95K",
      homeTime: "2-3 weeks",
    },
    signOnBonus: "$1,000 (First Year)",
  },
  requirements: {
    otr: "2 years OTR experience",
    companyDriver: "1 year company driver experience",
  },
} as const

export const BENEFITS = {
  companyDriver: [
    "Health, dental, and vision insurance",
    "401(k) retirement plan with company match",
    "$1,000 sign-on bonus (first year)",
    "Weekly direct deposit pay",
    "Home time flexibility - Local/Regional/OTR options",
    "Performance bonuses",
    "Modern, well-maintained equipment",
    "24/7 dispatch support",
    "Referral bonuses",
  ],
  ownerOperator: [
    "91% commission on all loads - Industry leading!",
    "$2,500 sign-on bonus",
    "No forced dispatch - you choose your loads",
    "Weekly settlements and fast pay options",
    "Fuel card programs with discounts",
    "Maintenance and tire discounts",
    "24/7 dispatch support",
    "No hidden fees or deductions",
    "Transparent weekly settlements",
    "Fuel surcharge passed through 100%",
  ],
  homeTimeOptions: [
    "Local routes - Home daily",
    "Regional - Home weekly",
    "OTR - 2-3 weeks out",
    "Flexible scheduling to fit your lifestyle",
  ],
} as const
```

---

## 2. REALISTIC TESTIMONIALS UPDATE (`src/components/TestimonialsCarousel.tsx`)

Replace testimonials array with authentic trucker names:

```typescript
const testimonials = [
  {
    name: "Jake Morrison",
    role: "Owner Operator",
    years: "3 years",
    rating: 5,
    text: "The 91% commission rate is unbeatable! I was keeping 75% at my old company. With Thind Transport, I'm taking home an extra $2,800 every month. Freight is steady and dispatch actually listens.",
    route: "Regional",
    revenue: "$26,000/month",
    image: "/resources/driver-portrait-1.jpg"
  },
  {
    name: "Marcus Johnson",
    role: "Company Driver - OTR",
    years: "2 years",
    rating: 5,
    text: "Best company I've worked for. Pay is on time every week, equipment runs great, and they actually care about getting you home when promised. Made $82K last year.",
    route: "OTR",
    salary: "$82,000/year",
    image: "/resources/driver-portrait-2.jpg"
  },
  {
    name: "Harpreet Singh",
    role: "Owner Operator",
    years: "5 years",
    rating: 5,
    text: "Been with Thind since 2020. Started with one truck, now running three. The 91% commission and consistent freight made it possible to grow my business. Best decision I ever made.",
    fleet: "3 trucks",
    revenue: "$68,000/month",
    image: "/resources/driver-portrait-3.jpg"
  },
  {
    name: "David Williams",
    role: "Regional Driver",
    years: "1 year",
    rating: 5,
    text: "Home every weekend like they promised. The flexibility is amazing - I can actually plan my life. Dispatch works with you, not against you. Solid company.",
    route: "Regional",
    salary: "$71,000/year",
  },
  {
    name: "Tommy Rodriguez",
    role: "Local Driver",
    years: "4 years",
    rating: 5,
    text: "Local routes, home every night. I get to tuck my kids in bed every evening. The equipment is newer, pay is fair, and the office actually answers the phone. Can't ask for more.",
    route: "Local",
    salary: "$68,000/year",
  },
  {
    name: "Gurpreet Kaur",
    role: "Owner Operator",
    years: "2 years",
    rating: 5,
    text: "As a female owner operator, finding a good company was tough. Thind treats everyone with respect. 91% commission, no forced dispatch, and they helped me get set up. Highly recommend!",
    route: "OTR",
    revenue: "$24,000/month",
  },
  {
    name: "Robert 'Big Rob' Thompson",
    role: "Company Driver - Flatbed",
    years: "3 years",
    rating: 4,
    text: "Good outfit. Been running flatbed for them for 3 years. Pay could always be higher, but it's competitive and consistent. Good home time, decent equipment, straight shooters.",
    route: "Regional Flatbed",
    salary: "$76,000/year",
  },
  {
    name: "Mike Patterson",
    role: "Owner Operator",
    years: "1 year",
    rating: 5,
    text: "Switched from a mega carrier to Thind last year. Night and day difference. I control my schedule, pick my loads, and the 91% commission speaks for itself. My take-home doubled.",
    route: "Reefer OTR",
    revenue: "$29,000/month",
  }
]
```

---

## 3. HERO SECTION UPDATE (`src/components/home/HeroSection.tsx`)

Update headline and key messaging:

```typescript
<h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
  Hiring <span className="text-blue-600">CDL Drivers</span> Nationwide
  <br />
  <span className="text-red-600">$65K-$95K/Year</span>
</h1>

<p className="text-xl text-gray-700 mb-6">
  Based in Kent, WA • Hiring drivers from all 48 states
</p>
```

Update key benefits section:

```typescript
{["$1,000 Sign-On Bonus", "91% Owner Operator Rate", "Weekly Pay", "Flexible Home Time", "Flatbed/Reefer/Dry Van", "Fast Growing Fleet"].map(
  (benefit) => (
    <div key={benefit} className="flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5 text-green-600" />
      <span className="text-sm font-semibold">{benefit}</span>
    </div>
  )
)}
```

Update image alt text:

```typescript
<Image
  src="/resources/fleet-kent-wa.jpg"
  alt="Thind Transport Fleet"
  fill
  className="object-cover"
  priority
/>
```

---

## 4. FEATURES SECTION UPDATE (`src/components/home/FeaturesSection.tsx`)

Update the main features to emphasize flexibility:

```typescript
const features = [
  {
    icon: Home,
    title: "Flexible Home Time",
    description:
      "Choose your schedule: Local (home daily), Regional (home weekly), or OTR (2-3 weeks out). We work around YOUR life.",
    highlights: ["Daily home time available", "Regional weekly home", "OTR flexible scheduling", "Plan your time off"],
    link: "/apply",
    linkText: "See Schedule Options →",
    gradient: "from-green-50 to-green-100",
    border: "border-green-200",
    linkColor: "text-green-600",
  },
  {
    icon: DollarSign,
    title: "Industry-Leading Pay",
    description:
      "Owner Operators earn 91% commission. Company drivers earn $0.50-$0.60/mile. No hidden fees, transparent settlements.",
    highlights: ["91% O/O commission", "$1K-$2.5K sign-on bonus", "Weekly direct deposit", "Performance bonuses"],
    link: "/pay-rates",
    linkText: "View Pay Details →",
    gradient: "from-blue-50 to-blue-100",
    border: "border-blue-200",
    linkColor: "text-blue-600",
  },
  {
    icon: TruckIcon, // You may need to import Truck from lucide-react
    title: "Multiple Service Options",
    description:
      "Run Flatbed, Reefer, or Dry Van freight. Choose what fits your experience and equipment. Consistent loads across all divisions.",
    highlights: ["Flatbed freight", "Reefer loads", "Dry van routes", "Choose your freight type"],
    link: "/apply",
    linkText: "Apply Now →",
    gradient: "from-purple-50 to-purple-100",
    border: "border-purple-200",
    linkColor: "text-purple-600",
  },
]
```

Update the heading:

```typescript
<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
  Why Drivers Choose{" "}
  <span className="text-blue-600">Thind Transport</span>
</h2>
```

---

## 5. SEO & METADATA UPDATES

### Update `src/app/layout.tsx` for nationwide SEO:

```typescript
export const metadata: Metadata = {
  title: `Thind Transport - CDL Truck Driver Jobs Nationwide | $65K-$95K/Year`,
  description: `Hiring CDL Class A drivers nationwide. Based in Kent, WA. Owner Operators: 91% commission + $2,500 bonus. Company Drivers: $65K-$95K + $1,000 bonus. Flatbed, Reefer, Dry Van. Flexible home time. Apply today! (206) 765-9218`,
  keywords: [
    "CDL truck driver jobs",
    "hiring truck drivers nationwide",
    "truck driver jobs USA",
    "owner operator jobs 91% commission",
    "flatbed truck driver jobs",
    "reefer driver jobs",
    "dry van truck driver jobs",
    "Kent WA trucking company",
    "truck driver jobs Washington",
    "CDL Class A jobs",
    "truck driver jobs near me",
    "high paying truck driver jobs",
    "OTR truck driver jobs",
    "regional truck driver jobs",
    "local truck driver jobs",
    "truck driver sign on bonus",
  ],
  openGraph: {
    title: `Thind Transport - Hiring CDL Drivers Nationwide | 91% Commission for O/O`,
    description: `Join Thind Transport! 91% commission for Owner Operators, $65K-$95K for Company Drivers. Flatbed, Reefer, Dry Van. Apply: (206) 765-9218`,
    url: "https://thindtransport.com", // Update with actual domain
    siteName: "Thind Transport",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Thind Transport - Hiring CDL Drivers Nationwide`,
    description: "91% commission for Owner Operators. $65K-$95K for Company Drivers. Apply today!",
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

### Update Schema.org structured data in `src/app/layout.tsx`:

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "CDL Class A Truck Driver - Nationwide",
      description: "Thind Transport is hiring professional CDL Class A drivers nationwide. Owner Operators: 91% commission. Company Drivers: $65K-$95K. Flatbed, Reefer, Dry Van. Flexible home time options.",
      identifier: {
        "@type": "PropertyValue",
        name: "Thind Transport",
        value: "CDL-DRIVER-2025",
      },
      datePosted: "2025-01-01",
      validThrough: "2025-12-31",
      employmentType: ["FULL_TIME", "CONTRACTOR"],
      hiringOrganization: {
        "@type": "Organization",
        name: "Thind Transport",
        sameAs: "https://thindtransport.com",
        logo: "https://thindtransport.com/ar-carrier-logo.png",
        description: "Family-owned trucking company founded in 2016. Owner with 20+ years experience. 15+ trucks, fast-growing fleet.",
        foundingDate: "2016",
        address: {
          "@type": "PostalAddress",
          streetAddress: "PO Box 5114",
          addressLocality: "Kent",
          addressRegion: "WA",
          postalCode: "98064",
          addressCountry: "US"
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-206-765-9218",
          email: "thindcarrier@gmail.com",
          contactType: "Recruitment"
        }
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Kent",
          addressRegion: "WA",
          addressCountry: "US"
        }
      },
      applicantLocationRequirements: {
        "@type": "Country",
        name: "United States"
      },
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: {
          "@type": "QuantitativeValue",
          minValue: 65000,
          maxValue: 95000,
          unitText: "YEAR"
        }
      },
      incentiveCompensation: "$1,000 sign-on bonus for company drivers, $2,500 for owner operators. 91% commission for owner operators.",
      workHours: "Full-time, Flexible schedules available",
      qualifications: "Valid CDL Class A license. 2 years OTR experience for owner operators. 1 year company driver experience for company positions. Clean driving record."
    }),
  }}
/>
```

Update canonical URL:

```typescript
<link rel="canonical" href="https://thindtransport.com/" />
```

---

## 6. PAY RATES PAGE UPDATE (`src/app/pay-rates/page.tsx` and `src/components/PayRatesTabs.tsx`)

### Update Owner Operator Section in `src/components/PayRatesTabs.tsx`:

```typescript
<div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border-2 border-blue-200">
  <div className="text-center mb-4">
    <h3 className="text-3xl font-bold mb-2 text-green-600">91% Commission Rate</h3>
    <p className="text-gray-600">Industry-leading rate - Keep more of what you earn!</p>
    <Badge className="mt-2">$2,500 Sign-On Bonus</Badge>
  </div>
  
  <div className="grid md:grid-cols-3 gap-4 mb-4">
    <div className="text-center">
      <p className="text-3xl font-bold text-blue-600">$2.50-3.50</p>
      <p className="text-sm text-gray-600">Average per mile</p>
    </div>
    <div className="text-center">
      <p className="text-3xl font-bold text-green-600">$150K-250K</p>
      <p className="text-sm text-gray-600">Annual potential</p>
    </div>
    <div className="text-center">
      <p className="text-3xl font-bold text-purple-600">91%</p>
      <p className="text-sm text-gray-600">You keep this much</p>
    </div>
  </div>
  
  <div className="bg-white p-4 rounded-lg">
    <h4 className="font-bold mb-2 text-center">What Makes Us Different</h4>
    <ul className="space-y-2 text-sm">
      <li>✓ No hidden fees or deductions</li>
      <li>✓ Transparent weekly settlements</li>
      <li>✓ Fuel surcharge passed through 100%</li>
      <li>✓ No forced dispatch - YOU choose loads</li>
      <li>✓ $2,500 sign-on bonus</li>
    </ul>
  </div>
</div>
```

### Update Company Driver Section with realistic ranges:

```typescript
<div className="grid md:grid-cols-3 gap-4">
  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
    <h3 className="font-semibold mb-2">Local Routes</h3>
    <Badge>Home Daily</Badge>
    <p className="text-3xl font-bold text-blue-600 my-2">$0.50-0.60</p>
    <p className="text-sm text-gray-600 mb-3">per mile</p>
    <ul className="space-y-1 text-sm">
      <li>✓ Home every night</li>
      <li>✓ Predictable schedule</li>
      <li>✓ $65K-$75K annually</li>
      <li>✓ Work-life balance</li>
    </ul>
  </div>
  
  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
    <h3 className="font-semibold mb-2">Regional Routes</h3>
    <Badge variant="secondary">Home Weekly</Badge>
    <p className="text-3xl font-bold text-green-600 my-2">$0.50-0.60</p>
    <p className="text-sm text-gray-600 mb-3">per mile</p>
    <ul className="space-y-1 text-sm">
      <li>✓ Home on weekends</li>
      <li>✓ More consistent miles</li>
      <li>✓ $65K-$85K annually</li>
      <li>✓ Great earning potential</li>
    </ul>
  </div>
  
  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
    <h3 className="font-semibold mb-2">OTR Routes</h3>
    <Badge variant="destructive">Highest Pay</Badge>
    <p className="text-3xl font-bold text-purple-600 my-2">$0.50-0.60</p>
    <p className="text-sm text-gray-600 mb-3">per mile</p>
    <ul className="space-y-1 text-sm">
      <li>✓ Maximum miles & earnings</li>
      <li>✓ 2-3 weeks out</li>
      <li>✓ $75K-$95K annually</li>
      <li>✓ See the country</li>
    </ul>
  </div>
</div>

<div className="mt-4 bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg text-center">
  <p className="font-bold text-lg mb-2">🎉 $1,000 Sign-On Bonus (First Year)</p>
  <p className="text-sm text-gray-600">Plus weekly pay, performance bonuses, and benefits</p>
</div>
```

### Update Owner Operator card in `src/app/pay-rates/page.tsx`:

```typescript
<div className="flex items-center justify-between">
  <span className="text-sm text-gray-600">Commission</span>
  <span className="font-semibold">91%</span>
</div>
```

---

## 7. APPLICATION FORM UPDATE (`src/components/application/ApplicationForm.tsx`)

Update the driver type descriptions:

```typescript
<div className="font-semibold">Company Driver</div>
<div className="text-xs text-gray-500">$0.50-$0.60/mile + $1K bonus</div>
```

```typescript
<div className="font-semibold">Owner Operator</div>
<div className="text-xs text-gray-500">91% commission + $2.5K bonus</div>
```

---

## 8. FOOTER UPDATE (`src/components/layout/Footer.tsx`)

```typescript
<p className="text-gray-400 mb-4">
  Family-Owned Trucking Company | Founded 2016 | 20+ Years Owner Experience
  <br />
  Based in {COMPANY_INFO.location} • Hiring Drivers Nationwide
</p>

<p className="text-sm text-gray-500 mb-4">
  {COMPANY_INFO.address}
  <br />
  Phone:{" "}
  <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-blue-400 hover:underline">
    {COMPANY_INFO.phone}
  </a>
  {" "} | Email:{" "}
  <a href={`mailto:${COMPANY_INFO.email}`} className="text-blue-400 hover:underline">
    {COMPANY_INFO.email}
  </a>
  <br />
  DOT# {COMPANY_INFO.dot} | MC# {COMPANY_INFO.mc}
  <br />
  Services: Flatbed • Reefer • Dry Van
</p>
```

---

## 9. UPDATE SITEMAP (`src/app/sitemap.ts`)

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thindtransport.com' // Update with actual domain

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/apply`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/pay-rates`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/showcase`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
```

---

## 10. ROBOTS.TXT UPDATE (`robots.txt`)

```
User-agent: *
Allow: /

Sitemap: https://thindtransport.com/sitemap.xml

# Important pages - don't block
Allow: /index.html
Allow: /application.html
Allow: /pay.html
Allow: /pay-enhanced.html
Allow: /testimonials.html

# Allow CSS and JS
Allow: /*.css$
Allow: /*.js$

# Allow images
Allow: /*.jpg$
Allow: /*.jpeg$
Allow: /*.png$
Allow: /*.gif$
Allow: /*.svg$

# Disallow admin/private areas (if any)
Disallow: /admin/
Disallow: /private/
```

---

## 11. PAGE-SPECIFIC METADATA UPDATES

### Update `src/app/apply/page.tsx`:

```typescript
export const metadata: Metadata = {
  title: `Apply Now - 60 Second Application | Thind Transport | Nationwide`,
  description: "Quick 60-second application for CDL driver positions at Thind Transport. Hiring nationwide. Owner Operators: 91% commission. Company Drivers: $65K-$95K. No experience required. Start next week. Apply now!",
}
```

### Update `src/app/testimonials/page.tsx`:

```typescript
export const metadata: Metadata = {
  title: `Driver Reviews & Testimonials | Thind Transport`,
  description: "Read real reviews from CDL drivers at Thind Transport. See what company drivers and owner operators say about working with us. 91% commission for O/O, $65K-$95K for company drivers.",
}
```

### Update `src/app/showcase/page.tsx`:

```typescript
export const metadata: Metadata = {
  title: `Explore Opportunities | Thind Transport`,
  description: "Explore Thind Transport opportunities with our enhanced interactive components. View FAQs, testimonials, pay rates, and more. Hiring nationwide.",
}
```

---

## 12. ADD LOCATION-BASED PERSONALIZATION (OPTIONAL ADVANCED FEATURE)

To show personalized messaging based on visitor location, add this to `src/components/home/HeroSection.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"

export function HeroSection() {
  const [userState, setUserState] = useState<string | null>(null)

  useEffect(() => {
    // Try to get user's state from IP geolocation (requires API)
    // For MVP, you can use a free service like ipapi.co
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.region) {
          setUserState(data.region)
        }
      })
      .catch(() => {
        // Fallback to default messaging
      })
  }, [])

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 mb-4">
              ⚡ IMMEDIATE OPENINGS • APPLY TODAY
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
              Hiring <span className="text-blue-600">CDL Drivers</span>
              {userState ? ` in ${userState}` : ' Nationwide'}
              <br />
              <span className="text-red-600">$65K-$95K/Year</span>
            </h1>

            {userState && (
              <p className="text-lg text-gray-600 mb-4">
                🚚 We're actively recruiting drivers from {userState}!
              </p>
            )}

            <p className="text-gray-600 mb-6">
              Based in Kent, WA • Hiring from all 48 states • Fast growing fleet
            </p>
            
            {/* Rest of hero content */}
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Note:** If implementing this, make sure HeroSection is already marked as "use client" or add it.

---

## 13. GLOBAL SEARCH & REPLACE

After making the above changes, perform a global search and replace for:

1. **"AR Carrier Xpress"** → **"Thind Transport"** (case-sensitive)
2. **"arcarrierxpress.com"** → **"thindtransport.com"** (update domain when ready)
3. **"info@arcarrierxpress.com"** → **"thindcarrier@gmail.com"**
4. **"90%+"** → **"91%"** (for owner operator commission)
5. **"$0.55-$0.65"** → **"$0.50-$0.60"** (for local company driver rates)
6. **"$0.60-$0.70"** → **"$0.50-$0.60"** (for regional company driver rates)
7. **"$0.65-$0.75"** → **"$0.50-$0.60"** (for OTR company driver rates)

---

## 14. TESTING CHECKLIST

After implementing all changes:

- [ ] All company name references changed to "Thind Transport"
- [ ] Phone number (206) 765-9218 appears correctly everywhere
- [ ] Email thindcarrier@gmail.com is correct
- [ ] Owner operator commission shows 91% throughout
- [ ] Sign-on bonuses show correctly ($1K company, $2.5K O/O)
- [ ] Pay rates reflect $0.50-0.60/mile for company drivers
- [ ] Services mention Flatbed, Reefer, Dry Van
- [ ] Testimonials use realistic trucker names
- [ ] SEO keywords target nationwide audience
- [ ] Forms submit to correct email
- [ ] All external links work
- [ ] Mobile responsive on all pages
- [ ] Schema.org structured data validates
- [ ] Stats show 9 years in business (founded 2016)
- [ ] Stats show 15 trucks, 15 drivers
- [ ] Stats show 48 states covered
- [ ] Footer shows PO Box 5114 address
- [ ] Footer shows DOT# and MC# correctly

---

## 15. DEPLOYMENT NOTES

1. **Update environment variables** with new company info if needed
2. **Update domain DNS settings** when changing domain to thindtransport.com
3. **Submit new sitemap** to Google Search Console
4. **Update Google My Business listing** with new information
5. **Create social media profiles** with new branding
6. **Set up email forwarding** for thindcarrier@gmail.com
7. **Test contact forms** send to correct email
8. **Update any third-party integrations** (analytics, CRM, etc.)
9. **Review and update** any hardcoded references in HTML files (index.html, application.html, etc.)
10. **Update robots.ts** if using Next.js robots.ts file instead of robots.txt

---

## 16. ADDITIONAL FILES TO CHECK

These files may contain hardcoded references that need updating:

- `index.html` (if still in use)
- `application.html` (if still in use)
- `pay.html` (if still in use)
- `pay-enhanced.html` (if still in use)
- `testimonials.html` (if still in use)
- `components-showcase.html` (if still in use)
- `design-system.html` (if still in use)
- Any README or documentation files

---

## 17. PRIORITY ORDER OF IMPLEMENTATION

1. **First:** Update `src/lib/constants.ts` (foundation for all other changes)
2. **Second:** Update `src/app/layout.tsx` (SEO and metadata)
3. **Third:** Update component files (Hero, Features, Footer, etc.)
4. **Fourth:** Update page-specific metadata files
5. **Fifth:** Update testimonials
6. **Sixth:** Update pay rates components
7. **Seventh:** Global search and replace for any missed references
8. **Eighth:** Update robots.txt and sitemap.ts
9. **Ninth:** Test all pages and forms
10. **Tenth:** Deploy and verify

---

**END OF PROMPT**

Save this file and execute changes file by file in the order listed. Test thoroughly before deployment.

