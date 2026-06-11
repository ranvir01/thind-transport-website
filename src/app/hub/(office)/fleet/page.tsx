import Link from "next/link"
import { Plus } from "lucide-react"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { requireOfficeUser } from "@/lib/hub/session"
import { Panel, PageHeader, ExpiryPill, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  shop: "bg-gold-500/15 text-gold-300 border-gold-400/30",
  idle: "bg-steel-700/60 text-steel-200 border-steel-500/40",
  retired: "bg-red-500/15 text-red-300 border-red-400/30",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[status])}>
      {status}
    </span>
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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400"
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
            "min-h-[44px] inline-flex items-center rounded-xl px-5 text-sm font-bold",
            !showTrailers ? "bg-orange/15 text-white border border-orange/30" : "text-steel-200 hover:bg-white/5 border border-white/10"
          )}
        >
          Trucks ({trucks.length})
        </Link>
        <Link
          href="/hub/fleet?tab=trailers"
          className={cn(
            "min-h-[44px] inline-flex items-center rounded-xl px-5 text-sm font-bold",
            showTrailers ? "bg-orange/15 text-white border border-orange/30" : "text-steel-200 hover:bg-white/5 border border-white/10"
          )}
        >
          Trailers ({trailers.length})
        </Link>
      </div>

      {!showTrailers ? (
        trucks.length === 0 ? (
          <EmptyState title="No trucks yet" hint="Add your first truck to start dispatching." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {trucks.map((truck) => (
              <Link key={truck.id} href={`/hub/fleet/trucks/${truck.id}`}>
                <Panel className="p-4 h-full hover:border-white/20 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl font-extrabold text-white">#{truck.unit_number}</span>
                    <StatusPill status={truck.status} />
                  </div>
                  <p className="text-body-sm text-steel-200 mt-1">
                    {[truck.year, truck.make, truck.model].filter(Boolean).join(" ") || "Specs not set"}
                  </p>
                  <p className="text-body-xs text-steel-300 mt-0.5">
                    {truck.ownership === "owner_operator" ? "Owner-operator" : "Company"} ·{" "}
                    {truck.driver_name ?? "No driver"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-steel-300">
                    <span className="flex items-center gap-1">Reg <ExpiryPill date={truck.registration_expiry} /></span>
                    <span className="flex items-center gap-1">Insp <ExpiryPill date={truck.inspection_due} /></span>
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        )
      ) : trailers.length === 0 ? (
        <EmptyState title="No trailers yet" hint="Add trailers to assign them to loads." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {trailers.map((trailer) => (
            <Link key={trailer.id} href={`/hub/fleet/trailers/${trailer.id}`}>
              <Panel className="p-4 h-full hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xl font-extrabold text-white">#{trailer.unit_number}</span>
                  <StatusPill status={trailer.status} />
                </div>
                <p className="text-body-sm text-steel-200 mt-1 capitalize">
                  {trailer.type.replace("_", " ")}
                  {trailer.year ? ` · ${trailer.year}` : ""}
                  {trailer.make ? ` ${trailer.make}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-steel-300">
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
