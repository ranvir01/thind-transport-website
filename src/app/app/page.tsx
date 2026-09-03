import { Metadata } from "next"
import Link from "next/link"
import { CloudOff, Camera, Wallet, Bell, MessageSquare } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { GetTheApp } from "@/components/features/GetTheApp"
import { APP_ICONS } from "@/lib/site-icons"
import { Reveal } from "@/components/ui/Reveal"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

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
 *
 * It sits on the navy shell behind the shared <AsphaltHero> rather than on its
 * own paper ground with a hand-rolled asphalt band on top. <GetTheApp> is the
 * one paper island, and the one red on its screen is that island's button —
 * the hero's red is the anchor that scrolls to it.
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
    <div className="brand-page-shell overflow-x-hidden">
      {/* Next emits only the standardised `mobile-web-app-capable` from
          appleWebApp.capable; iOS keys standalone launch off the apple-prefixed
          name. React hoists this into <head>. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />

      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Driver app"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="For our drivers"
        title="Two taps and it's on your phone. No app store."
        description="No account to create, no download to sit through on truck-stop wifi. Two taps and it's on your home screen — and it keeps working when the bars run out."
        applyHref="#install"
        applyLabel="Add it to your phone"
      />

      <section id="install" aria-labelledby="install-heading" className="scroll-mt-24 py-section">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <h2
                id="install-heading"
                className="font-display text-m-h2 font-bold text-balance text-white"
              >
                Add it to your phone
              </h2>
              <p className="mt-3 text-m-body text-steel-300">
                We&apos;ll show the steps for the phone you&apos;re holding.
              </p>
              <p className="mt-3 text-m-body text-steel-300">
                <span>Already drive for us? Add it now. Not with us yet? </span>
                <Link
                  href="/apply"
                  className="font-semibold text-white underline-offset-4 hover:underline"
                >
                  Apply first
                </Link>
                <span> — you&apos;ll get a login once you&apos;re on with us.</span>
              </p>
            </Reveal>

            <div className="mt-8">
              <GetTheApp />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="features-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              What it does
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Built for the cab, not for a desk. Big targets, dark screen at night, and it assumes
              you&apos;re holding it one-handed.
            </p>
          </Reveal>

          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <f.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{f.title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <RelatedLinks
        title="Keep going"
        intro="The rest of what the site does for you."
        links={driverLinks(["/app"])}
        tone="dark"
      />

      {/* The page's ONE closing block: no second install button, just the desk. */}
      <section aria-labelledby="app-help-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="app-help-heading"
              className="font-display text-m-h3 font-bold text-balance text-white"
            >
              Stuck on the install?
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Call the office and we&apos;ll walk you through it — it takes a couple of screens.
            </p>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="mt-6 inline-flex min-h-[48px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
            >
              <span>Call</span>
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
