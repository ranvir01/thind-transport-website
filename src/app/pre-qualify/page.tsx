import { Metadata } from "next"
import { PreQualificationForm } from "@/components/application/PreQualificationForm"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { COMPANY_INFO } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Driver pre-qualification",
  description: "Check your eligibility for Thind Transport driver positions. Quick and secure pre-qualification form.",
  alternates: { canonical: "/pre-qualify" },
}

/**
 * The form used to hang off a `-mt-20` card that pulled it up over the
 * breadcrumb and under the fixed navbar — the page had no <h1> at all, and on
 * a phone the first thing a driver saw was a white corner covering the trail.
 * Normal flow now: asphalt hero carrying the one <h1>, then the form as a
 * paper island on the dark ground.
 */
export default function PreQualifyPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      <AsphaltHero
        breadcrumb={
          /* Inside the band, so the bar's own ground, blur, nav-clearance
             padding, centred row and second container gutter come off. */
          <PageBreadcrumb
            pageName="Pre-Qualification"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Pre-qualify"
        title="See where you stand before you apply"
        description={`A short set of questions about your licence, experience, and driving history. You see the result as soon as you submit, and you can always call the ${COMPANY_INFO.location} office instead.`}
        primary="call"
        applyLabel="Start the full application"
        extraLinks={[{ href: "#pre-qualification", label: "Skip to the form" }]}
      />

      <section
        id="pre-qualification"
        aria-labelledby="pre-qualification-heading"
        className="scroll-mt-24 bg-navy-950 py-section"
      >
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <PreQualificationForm />
          </div>
        </div>
      </section>
    </div>
  )
}
