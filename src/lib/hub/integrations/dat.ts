/**
 * DAT load board — first `LoadSource` adapter (stub-first per
 * docs/integrations/dat.md; see registry.ts for why this is `LoadSource`,
 * not `SyncSource<Row>`). A dispatcher searches on demand from the
 * loadboard screen; there is no background poll to wire into a cron job,
 * which is why `dat`/`truckstop` are `sync: "manual"` in the registry.
 *
 * Scope for this slice: search only. Booking a load is a separate,
 * larger action (it writes a load record, not just displays a posting)
 * and is out of scope until DAT's search shape is confirmed for real —
 * see the Open questions in docs/integrations/dat.md.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { dollarsToCents } from "../types"
import type { LoadSearchCriteria, LoadSource, SyncRowBase } from "./registry"

export interface DatLoadRow extends SyncRowBase {
  originCity: string | null
  originState: string
  destCity: string | null
  destState: string | null
  equipmentType: string | null
  rateTotalCents: number | null
  miles: number | null
  postedAt: string
}

/**
 * Pure normalizer — the ONE place the assumed DAT posting shape is read.
 * Swapping in the confirmed shape once a real service account replies
 * only touches this function; the adapter and contract tests stay
 * untouched (same pattern as normalizeWexRecord/normalizeComdataRow).
 */
export function normalizeDatLoad(posting: Record<string, unknown>): DatLoadRow {
  const rate = posting.rateTotal
  const miles = posting.tripMiles

  return {
    external_id: String(posting.postingId ?? ""),
    originCity: (posting.originCity as string) ?? null,
    originState: String(posting.originState ?? ""),
    destCity: (posting.destCity as string) ?? null,
    destState: (posting.destState as string) ?? null,
    equipmentType: (posting.equipmentType as string) ?? null,
    rateTotalCents: rate != null ? dollarsToCents(rate as number) : null,
    miles: typeof miles === "number" ? miles : miles != null ? Number(miles) || null : null,
    postedAt: String(posting.postedAt ?? new Date().toISOString()),
  }
}

/** DAT load board client (docs/integrations/dat.md — shape unconfirmed until a service account is live). */
export function datSource(carrierId: string): LoadSource<DatLoadRow> {
  const base = process.env.DAT_API_BASE ?? "https://identity.dat.com"

  return {
    provider: "dat",
    async connected() {
      return hasCredentials(carrierId, "dat")
    },
    async search(criteria: LoadSearchCriteria) {
      const creds = await getCredentials(carrierId, "dat")
      if (!creds?.serviceAccountEmail || !creds?.password) throw new Error("dat is not connected")

      const auth = Buffer.from(`${creds.serviceAccountEmail}:${creds.password}`).toString("base64")
      const params = new URLSearchParams({ originState: criteria.originState })
      if (criteria.destState) params.set("destState", criteria.destState)
      if (criteria.equipmentType) params.set("equipmentType", criteria.equipmentType)

      const response = await fetch(`${base}/loadboard/search?${params}`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`DAT search → HTTP ${response.status}`)
      const json = (await response.json()) as { postings?: unknown[] }
      return ((json.postings ?? []) as Record<string, unknown>[]).map(normalizeDatLoad)
    },
  }
}
