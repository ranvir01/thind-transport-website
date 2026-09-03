"use client"

/**
 * The full job card behind a "details" text link on /pay-rates.
 *
 * Every figure interpolates PAY_RATES / BENEFITS / COMPANY_INFO — the previous
 * version hand-typed "$0.63", "90%" and "Kent, WA" in six places and drifted
 * from the pay page it sat on. The footer carries the one red action (Apply)
 * and the phone number as a text link, the same pair as every other apply
 * block on the site. Radix Dialog stays; the trigger is a 44px text link.
 */

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BENEFITS, COMPANY_INFO, PAY_RATES, SERVICES } from "@/lib/constants"

type CompanyLane = "local" | "regional" | "otr"

interface JobDetailsDialogProps {
  jobType?: "company" | "owner"
  /** For a company card about one lane: Apply opens /apply on that lane. */
  lane?: CompanyLane
}

interface JobDetails {
  title: string
  type: string
  salary: string
  description: string
  requirements: readonly string[]
  benefits: readonly string[]
  routes: readonly string[]
}

const cd = PAY_RATES.companyDriver
const oo = PAY_RATES.ownerOperator

// Widened to string[] on purpose: comparing two distinct `as const` literals is
// a TypeScript error, so the day the rates diverge this fails to compile
// instead of quietly keeping the "same rate" line (HomeTimeLanes does the same).
const COMPANY_RATES: string[] = [cd.local.perMile, cd.regional.perMile, cd.otr.perMile]
const SAME_RATE = COMPANY_RATES.every((rate) => rate === COMPANY_RATES[0])

/** "$57K-$63K" … "$69K-$82K" → "$57K–$82K": the published floor to the published ceiling. */
const COMPANY_RANGE = `${cd.local.annual.split("-")[0]}–${cd.otr.annual.split("-")[1]}`

const JOB_DETAILS: Record<"company" | "owner", JobDetails> = {
  company: {
    title: "CDL-A company driver — local, regional and OTR",
    type: "Full-time",
    salary: `${COMPANY_RANGE}/year`,
    description: `${SAME_RATE ? `${cd.local.perMile} per mile on every lane. ` : ""}Local home ${cd.local.homeTime.toLowerCase()} (${cd.local.annual}/year), regional home ${cd.regional.homeTime.toLowerCase()} (${cd.regional.annual}/year), OTR ${cd.otr.homeTime} out (${cd.otr.annual}/year).`,
    requirements: [
      "Valid CDL Class A license",
      `${PAY_RATES.requirements.companyDriver} (required)`,
      "Clean driving record (no major violations in past 3 years)",
      "Pass DOT physical and drug screening",
      "21 years or older",
    ],
    benefits: BENEFITS.companyDriver,
    routes: [
      `Local: ${cd.local.perMile}/mile, home ${cd.local.homeTime.toLowerCase()}, ${cd.local.annual}/year`,
      `Regional: ${cd.regional.perMile}/mile, home ${cd.regional.homeTime.toLowerCase()}, ${cd.regional.annual}/year`,
      `OTR: ${cd.otr.perMile}/mile, ${cd.otr.homeTime} out, ${cd.otr.annual}/year`,
      ...(SAME_RATE ? ["Same per-mile rate on every lane — picking local is not a pay cut"] : []),
    ],
  },
  owner: {
    title: "Owner-operator — lease on",
    type: "Independent contractor",
    salary: `${oo.annualGross}/year typical gross`,
    description: `Keep ${oo.commission} of the linehaul with ${oo.fuelSurcharge} fuel-surcharge pass-through. Typical gross ${oo.annualGross}/year at ${oo.perMile}/mile — your revenue depends on the miles you choose to run. No forced dispatch.`,
    requirements: [
      "Valid CDL Class A license",
      `${PAY_RATES.requirements.otr} (required)`,
      "Your own power unit (truck)",
      "Clean driving record",
    ],
    benefits: BENEFITS.ownerOperator,
    routes: [
      `Typical freight: ${oo.perMile}/mile`,
      `Keep ${oo.commission} of gross`,
      `${oo.fuelSurcharge} fuel surcharge pass-through`,
      `${SERVICES.types.join(", ")} — you pick the load`,
      "No forced dispatch",
    ],
  },
}

const SECTION_HEADING = "mb-3 font-display text-m-h4 font-bold text-ink"
// list-none + mb-0: the base layer gives every ul a light copy colour and every
// li a bottom margin, both tuned for the dark ground, not a paper dialog.
const LIST = "list-none text-m-body text-ink"
const ROW = "mb-0 flex items-start gap-2"
const ICON = "mt-1 h-5 w-5 shrink-0 text-signal"

export function JobDetailsDialog({ jobType = "company", lane }: JobDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  const details = JOB_DETAILS[jobType]
  const applyHref =
    jobType === "owner"
      ? "/apply?type=owner"
      : lane
        ? `/apply?type=company&lane=${lane}`
        : "/apply?type=company"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Colour is inherited so the link reads on whichever card mounts it. */}
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center gap-1 text-m-body font-semibold underline-offset-4 hover:underline"
        >
          {jobType === "company" ? "Company driver details" : "Owner-operator details"}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </DialogTrigger>
      {/* The dialog is the same paper island as every other widget: the
          primitive's own bg-white / shadow-lg / sm:rounded-lg are the shared
          app defaults, overridden here rather than in src/components/ui. */}
      <DialogContent className="max-h-[80svh] max-w-2xl overflow-y-auto rounded-m-3 border-ink/15 bg-paper text-ink shadow-m-e4 sm:rounded-m-3">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-m-h3 font-bold text-ink">{details.title}</DialogTitle>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-m-body text-ink-2">
            <span>{details.type}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tabular-nums text-ink">{details.salary}</span>
            <span aria-hidden>·</span>
            <span>{COMPANY_INFO.location}</span>
          </p>
          <DialogDescription className="max-w-measure text-m-body text-ink-2">
            {details.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className={SECTION_HEADING}>Requirements</h3>
            <ul className={`${LIST} space-y-2`}>
              {details.requirements.map((req) => (
                <li key={req} className={ROW}>
                  <CheckCircle2 className={ICON} aria-hidden />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={SECTION_HEADING}>Pay, benefits, and other compensation</h3>
            <ul className={`${LIST} grid gap-2 md:grid-cols-2`}>
              {details.benefits.map((benefit) => (
                <li key={benefit} className={ROW}>
                  <CheckCircle2 className={ICON} aria-hidden />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={SECTION_HEADING}>Route options</h3>
            <ul className={`${LIST} space-y-2 rounded-m-2 border border-ink/10 p-4`}>
              {details.routes.map((route) => (
                <li key={route} className={ROW}>
                  <ArrowRight className={ICON} aria-hidden />
                  <span className="font-medium">{route}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-start sm:space-x-0">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={applyHref} onClick={() => setOpen(false)}>
              Apply now
            </Link>
          </Button>
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="inline-flex min-h-[48px] w-full items-center justify-center text-m-body font-semibold text-ink underline-offset-4 hover:underline sm:w-auto"
          >
            <span>or call </span>
            <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
