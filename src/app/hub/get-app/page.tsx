import type { Metadata } from "next"
import Link from "next/link"
import { Share, Smartphone } from "lucide-react"
import { InstallAppButton } from "@/components/hub/InstallAppButton"
import { Panel } from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"
import { LoadOffMark } from "@/components/hub/LoadOffMark"

export const metadata: Metadata = {
  title: `Install ${PRODUCT.name}`,
  robots: { index: false },
}

/**
 * The install surface — public (proxy-exempt), and deliberately a /hub route:
 * installability follows the manifest in scope, and only /hub pages carry the
 * driver app's manifest (start_url /hub). Installing from ANY marketing page
 * used to bind the home-screen icon to the website; /app now funnels here,
 * and Share → Add to Home Screen performed on this page installs the app.
 *
 * No auth calls, no data — a driver in a truck-stop parking lot on 1 bar
 * should be able to load this and get the icon on their phone.
 */
export default function GetAppInstallPage() {
  return (
    <div className="hauldesk-auth flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Panel className="w-full p-6 md:p-8">
          {/* Showing the mark here is the second half of the tell-tale below:
              the driver can match what they are about to add against what they
              will see on their home screen, before they add it. */}
          <div className="flex items-center gap-3">
            <LoadOffMark size={44} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-3">
              You&apos;re on the app&apos;s own page
            </p>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
            Put {PRODUCT.name} on your phone
          </h1>
          <p className="mt-3 text-sm text-fg-2">
            Installing from this page puts the <span className="font-semibold text-fg">app</span> on
            your home screen — not a shortcut to the website. It works offline once installed.
          </p>

          <div className="mt-6">
            <InstallAppButton appearance="office" />
          </div>

          {/* The two manual paths, always visible — beforeinstallprompt is
              Chrome's to offer and iOS never fires it, so the instructions
              can't depend on it. */}
          <div className="mt-5 space-y-3 text-sm text-fg-2">
            <p className="flex items-start gap-2">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <span className="font-semibold text-fg">Android:</span> Chrome menu (⋮) →{" "}
                <span className="font-semibold text-fg">Install app</span>.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Share className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <span className="font-semibold text-fg">iPhone (Safari):</span> Share →{" "}
                <span className="font-semibold text-fg">Add to Home Screen</span> → Add.
              </span>
            </p>
          </div>

          {/* The tell-tale for "am I installing the right thing?" — the name
              iOS pre-fills comes from the page's manifest, so on the website it
              reads Thind Transport and on this page it reads LoadOff. Saying so
              turns a silent wrong install into something the driver can catch. */}
          <p className="mt-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg-2">
            The name it offers should read{" "}
            <span className="font-semibold text-fg">{PRODUCT.name}</span>. If it says Thind
            Transport, you&apos;re on a website page — come back here and add it from this screen.
          </p>

          <p className="mt-6 border-t border-border pt-4 text-center text-xs text-fg-3">
            Once it&apos;s installed, open it and{" "}
            <Link href="/hub/login" className="font-semibold text-accent-text hover:underline">
              sign in
            </Link>{" "}
            — the app keeps you signed in after that.
          </p>
        </Panel>
      </div>
    </div>
  )
}
