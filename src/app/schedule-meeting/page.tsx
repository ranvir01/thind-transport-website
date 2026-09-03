import type { Metadata } from "next"
import { COMPANY_INFO } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { ScheduleMeetingForm } from "@/components/features/ScheduleMeetingForm"

export const metadata: Metadata = {
  title: "Schedule a meeting",
  description: `Book a short call with ${COMPANY_INFO.owner} before your DOT driver application — phone or video, Pacific Time.`,
  alternates: { canonical: "/schedule-meeting" },
}

/**
 * Server component: the page owns the <h1> and the asphalt band, and only the
 * form island below it ships JavaScript. The hero omits Apply on purpose —
 * the application comes *after* this call, so the page's own action is the
 * form, and the number is the one red above the fold.
 *
 * /schedule-meeting is listed in Footer.tsx's NOT_A_DRIVER_PAGE set, so the
 * fixed mobile command bar never floats its "Apply Now" over the submit.
 */
export default function ScheduleMeetingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        eyebrow="Before your DOT application"
        title="Schedule your meeting"
        description={`One short call with ${COMPANY_INFO.owner} — 15 to 20 minutes, phone or video. After it, you get the secure link to complete your full DOT driver application.`}
        primary="call"
        omitApply
      />

      <section aria-labelledby="schedule-form-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2
              id="schedule-form-heading"
              className="font-display text-m-h2 font-bold text-ink text-balance"
            >
              Book the call
            </h2>
            <p className="mt-3 max-w-measure text-m-body text-ink-2">
              Pick a date and a time that works. We confirm by email.
            </p>

            <div className="mt-8">
              <ScheduleMeetingForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
