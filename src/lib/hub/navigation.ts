/**
 * HaulDesk IA — 6 primary areas + utility links (HANDOFF.md §2).
 * Maps existing routes; placeholder labels point at nearest live screen.
 */

export interface HubNavLink {
  href: string
  label: string
  ownerOnly?: boolean
}

export interface HubPrimarySection {
  id: string
  label: string
  match: (pathname: string) => boolean
  sub: HubNavLink[]
}

export const HUB_PRIMARY_SECTIONS: HubPrimarySection[] = [
  {
    id: "overview",
    label: "Overview",
    match: (p) => p === "/hub" || p.startsWith("/hub/map"),
    sub: [
      { href: "/hub", label: "Today" },
      { href: "/hub/map", label: "Live map" },
    ],
  },
  {
    id: "dispatch",
    label: "Dispatch",
    match: (p) =>
      p.startsWith("/hub/dispatch") ||
      p.startsWith("/hub/planner") ||
      p.startsWith("/hub/capacity"),
    sub: [
      { href: "/hub/dispatch", label: "Dispatch board" },
      { href: "/hub/planner", label: "Planner" },
      { href: "/hub/capacity", label: "Capacity" },
    ],
  },
  {
    id: "loads",
    label: "Loads",
    match: (p) => p.startsWith("/hub/loads"),
    sub: [
      { href: "/hub/loads", label: "All loads" },
      { href: "/hub/loads/paste", label: "Paste rate con" },
      { href: "/hub/loads/new", label: "New load" },
    ],
  },
  {
    id: "money",
    label: "Money",
    match: (p) =>
      p.startsWith("/hub/money") || p.startsWith("/hub/fuel") || p.startsWith("/hub/compliance/ifta"),
    sub: [
      { href: "/hub/money", label: "Overview" },
      { href: "/hub/money/invoices", label: "Invoices" },
      { href: "/hub/money/settlements", label: "Settlements" },
      { href: "/hub/money/advances", label: "Advances" },
      { href: "/hub/money/expenses", label: "Expenses" },
      { href: "/hub/fuel", label: "Fuel & cards" },
      { href: "/hub/compliance/ifta", label: "IFTA" },
    ],
  },
  {
    id: "fleet",
    label: "Fleet",
    match: (p) => p.startsWith("/hub/fleet"),
    sub: [
      { href: "/hub/fleet", label: "Trucks & trailers" },
      { href: "/hub/fleet/trucks/new", label: "Add truck" },
      { href: "/hub/fleet/trailers/new", label: "Add trailer" },
    ],
  },
  {
    id: "people",
    label: "People",
    match: (p) =>
      p.startsWith("/hub/drivers") ||
      p.startsWith("/hub/recruiting") ||
      p.startsWith("/hub/customers") ||
      p.startsWith("/hub/facilities"),
    sub: [
      { href: "/hub/drivers", label: "Drivers" },
      { href: "/hub/recruiting", label: "Recruiting" },
      { href: "/hub/customers", label: "Customers" },
      { href: "/hub/facilities", label: "Facilities" },
    ],
  },
]

export const HUB_UTILITY_LINKS: HubNavLink[] = [
  { href: "/hub/compliance", label: "Compliance" },
  { href: "/hub/safety", label: "Safety" },
  { href: "/hub/reports", label: "Reports" },
  { href: "/hub/messages", label: "Messages" },
  { href: "/hub/tasks", label: "Tasks" },
  { href: "/hub/guide", label: "Setup guide" },
  { href: "/hub/help", label: "Help" },
  { href: "/hub/setup", label: "Smart Setup" },
  { href: "/hub/import", label: "Import" },
  { href: "/hub/settings/packet", label: "Carrier packet" },
  { href: "/hub/settings/integrations", label: "Integrations", ownerOnly: true },
  { href: "/hub/settings/users", label: "Settings", ownerOnly: true },
]

export function activePrimarySection(pathname: string): HubPrimarySection {
  return HUB_PRIMARY_SECTIONS.find((s) => s.match(pathname)) ?? HUB_PRIMARY_SECTIONS[0]
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/hub") return pathname === "/hub"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Flat list for ⌘K palette navigation. */
export function allHubRoutes(isOwner: boolean): { href: string; label: string; group: string }[] {
  const rows: { href: string; label: string; group: string }[] = []
  for (const section of HUB_PRIMARY_SECTIONS) {
    for (const link of section.sub) {
      rows.push({ href: link.href, label: link.label, group: section.label })
    }
  }
  for (const link of HUB_UTILITY_LINKS) {
    if (link.ownerOnly && !isOwner) continue
    rows.push({ href: link.href, label: link.label, group: "Utility" })
  }
  return rows
}
