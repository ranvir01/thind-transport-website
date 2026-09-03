import Link from "next/link"
import { Plus } from "lucide-react"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { requireOfficeUser } from "@/lib/hub/session"
import { Panel, PageHeader, ExpiryPill, EmptyState, Pill, btnPrimaryCls } from "@/components/hub/ui"
import type { PillTone } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Tone is data, not decoration: in service / in the shop / parked / gone. */
const STATUS_TONE: Record<string, PillTone> = {
  active: "ok",
  shop: "warn",
  idle: "neutral",
  retired: "bad",
}

function StatusPill({ status }: { status: string }) {
  return (
    <Pill tone={STATUS_TONE[status] ?? "neutral"} size="xs" className="uppercase tracking-wider">
      {status}
    </Pill>
  )
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await requireOfficeUser()
  const { tab } = await searchParams
  const showTrailers = tab === "trailers"
  const [trucks, trailers] = await Promise.all([listTrucks(user.carrierId), listTrailers(user.carrierId)])

  return (
    <div>
      <PageHeader
        title="Fleet"
        subtitle="Trucks, trailers, and their paperwork."
        action={
          <Link
            href={showTrailers ? "/hub/fleet/trailers/new" : "/hub/fleet/trucks/new"}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> {showTrailers ? "Add trailer" : "Add truck"}
          </Link>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <Link
          href="/hub/fleet"
          className={cn(
            "min-h-[44px] inline-flex items-center rounded-control px-5 text-sm font-bold",
            !showTrailers ? "bg-accent-soft text-accent-text border border-accent-soft" : "text-fg-2 hover:bg-hover border border-border"
          )}
        >
          Trucks ({trucks.length})
        </Link>
        <Link
          href="/hub/fleet?tab=trailers"
          className={cn(
            "min-h-[44px] inline-flex items-center rounded-control px-5 text-sm font-bold",
            showTrailers ? "bg-accent-soft text-accent-text border border-accent-soft" : "text-fg-2 hover:bg-hover border border-border"
          )}
        >
          Trailers ({trailers.length})
        </Link>
      </div>

      {!showTrailers ? (
        trucks.length === 0 ? (
          <EmptyState
            title="No trucks yet"
            hint="Add your first truck to start dispatching."
            action={
              <Link href="/hub/fleet/trucks/new" className={btnPrimaryCls}>
                <Plus className="h-4 w-4" /> Add truck
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {trucks.map((truck) => (
              <Link key={truck.id} href={`/hub/fleet/trucks/${truck.id}`}>
                <Panel className="p-4 h-full hover:border-border-strong transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xl text-fg">#{truck.unit_number}</span>
                    <StatusPill status={truck.status} />
                  </div>
                  <p className="text-body-sm text-fg-2 mt-1">
                    {[truck.year, truck.make, truck.model].filter(Boolean).join(" ") || "Specs not set"}
                  </p>
                  <p className="text-body-xs text-fg-3 mt-0.5">
                    {truck.ownership === "owner_operator" ? "Owner-operator" : "Company"} ·{" "}
                    {truck.driver_name ?? "No driver"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-fg-3">
                    <span className="flex items-center gap-1">Reg <ExpiryPill date={truck.registration_expiry} /></span>
                    <span className="flex items-center gap-1">Insp <ExpiryPill date={truck.inspection_due} /></span>
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        )
      ) : trailers.length === 0 ? (
        <EmptyState
          title="No trailers yet"
          hint="Add trailers to assign them to loads."
          action={
            <Link href="/hub/fleet/trailers/new" className={btnPrimaryCls}>
              <Plus className="h-4 w-4" /> Add trailer
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {trailers.map((trailer) => (
            <Link key={trailer.id} href={`/hub/fleet/trailers/${trailer.id}`}>
              <Panel className="p-4 h-full hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xl text-fg">#{trailer.unit_number}</span>
                  <StatusPill status={trailer.status} />
                </div>
                <p className="text-body-sm text-fg-2 mt-1 capitalize">
                  {trailer.type.replace("_", " ")}
                  {trailer.year ? ` · ${trailer.year}` : ""}
                  {trailer.make ? ` ${trailer.make}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-fg-3">
                  <span className="flex items-center gap-1">Reg <ExpiryPill date={trailer.registration_expiry} /></span>
                  <span className="flex items-center gap-1">Insp <ExpiryPill date={trailer.inspection_due} /></span>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
