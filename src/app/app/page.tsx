import { Metadata } from "next"
import Link from "next/link"
import { CloudOff, Camera, Wallet, Bell, MessageSquare, ArrowRight } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { GetTheApp } from "@/components/features/GetTheApp"
import { APP_ICONS } from "@/lib/site-icons"
import { Reveal } from "@/components/ui/Reveal"

export const metadata: Metadata = {
  // absolute: the string already carries the carrier name, and the root
  // template would otherwise append it a second time.
  title: { absolute: "Get the driver app | Thind Transport" },
  description:
    "The Thind Transport driver app installs straight from your browser — no app store, no download. Confirm dispatches, send PODs from the camera, check pay, and keep working with no signal.",
  alternates: { canonical: "/app" },
  // This page IS an install surface: Share → Add to Home Screen here installs
  // LoadOff, not a bookmark to the website.
  //
  // That takes all four of these together, and the version that shipped with
  // only the first two is why the owner's icon opened the website. A manifest
  // is applied only to documents inside its `scope`, so the LoadOff manifest —
  // scoped to /hub — used to be discarded right here, leaving the capable flag
  // to pin a chrome-less window to this marketing page. The manifest route now
  // widens its scope to "/" for iOS (see lib/hub/install-scope.ts), so it
  // survives, and with it the LoadOff name, icon and start_url "/hub".
  manifest: "/api/hub/manifest",
  // apple-mobile-web-app-title — this is the name iOS pre-fills in the Add to
  // Home Screen sheet, and the reason it used to read "Thind Transport".
  appleWebApp: { capable: true, title: "LoadOff" },
  // iOS reads the home-screen icon from apple-touch-icon before the manifest.
  icons: APP_ICONS,
}

/**
 * The public "get the app" page.
 *
 * The driver app is a PWA, which is a genuine advantage worth stating plainly:
 * no app store account, no 80MB download over a truck-stop connection, and
 * updates arrive without anyone tapping "update". Drivers don't care what a PWA
 * is, so the page never says the word — it says "no app store" and shows the
 * two taps.
 */

const FEATURES = [
  {
    icon: CloudOff,
    title: "Works with no signal",
    body: "Mountain passes, dead zones, that one dock with concrete walls. Your taps are saved and sent the moment you're back on — nothing is lost and nothing has to be re-entered.",
  },
  {
    icon: Camera,
    title: "PODs straight from the camera",
    body: "Photograph the signed bill at the dock and it's on the load before you're back in the cab. No emailing yourself, no photos lost in a camera roll.",
  },
  {
    icon: Wallet,
    title: "Your pay, not a mystery",
    body: "Settlements, advances and pay stubs on the same screen you confirm loads on. See what you earned this week without calling the office.",
  },
  {
    icon: Bell,
    title: "Dispatch reaches you",
    body: "New load offers and changes arrive as a notification rather than a phone call you missed while backing into a dock.",
  },
  {
    icon: MessageSquare,
    title: "Talk to a person",
    body: "Message dispatch directly from the load you're asking about, so nobody has to work out which truck and which stop you mean.",
  },
] as const

export default function GetAppPage() {
  return (
    <div className="bg-paper">
      {/* Next emits only the standardised `mobile-web-app-capable` from
          appleWebApp.capable; iOS keys standalone launch off the apple-prefixed
          name. React hoists this into <head>. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <PageBreadcrumb pageName="Driver app" category="Drivers" />

      <section className="bg-asphalt py-16 text-paper md:py-24">
        <div className="container px-4">
          <div className="grid items-start gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
            <Reveal>
              <p className="font-display text-m-micro font-bold uppercase tracking-[0.2em] text-signal-up">
                For our drivers
              </p>
              <h1 className="mt-4 font-display text-m-h1 font-bold">
                Two taps and it&apos;s on your phone. No app store.
              </h1>
              <p className="mt-5 max-w-measure text-m-lede text-paper/80">
                No account to create, no download to sit through on truck-stop wifi. Two taps and
                it&apos;s on your home screen — and it keeps working when the bars run out.
              </p>
              <p className="mt-4 max-w-measure text-m-body text-paper/60">
                Already drive for us? Add it now. Not with us yet?{" "}
                <Link
                  href="/apply"
                  className="font-semibold text-signal-up underline-offset-4 hover:underline"
                >
                  Apply first
                </Link>{" "}
                — you&apos;ll get a login once you&apos;re on with us.
              </p>
            </Reveal>

            <Reveal index={1} className="rounded-m-4 bg-paper p-6 shadow-m-e4 md:p-8">
              <h2 className="font-display text-m-h4 font-bold text-ink">Add it to your phone</h2>
              <p className="mt-1.5 text-m-body text-ink-2">
                We&apos;ll show the steps for the phone you&apos;re holding.
              </p>
              <div className="mt-5">
                <GetTheApp />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container px-4">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 className="font-display text-m-h2 font-bold text-ink">What it does</h2>
            <p className="mt-3 text-m-body text-ink-2">
              Built for the cab, not for a desk. Big targets, dark screen at night, and it assumes
              you&apos;re holding it one-handed.
            </p>
          </Reveal>

          <ul className="mx-auto mt-10 grid max-w-4xl list-none gap-x-10 gap-y-8 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.title} index={Math.min(i, 4)}>
                <f.icon className="h-5 w-5 text-signal" aria-hidden />
                <h3 className="mt-3 font-display text-m-h4 font-bold text-ink">{f.title}</h3>
                <p className="mt-2 max-w-measure text-m-body text-ink-2">{f.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-ink/10 py-12">
        <div className="container px-4">
          <Reveal className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
            <p className="max-w-measure text-m-body text-ink-2">
              Trouble installing it? Call the office and we&apos;ll walk you through it — it takes
              about a minute.
            </p>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex min-h-[44px] items-center gap-2 font-display text-m-body font-bold uppercase tracking-wide text-signal underline-offset-4 transition-colors duration-base ease-entrance hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              {COMPANY_INFO.phone} <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
