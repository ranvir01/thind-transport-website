import type { Metadata } from "next"
import { BusinessCardShowcase } from "@/components/branding/BusinessCardShowcase"

export const metadata: Metadata = {
  title: "Business Card Design",
  description: "Professional business card design for Thind Transport — Flatbed, Reefer & Dry Van freight services across 48 states.",
}

export default function BusinessCardPage() {
  return <BusinessCardShowcase />
}
