"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react"
import {
  bookDatPostingAction,
  searchDatFreightAction,
} from "@/app/hub/_actions/dat-freight"
import {
  bookTruckstopPostingAction,
  searchTruckstopFreightAction,
} from "@/app/hub/_actions/truckstop-freight"
import { btnPrimaryCls, btnSecondaryCls, fieldCls, labelCls, moneyCls, Panel } from "@/components/hub/ui"
import { EQUIPMENT_LABELS, EQUIPMENT_TYPES, centsToDollars } from "@/lib/hub/types"
import type { DatLoadPosting } from "@/lib/hub/integrations/dat"
import type { TruckstopLoadPosting } from "@/lib/hub/integrations/truckstop"

type FreightProvider = "dat" | "truckstop"
type FreightPosting = DatLoadPosting | TruckstopLoadPosting

interface CustomerOption {
  id: string
  label: string
}

interface LoadBoardFreightSearchProps {
  customers: CustomerOption[]
  canBook: boolean
  datConnected: boolean
  truckstopConnected: boolean
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY",
]

const PROVIDER_LABELS: Record<FreightProvider, string> = {
  dat: "DAT",
  truckstop: "Truckstop.com",
}

const EQUIPMENT_TO_BOARD: Record<string, string> = {
  dry_van: "Van",
  reefer: "Reefer",
  flatbed: "Flatbed",
}

function laneLabel(posting: FreightPosting): string {
  const origin = [posting.originCity, posting.originState].filter(Boolean).join(", ")
  const dest = [posting.destCity, posting.destState].filter(Boolean).join(", ")
  if (origin && dest) return `${origin} → ${dest}`
  return origin || dest || posting.external_id
}

function providerConnected(provider: FreightProvider, props: LoadBoardFreightSearchProps): boolean {
  return provider === "dat" ? props.datConnected : props.truckstopConnected
}

