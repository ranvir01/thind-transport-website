// Self-contained backdrop for the public tracking page: /track renders without the
// marketing chrome (Navbar, Footer, ActiveBackground all return null here), so it
// carries its own dark canvas instead of leaning on the marketing backdrop.
export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0B0C0E]">
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
