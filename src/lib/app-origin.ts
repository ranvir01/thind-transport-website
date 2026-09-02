/**
 * Which host is LoadOff, and which is the carrier's website.
 *
 * One codebase serves two products. Sharing a single origin is what forced
 * every PWA workaround in this repo: a manifest scope that had to be branched
 * per platform, a sitewide standalone-launch rescue, and a link guard to keep
 * the installed app out of the marketing pages. All three exist only to
 * disambiguate two products at one origin.
 *
 * Giving LoadOff its own origin removes the ambiguity at the source. This
 * module is the seam, and it answers exactly one question: is this host the
 * app's? Everything else follows from that answer elsewhere — middleware sends
 * the origin's non-app paths to /hub (app-host-routing.ts), the manifest claims
 * the whole origin as its scope, and the standalone rescue and link guard stand
 * down because there is nothing on that origin to rescue anyone from.
 *
 * The app itself stays mounted at /hub on BOTH origins. An earlier design hid
 * that segment on the app origin by rewriting every path; it broke the theme
 * boot, the marketing-chrome hide rules and the hub's own active-nav, all of
 * which compare usePathname() — the browser path — against "/hub".
 *
 * Unset (the default) changes nothing. Everything keeps working exactly as it
 * does today at /hub on the marketing origin, so this can ship before a domain
 * exists and be switched on by adding one environment variable.
 *
 * The value is a bare hostname, no scheme and no port:
 *   APP_HOST=app.loadoff.com
 *   APP_HOST=thind-transport-website.vercel.app   (to try it with no new domain)
 */

/**
 * NEXT_PUBLIC_ so the browser half (the standalone-launch rescue) can tell the
 * two origins apart too — middleware alone would leave the client guessing.
 *
 * Read inside the function rather than at module load: Next inlines the literal
 * either way, and a lazy read is what lets tests set it per case instead of
 * whatever happened to be in the environment when the module was first imported.
 */
const configuredAppHost = () => (process.env.NEXT_PUBLIC_APP_HOST ?? "").trim().toLowerCase()

/**
 * True when this request/page is being served by the app's own origin.
 *
 * `host` is compared without port so a local `app.localhost:3000` and the
 * deployed `app.loadoff.com` behave the same, and case-insensitively because
 * the Host header is not normalised for us.
 */
export function isAppHost(host: string | null | undefined): boolean {
  const configured = configuredAppHost()
  if (!configured || !host) return false
  const bare = host.trim().toLowerCase().split(":")[0]
  return bare === configured
}

/**
 * Absolute origin for links that must land a user in the app (driver invite
 * QR, emailed driver invite, and broker/shipper portal accept links). Prefers
 * NEXT_PUBLIC_APP_HOST so a scan or tap opens the app origin once that env
 * var is set; until then NEXTAUTH_URL, same as today. Unset APP_HOST changes
 * nothing.
 */
export function appPublicOrigin(): string {
  const configured = configuredAppHost()
  if (configured) {
    const bare = configured.replace(/^https?:\/\//, "").replace(/\/+$/, "")
    return `https://${bare}`
  }
  const nextauth = (process.env.NEXTAUTH_URL ?? "").trim().replace(/\/+$/, "")
  if (nextauth) return nextauth
  return "http://localhost:3000"
}
