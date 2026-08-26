/**
 * Office route template — remounts on every navigation, which is exactly what
 * gives each screen its 200ms shared-axis entrance (.hub-route-enter in
 * hub-theme.css). Compositor props only; prefers-reduced-motion collapses it
 * via the global reduce block in globals.css. This is the dependency-free
 * stand-in for React ViewTransitions until next/react stabilize them.
 */
export default function OfficeTemplate({ children }: { children: React.ReactNode }) {
  return <div className="hub-route-enter">{children}</div>
}