export function LoadBoardFreightSearch({
  customers,
  canBook,
  datConnected,
  truckstopConnected,
}: LoadBoardFreightSearchProps) {
  const router = useRouter()
  const anyConnected = datConnected || truckstopConnected
  const defaultProvider: FreightProvider = datConnected ? "dat" : truckstopConnected ? "truckstop" : "dat"

  const [open, setOpen] = useState(anyConnected)
  const [provider, setProvider] = useState<FreightProvider>(defaultProvider)
  const [pending, startTransition] = useTransition()
  const [postings, setPostings] = useState<FreightPosting[]>([])
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [customerByPosting, setCustomerByPosting] = useState<Record<string, string>>({})
  const [criteria, setCriteria] = useState({
    originCity: "",
    originState: "WA",
    destState: "",
    equipment: "dry_van",
    radiusMiles: "100",
  })

  const activeConnected = providerConnected(provider, { customers, canBook, datConnected, truckstopConnected })

  const searchCriteria = {
    originCity: criteria.originCity.trim() || undefined,
    originState: criteria.originState || undefined,
    destState: criteria.destState || undefined,
    equipment: EQUIPMENT_TO_BOARD[criteria.equipment] ?? criteria.equipment,
    radiusMiles: Number(criteria.radiusMiles) || 100,
  }

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConnected) {
      toast.error(`Connect ${provider === "truckstop" ? "Truckstop.com" : PROVIDER_LABELS[provider]} under Settings → Integrations first`)
      return
    }
    startTransition(async () => {
      const result =
        provider === "dat"
          ? await searchDatFreightAction(searchCriteria)
          : await searchTruckstopFreightAction(searchCriteria)

      if (!result.ok) {
        setPostings([])
        toast.error(result.error ?? "Search failed")
        return
      }
      setPostings(result.postings ?? [])
      setCustomerByPosting({})
      if ((result.postings?.length ?? 0) === 0) {
        toast.message("No matches — widen the radius or change lanes")
      }
    })
  }

  const book = (posting: FreightPosting) => {
    const customerId = customerByPosting[posting.external_id]
    if (!customerId) {
      toast.error("Pick a customer for this posting")
      return
    }
    setBookingId(posting.external_id)
    startTransition(async () => {
      const result =
        provider === "dat"
          ? await bookDatPostingAction(customerId, posting.raw)
          : await bookTruckstopPostingAction(customerId, posting.raw)

      setBookingId(null)
      if (result.ok && result.id) {
        toast.success(`Load booked from ${PROVIDER_LABELS[provider]} posting`)
        router.push(`/hub/loads/${result.id}`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not book posting")
      }
    })
  }

  const switchProvider = (next: FreightProvider) => {
    if (next === provider) return
    setProvider(next)
    setPostings([])
    setCustomerByPosting({})
  }

  return (
    <Panel
      className="mb-4"
      title="External freight search"
      action={
        <button
          type="button"
          className={btnSecondaryCls}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Hide" : "Search boards"}
        </button>
      }
    >
      {!anyConnected ? (
        <p className="text-sm text-fg-2">
          Connect DAT or Truckstop under{" "}
          <Link href="/hub/settings/integrations" className="font-semibold text-accent-text hover:underline">
            Settings → Integrations
          </Link>{" "}
          to search freight here. Paste rate cons manually until then.
        </p>
      ) : open ? (
        <div className="space-y-4">
          <div
            className="inline-flex rounded-control border border-border bg-surface-2 p-0.5"
            role="tablist"
            aria-label="Load board provider"
          >
            {(["dat", "truckstop"] as const).map((key) => {
              const connected = providerConnected(key, { customers, canBook, datConnected, truckstopConnected })
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={provider === key}
                  disabled={!connected}
                  className={`min-h-11 rounded-control px-4 py-2 text-sm font-semibold transition-colors ${
                    provider === key
                      ? "bg-surface text-fg shadow-sm"
                      : connected
                        ? "text-fg-2 hover:text-fg"
                        : "cursor-not-allowed text-fg-3"
                  }`}
                  onClick={() => switchProvider(key)}
                >
                  {PROVIDER_LABELS[key]}
                  {!connected ? " (off)" : ""}
                </button>
              )
            })}
          </div>

          {!activeConnected ? (
            <p className="text-sm text-fg-2">
              {PROVIDER_LABELS[provider]} isn&apos;t connected —{" "}
              <Link href="/hub/settings/integrations" className="font-semibold text-accent-text hover:underline">
                add credentials
              </Link>{" "}
              or switch to the other board.
            </p>
          ) : (
            <>
              <form onSubmit={search} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="freight-origin-city">
                    Origin city
                  </label>
                  <input
                    id="freight-origin-city"
                    className={fieldCls}
                    value={criteria.originCity}
                    onChange={(e) => setCriteria((c) => ({ ...c, originCity: e.target.value }))}
                    placeholder="Kent"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="freight-origin-state">
                    Origin state
                  </label>
                  <select
                    id="freight-origin-state"
                    className={fieldCls}
                    value={criteria.originState}
                    onChange={(e) => setCriteria((c) => ({ ...c, originState: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="freight-dest-state">
                    Dest state
                  </label>
                  <select
                    id="freight-dest-state"
                    className={fieldCls}
                    value={criteria.destState}
                    onChange={(e) => setCriteria((c) => ({ ...c, destState: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="freight-equipment">
                    Equipment
                  </label>
                  <select
                    id="freight-equipment"
                    className={fieldCls}
                    value={criteria.equipment}
                    onChange={(e) => setCriteria((c) => ({ ...c, equipment: e.target.value }))}
                  >
                    {EQUIPMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {EQUIPMENT_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="freight-radius">
                    Radius (mi)
                  </label>
                  <input
                    id="freight-radius"
                    type="number"
                    min={25}
                    max={500}
                    className={fieldCls}
                    value={criteria.radiusMiles}
                    onChange={(e) => setCriteria((c) => ({ ...c, radiusMiles: e.target.value }))}
                  />
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-6">
                  <button type="submit" className={btnPrimaryCls} disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search {PROVIDER_LABELS[provider]}
                  </button>
                </div>
              </form>

              {postings.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-3">
                    {postings.length} match{postings.length === 1 ? "" : "es"}
                  </p>
                  <div className="overflow-x-auto rounded-control border border-border">
                    <table className="min-w-[640px] w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-3">
                          <th className="px-3 py-2">Lane</th>
                          <th className="px-3 py-2">Equip</th>
                          <th className="px-3 py-2 text-right">Miles</th>
                          <th className="px-3 py-2 text-right">Rate</th>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {postings.map((posting) => (
                          <tr key={posting.external_id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-medium text-fg">{laneLabel(posting)}</td>
                            <td className="px-3 py-2 text-fg-2">{posting.equipment ?? "—"}</td>
                            <td className={`px-3 py-2 text-right ${moneyCls}`}>{posting.miles ?? "—"}</td>
                            <td className={`px-3 py-2 text-right ${moneyCls}`}>
                              {posting.rateTotalCents != null ? `$${centsToDollars(posting.rateTotalCents)}` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className={fieldCls}
                                value={customerByPosting[posting.external_id] ?? ""}
                                disabled={!canBook}
                                onChange={(e) =>
                                  setCustomerByPosting((prev) => ({
                                    ...prev,
                                    [posting.external_id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select customer…</option>
                                {customers.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {canBook ? (
                                <button
                                  type="button"
                                  className={btnSecondaryCls}
                                  disabled={pending && bookingId === posting.external_id}
                                  onClick={() => book(posting)}
                                >
                                  {pending && bookingId === posting.external_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : null}
                                  Book
                                </button>
                              ) : (
                                <span className="text-xs text-fg-3">Read-only</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-fg-2">
          Search DAT or Truckstop freight by lane and book a posting straight onto your load board.
        </p>
      )}
    </Panel>
  )
}
