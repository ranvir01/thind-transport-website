// Self-contained backdrop for the public tracking page: /track renders without the
// marketing chrome (Navbar, Footer, ActiveBackground all return null here), so it
// carries its own dark canvas instead of leaning on the marketing backdrop.
export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen bg-[#0B0C0E]"
      // Forced-dark surface tokens (mirrors the --driver-* block in hub-theme.css,
      // which this route does not load) so shared driver-surface components can
      // resolve their vars here too. bg-[#0B0C0E] stays: it is this route's page black.
      style={
        {
          "--driver-bg": "#121316",
          "--driver-surface": "#1c1e23",
          "--driver-surface-2": "#262930",
          "--driver-border": "rgba(255, 255, 255, 0.06)",
          "--driver-border-strong": "rgba(255, 255, 255, 0.12)",
          "--driver-border-control": "#6b6f7a",
          "--driver-text": "#ffffff",
          "--driver-text-2": "#d2d3d6",
          "--driver-text-3": "#abadb2",
        } as React.CSSProperties
      }
    >
      {/* Blueprint grid, matching the marketing backdrop's texture — no orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
