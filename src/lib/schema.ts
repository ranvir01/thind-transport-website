// Structured Data / Schema.org helpers for SEO

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Thind Transport LLC",
  "alternateName": "Thind Transport",
  "url": "https://thindtransport.com",
  "logo": "https://thindtransport.com/ar-carrier-logo.png",
  "description": "Family-owned trucking company offering 91% gross commission for owner operators. Based in Kent, WA since 2016.",
  "foundingDate": "2016",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Kent",
    "addressLocality": "Kent",
    "addressRegion": "WA",
    "postalCode": "98032",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-206-765-6300",
    "contactType": "sales",
    "email": "thindcarrier@gmail.com",
    "availableLanguage": ["English"]
  },
  "sameAs": [
    "https://www.safer.fmcsa.dot.gov/CompanySnapshot.aspx"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "272",
    "bestRating": "5",
    "worstRating": "1"
  }
}

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Thind Transport LLC",
  "image": "https://thindtransport.com/ar-carrier-logo.png",
  "@id": "https://thindtransport.com",
  "url": "https://thindtransport.com",
  "telephone": "+1-206-765-6300",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Kent",
    "addressLocality": "Kent",
    "addressRegion": "WA",
    "postalCode": "98032",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 47.3809,
    "longitude": -122.2348
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday"
    ],
    "opens": "08:00",
    "closes": "18:00"
  }
}

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What's the 91% commission for owner operators?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You keep 91% of the gross revenue from each load - one of the highest rates in the industry! Most companies offer 70-85%. There are NO hidden fees or surprise deductions. Fuel surcharge passes through 100% to you."
      }
    },
    {
      "@type": "Question",
      "name": "How much can I realistically earn?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Company Drivers: $78K-$110K annually at $0.60-$0.65 per mile. Owner Operators: $180K-$280K gross annually with 91% commission. Top O/Os gross over $250K. Pay is distributed weekly via direct deposit every Friday."
      }
    },
    {
      "@type": "Question",
      "name": "What are the experience requirements?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For Owner Operators: Minimum 2 years OTR experience required. For Regional Company Drivers: Minimum 1 year company driver experience required. Both positions require a valid CDL Class A license and a clean driving record."
      }
    },
    {
      "@type": "Question",
      "name": "Is there forced dispatch?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "NO forced dispatch for owner operators! You choose your loads, control your schedule, and pick your lanes. We provide quality freight options - you decide what works for your business."
      }
    },
    {
      "@type": "Question",
      "name": "What about home time?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer flexible schedules: Local routes (home every night), Regional routes (home on weekends - typically 5 days out, 2 days home), or OTR (2-3 weeks out, 3-4 days home). We actually honor our home time promises."
      }
    },
    {
      "@type": "Question",
      "name": "What types of freight do you haul?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer three freight types: Flatbed (building materials, steel, machinery), Reefer (temperature-controlled food and pharmaceutical), and Dry Van (general freight and retail goods)."
      }
    },
    {
      "@type": "Question",
      "name": "How quickly can I start?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Most drivers start within 1-2 weeks after approval. Process: Phone interview (same day response), Application review (1-2 days), Background check & drug screening (3-5 days), Orientation (1 day in Kent, WA or virtual option)."
      }
    },
    {
      "@type": "Question",
      "name": "What's your safety rating?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We maintain an A+ safety rating with FMCSA. Zero out-of-service violations in our history. Our USDOT number is 2523064 - you can verify our record on SAFER."
      }
    },
    {
      "@type": "Question",
      "name": "Do company drivers get benefits?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Full benefits package includes: Health, dental, and vision insurance; 401(k) retirement plan with company match; Paid time off and holiday pay; Sign-on bonus; Weekly direct deposit; Performance and referral bonuses."
      }
    },
    {
      "@type": "Question",
      "name": "Why should I choose Thind over bigger carriers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "At big carriers, you're a number. At Thind, you're family. We offer: Highest commission in the industry (91%), No forced dispatch, Transparent settlements with no hidden fees, Modern equipment, Real 24/7 support."
      }
    }
  ]
}

export const jobPostingSchema = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "CDL-A Owner Operator - 91% Gross Commission",
  "description": "Join Thind Transport and earn 91% of gross revenue on every load. No forced dispatch, 100% fuel surcharge pass-through, weekly settlements. 2015+ trucks accepted.",
  "datePosted": new Date().toISOString().split('T')[0],
  "validThrough": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  "employmentType": "CONTRACTOR",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Thind Transport LLC",
    "sameAs": "https://thindtransport.com",
    "logo": "https://thindtransport.com/ar-carrier-logo.png"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kent",
      "addressRegion": "WA",
      "addressCountry": "US"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 180000,
      "maxValue": 280000,
      "unitText": "YEAR"
    }
  },
  "qualifications": "CDL Class A, 2+ years OTR experience, Clean driving record, Truck 2015 or newer",
  "responsibilities": "Transport freight across the continental US, Maintain vehicle and logs, Communicate with dispatch",
  "jobBenefits": "91% gross commission, No forced dispatch, 100% fuel surcharge, Weekly pay, Fuel card discounts, $2,500 sign-on bonus",
  "industry": "Transportation and Trucking"
}

// Helper to generate all schemas as JSON-LD script
export function generateSchemaScripts() {
  return [
    JSON.stringify(organizationSchema),
    JSON.stringify(localBusinessSchema),
    JSON.stringify(faqSchema),
    JSON.stringify(jobPostingSchema),
  ]
}

