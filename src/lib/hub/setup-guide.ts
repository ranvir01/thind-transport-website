/**
 * LoadOff operational journey — single source for in-app setup guide,
 * Today checklist, and docs/hub-setup-guide.md. Plain language first:
 * anyone should run trucking start-to-finish without prior TMS experience.
 */

export const HAULDESK_MISSION =
  "Run your trucking company from first load to last invoice — in one calm place, no training manual required."

export interface GuideStep {
  id: string
  phase: number
  title: string
  /** One sentence — what happens and why it matters. */
  summary: string
  /** Who usually does this (sets expectations for small teams). */
  who: string
  href: string
  cta: string
  /** Optional checklist key from gettingStartedState */
  progressKey?: GettingStartedKeys
}

export interface GuidePhase {
  number: number
  title: string
  intro: string
  steps: GuideStep[]
}

export type GettingStartedKeys = "trucks" | "drivers" | "customers" | "loads" | "packet"

/** The full lifecycle — setup through compliance. */
export const OPERATIONS_PHASES: GuidePhase[] = [
  {
    number: 1,
    title: "Set up your company",
    intro: "Drop your paperwork once. LoadOff reads it so you are not re-typing spreadsheets.",
    steps: [
      {
        id: "smart-setup",
        phase: 1,
        title: "Upload your documents",
        summary: "W-9, insurance, truck registrations, driver CDLs, broker lists — Smart Setup extracts the fields.",
        who: "Owner or office manager",
        href: "/hub/setup",
        cta: "Open Smart Setup",
      },
      {
        id: "packet",
        phase: 1,
        title: "File your carrier packet",
        summary: "Keep W-9, COI, and authority docs in one place for brokers who ask.",
        who: "Owner",
        href: "/hub/settings/packet",
        cta: "Carrier packet",
        progressKey: "packet",
      },
      {
        id: "integrations",
        phase: 1,
        title: "Connect fuel & GPS (optional)",
        summary: "Fuel card CSV and telematics sync when you have them — CSV import always works without.",
        who: "Owner",
        href: "/hub/settings/integrations",
        cta: "Integrations",
      },
    ],
  },
  {
    number: 2,
    title: "Book freight",
    intro: "Every load starts here — paste a rate con, type one in, or import your history.",
    steps: [
      {
        id: "paste-rate-con",
        phase: 2,
        title: "Paste a rate confirmation",
        summary: "Copy text from the broker email — LoadOff builds the load with lane, rate, and stops.",
        who: "Dispatcher",
        href: "/hub/loads/paste",
        cta: "Paste rate con",
      },
      {
        id: "new-load",
        phase: 2,
        title: "Enter a load manually",
        summary: "Use the form when you do not have a PDF yet.",
        who: "Dispatcher",
        href: "/hub/loads/new",
        cta: "New load",
      },
      {
        id: "import",
        phase: 2,
        title: "Import past loads",
        summary: "Bring spreadsheet history so reports and lane stats are not starting from zero.",
        who: "Owner or accountant",
        href: "/hub/import",
        cta: "Import CSV",
        progressKey: "loads",
      },
    ],
  },
  {
    number: 3,
    title: "Dispatch & plan",
    intro: "Assign drivers, watch the board, and fill empty trucks before they sit.",
    steps: [
      {
        id: "dispatch-board",
        phase: 3,
        title: "Assign on the dispatch board",
        summary: "Drag loads through booked → dispatched. The driver gets it on their phone.",
        who: "Dispatcher",
        href: "/hub/dispatch",
        cta: "Dispatch board",
      },
      {
        id: "planner",
        phase: 3,
        title: "Plan the week",
        summary: "See who is empty and when — backhaul ideas before trucks deadhead home.",
        who: "Dispatcher",
        href: "/hub/planner",
        cta: "Planner",
      },
    ],
  },
  {
    number: 4,
    title: "Driver runs the load",
    intro: "Drivers use the same login on their phone — confirm, arrive, photo POD. No phone-tag.",
    steps: [
      {
        id: "driver-app",
        phase: 4,
        title: "Driver confirms on their phone",
        summary: "They tap to acknowledge dispatch, mark arrive/depart, and upload POD from the cab.",
        who: "Driver (office creates their login)",
        href: "/hub/drivers",
        cta: "Drivers",
        progressKey: "drivers",
      },
      {
        id: "messages",
        phase: 4,
        title: "Message without phone numbers",
        summary: "Dispatch and drivers chat on the load thread — everything stays on the record.",
        who: "Dispatcher & driver",
        href: "/hub/messages",
        cta: "Messages",
      },
    ],
  },
  {
    number: 5,
    title: "Bill & collect",
    intro: "POD in hand → invoice out the door. Track who owes you.",
    steps: [
      {
        id: "invoice",
        phase: 5,
        title: "Send invoices",
        summary: "One click from a delivered load — PDF with POD attached, emailed to the broker.",
        who: "Accountant or dispatcher",
        href: "/hub/money",
        cta: "Money overview",
      },
      {
        id: "ar",
        phase: 5,
        title: "Watch AR aging",
        summary: "See overdue invoices before cash flow hurts.",
        who: "Owner or accountant",
        href: "/hub/money",
        cta: "AR aging",
      },
    ],
  },
  {
    number: 6,
    title: "Pay drivers",
    intro: "Settlements pull from delivered loads — advances and deductions included.",
    steps: [
      {
        id: "settlements",
        phase: 6,
        title: "Run driver settlements",
        summary: "Review the draft, approve, and export for QuickBooks or your accountant.",
        who: "Owner or accountant",
        href: "/hub/money/settlements",
        cta: "Settlements",
      },
    ],
  },
  {
    number: 7,
    title: "Stay compliant",
    intro: "Expiring CDLs, fuel tax, and safety — surfaced before they become surprises.",
    steps: [
      {
        id: "compliance",
        phase: 7,
        title: "Compliance dashboard",
        summary: "Red, amber, green on every driver, truck, and document expiry.",
        who: "Safety or owner",
        href: "/hub/compliance",
        cta: "Compliance",
      },
      {
        id: "fuel-ifta",
        phase: 7,
        title: "Fuel & IFTA",
        summary: "Import fuel card data; quarterly worksheet when tax time comes.",
        who: "Accountant",
        href: "/hub/fuel",
        cta: "Fuel & cards",
      },
    ],
  },
]

/** Flat list for checklist on Today screen. */
export const SETUP_CHECKLIST: {
  key: GettingStartedKeys | "smart_setup"
  label: string
  href: string
  highlight?: boolean
}[] = [
  {
    key: "smart_setup",
    label: "Start Smart Setup — drop all your paperwork at once",
    href: "/hub/setup",
    highlight: true,
  },
  { key: "trucks", label: "Trucks on file (or import your fleet list)", href: "/hub/import?kind=trucks" },
  { key: "drivers", label: "Drivers on file (or import your roster)", href: "/hub/import?kind=drivers" },
  { key: "customers", label: "Brokers on file (or import your broker list)", href: "/hub/import?kind=customers" },
  { key: "loads", label: "Load history imported", href: "/hub/import" },
  { key: "packet", label: "Carrier packet filed (W-9, COI)", href: "/hub/settings/packet" },
]

export function allGuideSteps(): GuideStep[] {
  return OPERATIONS_PHASES.flatMap((p) => p.steps)
}
