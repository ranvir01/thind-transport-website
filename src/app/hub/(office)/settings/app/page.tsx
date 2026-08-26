import Link from "next/link"
import { headers } from "next/headers"
import { BellRing, MonitorSmartphone, Smartphone, Truck, WifiOff } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { PRODUCT } from "@/lib/hub/product"
import { PageHeader, Panel } from "@/components/hub/ui"
import { InstallAppButton } from "@/components/hub/InstallAppButton"
import { PushManager } from "@/components/hub/PushManager"
import { QrCode } from "@/components/hub/QrCode"

export const dynamic = "force-dynamic"

export const metadata = { title: "Phone app" }

// The team phone app IS the hub — a PWA that installs from the browser, no
// app store or separate build. This page is where any office user makes
// their phone a first-class LoadOff device: install, alerts, offline.
export default async function TeamAppPage() {
  await requireOfficeUser()
  const host = (await headers()).get("host") ?? "thindtransport.com"

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`${PRODUCT.name} on your phone`}
        subtitle="The same hub, installed like an app — dispatch, money, and alerts from anywhere. No app store needed."
      />

      <div className="space-y-4">
        <Panel title="1 · Install on this phone">
          <div className="space-y-3 p-4">
            <InstallAppButton appearance="office" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-xs text-fg-2">
              <div className="rounded-control border border-border bg-surface-2 p-3">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-fg">
                  <Smartphone className="h-3.5 w-3.5 text-accent-text" /> Android · Chrome
                </p>
                Tap the <span className="font-semibold text-fg">⋮ menu</span>, then{" "}
                <span className="font-semibold text-fg">Add to Home screen → Install</span>.
              </div>
              <div className="rounded-control border border-border bg-surface-2 p-3">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-fg">
                  <Smartphone className="h-3.5 w-3.5 text-accent-text" /> iPhone · Safari
                </p>
                Tap <span className="font-semibold text-fg">Share</span>, then{" "}
                <span className="font-semibold text-fg">Add to Home Screen</span>.
              </div>
            </div>
            <div className="hidden items-center gap-4 rounded-control border border-border bg-surface-2 p-3 sm:flex">
              <QrCode
                value={`${host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"}://${host}/hub/settings/app`}
                label="Opens this page on your phone"
                className="h-28 w-28 shrink-0 rounded-md"
              />
              <p className="text-body-xs text-fg-2">
                <span className="block font-semibold text-fg">Reading this on a computer?</span>
                Point your phone&apos;s camera here — it opens this page on the phone. Sign in with
                the same account, then tap install.
              </p>
            </div>
            <p className="flex items-start gap-2 text-body-xs text-fg-3 sm:hidden">
              <MonitorSmartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                On a computer? Open{" "}
                <span className="font-mono font-medium text-fg-2">{host}/hub</span>{" "}
                in your phone&apos;s browser and sign in with the same account.
              </span>
            </p>
          </div>
        </Panel>

        <Panel title="2 · Turn on alerts">
          <div className="space-y-2 p-4">
            <PushManager appearance="office" />
            <p className="flex items-start gap-2 text-body-xs text-fg-3">
              <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The same notifications as the bell — dispatch confirmations, PODs, messages, money
              events — delivered to your lock screen even when the app is closed.
            </p>
          </div>
        </Panel>

        <Panel title="3 · It keeps working without signal">
          <p className="flex items-start gap-2 p-4 text-body-xs text-fg-3">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Screens you&apos;ve opened stay available offline and reconnect automatically — a truck
            stop with no bars still shows you this morning&apos;s board.
          </p>
        </Panel>

        <Panel title="Drivers get their own app">
          <p className="flex items-start gap-2 p-4 text-body-xs text-fg-3">
            <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Driver accounts see the driver app — dispatch confirm, camera PODs, pay stubs, DVIR —
              and install it the same way from <span className="font-semibold text-fg-2">More → Install</span>.
              Invite them from{" "}
              <Link href="/hub/drivers" className="font-semibold text-accent-text hover:underline">
                Drivers
              </Link>
              .
            </span>
          </p>
        </Panel>
      </div>
    </div>
  )
}
