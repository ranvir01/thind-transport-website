import { requireOfficeUser } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { hubDbAvailable } from "@/lib/hub/db-available"
import { fallbackCandidates } from "@/lib/hub/sandbox-fallback"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

interface Candidate {
  id: string
  source: string
  broker_name: string
  equipment: string
  origin_city: string
  origin_state: string
  dest_city: string
  dest_state: string
  linehaul_cents: number
  fuel_surcharge_cents: number
  loaded_miles: number
  deadhead_miles: number
  score: {
    score?: number
    math?: {
      ratePerTotalMile?: string
      estimatedFuelCents?: number
      estimatedTollsCents?: number
      netAfterFuelAndTollsCents?: number
      netPerTotalMile?: string
      explanation?: string
    }
  }
}

export default async function RankerPage() {
  const user = await requireOfficeUser()
  const carrierIds = user.companyScope === "all" && user.allowedCarrierIds?.length
    ? user.allowedCarrierIds
    : [user.carrierId]
  const candidates = hubDbAvailable()
    ? await query<Candidate>(
        `SELECT * FROM hub.load_candidates
         WHERE carrier_id = ANY($1::uuid[])
         ORDER BY COALESCE((score->>'score')::int, 0) DESC, created_at DESC
         LIMIT 5`,
        [carrierIds]
      )
    : carrierIds.flatMap((carrierId) => fallbackCandidates(carrierId)).slice(0, 5) as Candidate[]

  return (
    <div>
      <PageHeader
        title="Best-load ranker"
        subtitle="Deterministic sandbox scorer. Every point shows its math — no AI black box."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {candidates.map((candidate, index) => {
          const totalCents = candidate.linehaul_cents + candidate.fuel_surcharge_cents
          const totalMiles = candidate.loaded_miles + candidate.deadhead_miles
          return (
            <Panel key={candidate.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">#{index + 1} · {candidate.source}</p>
                  <h2 className="mt-1 text-lg font-bold text-white">{candidate.broker_name}</h2>
                  <p className="mt-1 text-sm text-steel-200">
                    {candidate.origin_city}, {candidate.origin_state} → {candidate.dest_city}, {candidate.dest_state}
                  </p>
                </div>
                <div className="rounded-2xl border border-gold/40 bg-gold/15 px-4 py-2 text-center">
                  <p className="text-2xl font-black tabular-nums text-gold">{candidate.score?.score ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gold">score</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/5 p-3">
                  <dt className="text-steel-300">All-in rate</dt>
                  <dd className="mt-1 text-right font-bold tabular-nums text-white">{fmtCents(totalCents)}</dd>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <dt className="text-steel-300">Total miles</dt>
                  <dd className="mt-1 text-right font-bold tabular-nums text-white">{totalMiles.toLocaleString()}</dd>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <dt className="text-steel-300">Rate / total mi</dt>
                  <dd className="mt-1 text-right font-bold tabular-nums text-white">${candidate.score?.math?.ratePerTotalMile ?? (totalCents / 100 / totalMiles).toFixed(2)}</dd>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <dt className="text-steel-300">Estimated fuel</dt>
                  <dd className="mt-1 text-right font-bold tabular-nums text-white">{fmtCents(candidate.score?.math?.estimatedFuelCents ?? 0)}</dd>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <dt className="text-steel-300">Fuel + toll net</dt>
                  <dd className="mt-1 text-right font-bold tabular-nums text-white">{fmtCents(candidate.score?.math?.netAfterFuelAndTollsCents ?? totalCents)}</dd>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <dt className="text-steel-300">Net / total mi</dt>
                  <dd className="mt-1 text-right font-bold tabular-nums text-white">${candidate.score?.math?.netPerTotalMile ?? (totalCents / 100 / totalMiles).toFixed(2)}</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-xl border border-white/10 p-3 text-sm text-steel-100">
                Math shown: {candidate.score?.math?.explanation ?? "sample history pending"}.
              </p>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
