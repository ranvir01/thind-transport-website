import { Metadata } from "next"

export const metadata: Metadata = {
  title: "CDL Trucking Routes & Freight Lanes | Seattle, WA | Thind Transport",
  description: "Find high-paying CDL-A trucking routes from Seattle, WA. Local (home daily), Regional (home weekly), and OTR lanes. Rates up to $2.81/mi. I-5 Corridor, I-90, coast-to-coast freight. Apply today!",
  keywords: [
    "CDL trucking routes Seattle",
    "truck driver jobs Washington",
    "freight lanes Pacific Northwest",
    "I-5 corridor trucking",
    "Seattle to Los Angeles freight",
    "local truck driver jobs",
    "regional trucking routes",
    "OTR truck driver Seattle",
    "high paying trucking lanes",
    "Kent WA trucking company",
    "dry van routes",
    "reefer trucking jobs",
    "flatbed freight lanes",
    "home daily trucking",
    "home weekly truck driver",
  ],
  openGraph: {
    title: "CDL Trucking Routes & Freight Lanes | Thind Transport LLC",
    description: "High-paying CDL-A trucking routes from Seattle. Local, Regional, and OTR lanes with rates up to $2.81/mi. Home daily, weekly, or 2-3 weeks. Apply now!",
    type: "website",
    locale: "en_US",
    siteName: "Thind Transport LLC",
  },
  twitter: {
    card: "summary_large_image",
    title: "CDL Trucking Routes | Thind Transport",
    description: "Find your perfect lane. High-paying trucking routes from Seattle, WA. Rates up to $2.81/mi.",
  },
  alternates: {
    canonical: "/routes",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

