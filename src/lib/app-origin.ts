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
 * module is the seam: set APP_HOST to a hostname and that host becomes the
 * app — its root serves the app, its manifest scopes the whole origin, and the
 * marketing site is simply somewhere else.
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

/** Where the app lives on its own origin. On the shared origin it is /hub. */
export const APP_ROOT = "/"

/** The path the app is mounted at inside the Next router, on either origin. */
export const APP_SEGMENT = "/hub"

/** True once a dedicated app origin has been configured. */
export function appOriginConfigured(): boolean {
  return configuredAppHost().length > 0
}

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
 * Where the app starts, for the origin this request is on.
 *
 * On its own origin the app owns the root, so `start_url` and every rescue
 * target is "/". On the shared marketing origin it is still "/hub".
 */
export function appHome(host: string | null | undefined): string {
  return isAppHost(host) ? APP_ROOT : APP_SEGMENT
}

