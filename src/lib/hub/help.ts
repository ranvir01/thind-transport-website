/**
 * Help center content + interactive tour definitions.
 * Plain language; tours stay in sync with the UI (no stale screencasts).
 */

export interface HelpTopic {
  id: string
  question: string
  answer: string
  href?: string
  hrefLabel?: string
}

export interface TourStep {
  id: string
  title: string
  body: string
  /** CSS selector for spotlight; omit for centered welcome step */
  target?: string
}

export interface HubTour {
  id: string
  title: string
  summary: string
  /** Page the tour expects to start on */
  startPath: string
  steps: TourStep[]
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "daily-rhythm",
    question: "What do I do when I log in?",
    answer:
      "Open Today. Handle anything red or amber first — late pickups, unconfirmed dispatches, loads ready to invoice. Then book new freight or dispatch empty trucks.",
    href: "/hub",
    hrefLabel: "Open Today",
  },
  {
    id: "paste-rate-con",
    question: "How do I enter a load from a broker email?",
    answer:
      "Copy the rate confirmation text and paste it on Paste rate con. HaulDesk pulls lane, rate, stops, and broker — you confirm and save.",
    href: "/hub/loads/paste",
    hrefLabel: "Paste rate con",
  },
  {
    id: "dispatch",
    question: "How do I assign a driver?",
    answer:
      "Open the load from Today or the dispatch board, pick a driver and truck, and dispatch. The driver gets it on their phone and taps Confirm.",
    href: "/hub/dispatch",
    hrefLabel: "Dispatch board",
  },
  {
    id: "invoice",
    question: "When do I invoice?",
    answer:
      "When POD is in, Today shows “one click to bill.” Open Money → Invoices or tap the load from Today to draft and send.",
    href: "/hub/money",
    hrefLabel: "Money overview",
  },
  {
    id: "settlements",
    question: "How do driver settlements work?",
    answer:
      "Each week, open Settlements, review miles and deductions, and run payroll. Advances and fuel flow in automatically when you import them.",
    href: "/hub/money/settlements",
    hrefLabel: "Settlements",
  },
  {
    id: "setup",
    question: "We're brand new — where do we start?",
    answer:
      "Follow the setup guide: upload paperwork once in Smart Setup, then book your first load. About an afternoon for most carriers.",
    href: "/hub/guide",
    hrefLabel: "Setup guide",
  },
  {
    id: "command-palette",
    question: "How do I jump to a screen quickly?",
    answer: "Press ⌘K (Mac) or Ctrl+K (Windows) anywhere in the office app to search every screen by name.",
  },
  {
    id: "driver-app",
    question: "What does the driver see?",
    answer:
      "Drivers log in on their phone, confirm dispatches, update load status, upload POD photos, and request time off. Office sees updates on Today and the dispatch board.",
    href: "/hub/drivers",
    hrefLabel: "Drivers list",
  },
]

/** Spotlight tour — highlights real UI on Today. */
export const HUB_TOURS: HubTour[] = [
  {
    id: "today-desk",
    title: "Your daily desk",
    summary: "A 2-minute walkthrough of Today — what to check first and where to click next.",
    startPath: "/hub",
    steps: [
      {
        id: "welcome",
        title: "Welcome to HaulDesk",
        body: "This quick tour shows how a dispatcher uses Today each morning. Use Next to continue — you can exit anytime with Esc.",
      },
      {
        id: "nav",
        title: "Six areas, one workflow",
        target: '[data-tour="hub-primary-nav"]',
        body: "Overview, Dispatch, Loads, Money, Fleet, and People cover trucking start to finish. Sub-links under each tab narrow the view.",
      },
      {
        id: "search",
        title: "Jump anywhere",
        target: '[data-tour="hub-command-palette"]',
        body: "⌘K opens search — type “invoice”, “paste”, or “compliance” instead of hunting through menus.",
      },
      {
        id: "kpis",
        title: "Pulse at a glance",
        target: '[data-tour="today-kpis"]',
        body: "Active loads, revenue this week, money owed to you, and driver pay queued — tap a card to drill in.",
      },
      {
        id: "due",
        title: "Due today",
        target: '[data-tour="today-due"]',
        body: "Pickups and deliveries with appointments today. Red timing means late — open the load and call the driver or broker.",
      },
      {
        id: "bill",
        title: "Ready to invoice",
        target: '[data-tour="today-unbilled"]',
        body: "POD in hand? These loads are waiting for one click to bill. That is how AR stays current.",
      },
      {
        id: "guide",
        title: "Need the full playbook?",
        target: '[data-tour="hub-setup-guide"]',
        body: "Setup guide walks setup → book → dispatch → bill → pay → comply. Come back here anytime under Help.",
      },
    ],
  },
]

export function getTour(id: string): HubTour | undefined {
  return HUB_TOURS.find((t) => t.id === id)
}
