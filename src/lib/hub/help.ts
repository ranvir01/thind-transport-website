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
      "Copy the rate confirmation text and paste it on Paste rate con. LoadOff pulls lane, rate, stops, and broker — you confirm and save.",
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
  {
    id: "showcase",
    question: "Can I watch every role without logging in?",
    answer:
      "Yes. The public LoadOff page walks dispatcher, driver, accountant, owner, broker, and shipper seats on mock data. The 90-second demo is the interactive version.",
    href: "/hub/demo",
    hrefLabel: "Open the 90-second demo",
  },
  {
    id: "preferences",
    question: "Can I change density, captions, or appearance?",
    answer:
      "Office users can set light/dark and accent from the palette in the header, and captions or voiceover for product tours under Preferences.",
    href: "/hub/settings/preferences",
    hrefLabel: "Preferences",
  },
]

/** Spotlight tour — highlights real UI on Today. */
export const HUB_TOURS: HubTour[] = [
  {
    id: "money-desk",
    title: "Money desk",
    summary: "Invoice the delivered load, then settle the week — integer cents the whole way.",
    startPath: "/hub/money",
    steps: [
      {
        id: "welcome",
        title: "Get paid, then pay drivers",
        body: "Money is one loop: POD in, invoice out, settlement drafted. Esc anytime.",
      },
    ],
  },
  {
    id: "dispatch-board",
    title: "Dispatch board",
    summary: "Assign a driver and truck without booking over home time or an expired med card.",
    startPath: "/hub/dispatch",
    steps: [
      {
        id: "welcome",
        title: "Assign with the rules riding along",
        body: "The board is live freight. Illegal moves are refused in plain language.",
      },
    ],
  },
  {
    id: "today-desk",
    title: "Your daily desk",
    summary: "A 2-minute walkthrough of Today — what to check first and where to click next.",
    startPath: "/hub",
    steps: [
      {
        id: "welcome",
        title: "Welcome to LoadOff",
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
        body: "Loads today, unconfirmed drivers, money not yet invoiced, and missing PODs — tap a tile to drill in.",
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

export interface PlaybookStep {
  text: string
  /** Optional aside: a shortcut, gotcha, or "we do this for you" note. */
  note?: string
}

export interface Playbook {
  id: string
  title: string
  summary: string
  steps: PlaybookStep[]
}

/**
 * Written playbooks for the jobs that span several screens. The interactive
 * tours spotlight the UI; these are the read-it-once reference for the whole
 * loop (and what a new dispatcher gets handed on day one).
 */
export const PLAYBOOKS: Playbook[] = [
  {
    id: "load-end-to-end",
    title: "Run a load end to end",
    summary: "The full quote-to-cash loop: book, dispatch, deliver, invoice, settle.",
    steps: [
      { text: "Book it in Loads → New load: customer, lane, rate, equipment.", note: "Or paste the rate confirmation and let LoadOff fill the fields." },
      { text: "Open the load and assign a driver — hours and medical-card status are checked for you." },
      { text: "Dispatch it. The driver gets the stops, rate con, and directions on their phone." },
      { text: "Watch it on the Dispatch board and Live map; send the broker a public tracking link." },
      { text: "On delivery the driver photographs the signed POD and it lands on the load." },
      { text: "Create the invoice from the load, check the line items, and send it." },
      { text: "Record the payment when it arrives; the load closes out." },
      { text: "Pay the driver from Money → Settlements." },
    ],
  },
  {
    id: "rate-con",
    title: "Turn a rate confirmation into a load",
    summary: "A broker PDF or email becomes a booked load in seconds.",
    steps: [
      { text: "Open Loads and choose the paste/import option." },
      { text: "Drop the PDF or paste the email body.", note: "Most broker rate-con formats are handled automatically." },
      { text: "LoadOff pulls out the customer, stops, rate, reference, and equipment." },
      { text: "Review anything flagged low-confidence — those are the only fields worth double-checking." },
      { text: "Save. The load enters as booked, ready to assign." },
    ],
  },
  {
    id: "invoice-get-paid",
    title: "Invoice a broker and get paid",
    summary: "Bill the moment the POD is in hand, then track the money.",
    steps: [
      { text: "From a delivered load, create the invoice." },
      { text: "Confirm the rate, accessorials, and detention.", note: "Factored customers route to the factoring remit-to automatically." },
      { text: "Send it by email or download the PDF — the POD attaches for you." },
      { text: "Track it under Money → Invoices and the AR aging view." },
      { text: "Record the payment when funds land; the load moves to paid." },
    ],
  },
  {
    id: "settlements",
    title: "Run weekly settlements",
    summary: "Pay every driver accurately, on the same day each week.",
    steps: [
      { text: "Go to Money → Settlements." },
      { text: "LoadOff gathers each driver's delivered loads for the pay period." },
      { text: "Review gross pay, deductions, advances, escrow, and reimbursements.", note: "Each driver's own pay rules — per-mile or percentage — drive the math." },
      { text: "Run payroll to lock the settlements and generate pay statements." },
    ],
  },
  {
    id: "ifta",
    title: "File IFTA for the quarter",
    summary: "Miles and fuel by jurisdiction, reefer-exempt handled correctly.",
    steps: [
      { text: "Open Fuel → IFTA for the quarter you're filing." },
      { text: "Miles per state come from trips and position pings." },
      { text: "Fuel-card imports fill in tax-paid gallons; reefer and DEF are excluded automatically." },
      { text: "Review the per-jurisdiction miles and gallons against your own records." },
      { text: "Export the worksheet — base tax and surcharge are split out, ready to file." },
    ],
  },
]
