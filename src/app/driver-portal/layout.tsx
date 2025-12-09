import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Driver Portal | Thind Transport - Manage Loads, Pay & Documents",
  description: "Access your Thind Transport driver dashboard. View available loads, track settlements, manage documents, and communicate with dispatch 24/7 from any device. Secure login for owner operators and company drivers.",
  keywords: ["driver portal", "trucking dashboard", "CDL driver login", "owner operator portal", "truck driver settlement", "load management", "HOS compliance", "driver pay", "trucking documents"],
  openGraph: {
    title: "Driver Portal | Thind Transport",
    description: "Your complete driver command center. Manage loads, track earnings, and access documents 24/7.",
    type: "website",
    images: ["/og-driver-portal.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Driver Portal | Thind Transport",
    description: "Your complete driver command center. Manage loads, track earnings, and access documents 24/7.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/driver-portal",
  },
}

export default function DriverPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

