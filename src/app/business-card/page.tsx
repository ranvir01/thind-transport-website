import type { Metadata } from "next"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { BusinessCardShowcase } from "@/components/branding/BusinessCardShowcase"

export const metadata: Metadata = {
  title: "Business Card Design",
  description: `Professional business card design for ${COMPANY_INFO.name} — Flatbed, Reefer & Dry Van freight services across ${STATS.statesCovered} states.`,
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Internal brand-asset page (noindex). The hero owns the page's one <h1>;
 * `omitApply` because nobody lands here to apply — the number stays as text so
 * whoever is holding a printer's proof can still reach the office.
 */
export default function BusinessCardPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        eyebrow="Brand assets"
        title="Business card design"
        description={`The MOO-format card for ${COMPANY_INFO.name}: both faces, the print specification, and the source artwork.`}
        primary="call"
        omitApply
      />
      <BusinessCardShowcase />
    </div>
  )
}
