/**
 * Office route template — remounts on every navigation, which is what resets
 * per-screen client state between pages. It stays a SERVER component: the
 * shared-axis entrance it used to own (.hub-route-enter in hub-theme.css) is
 * gated to PRIMARY-SECTION changes — Money → Fleet rises in, but Invoices →
 * Settlements inside Money just swaps content, because the sub-nav row is
 * already telling that story and a 260ms rise on every tab click read as lag.
 * Comparing this route to the last one needs client state, so the class lives
 * on the keyed wrapper in HubShell (components/hub/HubNav.tsx), which is
 * already a client component and already computes the active section — no new
 * client boundary above every office page, and no module-global route memory.
 * Compositor props only; prefers-reduced-motion collapses it via the global
 * reduce block in globals.css. Dependency-free stand-in for React
 * ViewTransitions until next/react stabilize them.
 */
export default function OfficeTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
