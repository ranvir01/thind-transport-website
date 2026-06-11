"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { createLoadAction, updateLoadAction } from "@/app/hub/_actions/loads"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { EQUIPMENT_LABELS, EQUIPMENT_TYPES } from "@/lib/hub/types"

export interface Option {
  id: string
  label: string
}

interface StopForm {
  type: "pickup" | "delivery"
  facility: string
  address: string
  city: string
  state: string
  zip: string
  appt_start: string
  notes: string
}

interface AccessorialForm {
  label: string
  amount: string
}

export interface LoadFormInitial {
  customer_id: string
  customer_reference: string
  equipment: string
  commodity: string
  weight_lbs: string
  linehaul: string
  fuel_surcharge: string
  loaded_miles: string
  deadhead_miles: string
  truck_id: string
  trailer_id: string
  driver_id: string
  notes: string
  stops: StopForm[]
  accessorials: AccessorialForm[]
}

const EMPTY_STOP = (type: "pickup" | "delivery"): StopForm => ({
  type, facility: "", address: "", city: "", state: "", zip: "", appt_start: "", notes: "",
})

export function LoadForm({
  loadId,
  initial,
  customers,
  drivers,
  trucks,
  trailers,
}: {
  loadId?: string
  initial: LoadFormInitial
  customers: Option[]
  drivers: Option[]
  trucks: Option[]
  trailers: Option[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<LoadFormInitial>(initial)
  const [pending, startTransition] = useTransition()

  const set = (patch: Partial<LoadFormInitial>) => setForm((f) => ({ ...f, ...patch }))
  const setStop = (index: number, patch: Partial<StopForm>) =>
    setForm((f) => ({
      ...f,
      stops: f.stops.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))

  const addStop = () => setForm((f) => ({ ...f, stops: [...f.stops, EMPTY_STOP("delivery")] }))
  const removeStop = (index: number) =>
    setForm((f) => ({ ...f, stops: f.stops.filter((_, i) => i !== index) }))

  const totalRate =
    (Number(form.linehaul) || 0) +
    (Number(form.fuel_surcharge) || 0) +
    form.accessorials.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      customer_id: form.customer_id,
      customer_reference: form.customer_reference,
      equipment: form.equipment,
      commodity: form.commodity,
      weight_lbs: form.weight_lbs,
      linehaul: form.linehaul || "0",
      fuel_surcharge: form.fuel_surcharge || "0",
      accessorials: form.accessorials
        .filter((a) => a.label.trim())
        .map((a) => ({ label: a.label, amount: a.amount || "0" })),
      loaded_miles: form.loaded_miles,
      deadhead_miles: form.deadhead_miles,
      truck_id: form.truck_id,
      trailer_id: form.trailer_id,
      driver_id: form.driver_id,
      notes: form.notes,
      stops: form.stops.map((s) => ({
        type: s.type, facility: s.facility, address: s.address, city: s.city,
        state: s.state, zip: s.zip, appt_start: s.appt_start, notes: s.notes,
      })),
    }
    startTransition(async () => {
      const result = loadId
        ? await updateLoadAction(loadId, payload)
        : await createLoadAction(payload)
      if (result.ok) {
        toast.success(loadId ? "Load updated" : "Load booked")
        router.push(`/hub/loads/${result.id}`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save load")
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-3xl">
      {/* Customer & equipment */}
      <Panel className="p-4 md:p-5 space-y-4">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Booking</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="customer">Customer / broker *</label>
            <select
              id="customer" required className={fieldCls} value={form.customer_id}
              onChange={(e) => set({ customer_id: e.target.value })}
            >
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="customer_reference">Broker load # / reference</label>
            <input
              id="customer_reference" className={fieldCls} value={form.customer_reference}
              onChange={(e) => set({ customer_reference: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="equipment">Equipment *</label>
            <select
              id="equipment" className={fieldCls} value={form.equipment}
              onChange={(e) => set({ equipment: e.target.value })}
            >
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="commodity">Commodity</label>
            <input
              id="commodity" className={fieldCls} value={form.commodity}
              onChange={(e) => set({ commodity: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="weight">Weight (lbs)</label>
            <input
              id="weight" type="number" inputMode="numeric" min="0" className={fieldCls}
              value={form.weight_lbs} onChange={(e) => set({ weight_lbs: e.target.value })}
            />
          </div>
        </div>
      </Panel>

      {/* Stops */}
      <Panel className="p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Stops</h2>
          <button
            type="button" onClick={addStop}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 px-3 text-xs font-semibold text-steel-100 hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" /> Add stop
          </button>
        </div>
        {form.stops.map((stop, i) => (
          <div key={i} className="rounded-xl border border-white/10 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <select
                aria-label="Stop type"
                className={`${fieldCls} w-40`}
                value={stop.type}
                onChange={(e) => setStop(i, { type: e.target.value as "pickup" | "delivery" })}
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
              {form.stops.length > 2 ? (
                <button
                  type="button" aria-label="Remove stop" onClick={() => removeStop(i)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                aria-label="Facility" placeholder="Facility name" className={fieldCls}
                value={stop.facility} onChange={(e) => setStop(i, { facility: e.target.value })}
              />
              <input
                aria-label="Address" placeholder="Street address" className={fieldCls}
                value={stop.address} onChange={(e) => setStop(i, { address: e.target.value })}
              />
              <div className="grid grid-cols-[1fr_72px_96px] gap-2">
                <input
                  aria-label="City" placeholder="City *" required className={fieldCls}
                  value={stop.city} onChange={(e) => setStop(i, { city: e.target.value })}
                />
                <input
                  aria-label="State" placeholder="ST *" required maxLength={2} className={fieldCls}
                  value={stop.state}
                  onChange={(e) => setStop(i, { state: e.target.value.toUpperCase() })}
                />
                <input
                  aria-label="ZIP" placeholder="ZIP" className={fieldCls}
                  value={stop.zip} onChange={(e) => setStop(i, { zip: e.target.value })}
                />
              </div>
              <input
                aria-label="Appointment" type="datetime-local" className={fieldCls}
                value={stop.appt_start} onChange={(e) => setStop(i, { appt_start: e.target.value })}
              />
            </div>
          </div>
        ))}
      </Panel>

      {/* Money */}
      <Panel className="p-4 md:p-5 space-y-4">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Rate</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls} htmlFor="linehaul">Linehaul ($) *</label>
            <input
              id="linehaul" type="number" inputMode="decimal" min="0" step="0.01" required
              className={fieldCls} value={form.linehaul}
              onChange={(e) => set({ linehaul: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="fsc">Fuel surcharge ($)</label>
            <input
              id="fsc" type="number" inputMode="decimal" min="0" step="0.01" className={fieldCls}
              value={form.fuel_surcharge} onChange={(e) => set({ fuel_surcharge: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="loaded_miles">Loaded miles</label>
            <input
              id="loaded_miles" type="number" inputMode="numeric" min="0" className={fieldCls}
              value={form.loaded_miles} onChange={(e) => set({ loaded_miles: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="deadhead">Deadhead miles</label>
            <input
              id="deadhead" type="number" inputMode="numeric" min="0" className={fieldCls}
              value={form.deadhead_miles} onChange={(e) => set({ deadhead_miles: e.target.value })}
            />
          </div>
        </div>

        {/* Accessorials */}
        <div className="space-y-2">
          {form.accessorials.map((acc, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label="Accessorial label" placeholder="Detention, lumper…" className={fieldCls}
                value={acc.label}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    accessorials: f.accessorials.map((a, j) => (j === i ? { ...a, label: e.target.value } : a)),
                  }))
                }
              />
              <input
                aria-label="Accessorial amount" type="number" inputMode="decimal" step="0.01"
                placeholder="$" className={`${fieldCls} w-32`}
                value={acc.amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    accessorials: f.accessorials.map((a, j) => (j === i ? { ...a, amount: e.target.value } : a)),
                  }))
                }
              />
              <button
                type="button" aria-label="Remove accessorial"
                onClick={() => setForm((f) => ({ ...f, accessorials: f.accessorials.filter((_, j) => j !== i) }))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, accessorials: [...f.accessorials, { label: "", amount: "" }] }))}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 px-3 text-xs font-semibold text-steel-100 hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" /> Add accessorial
          </button>
        </div>

        <p className="text-body-sm text-steel-200">
          Total rate:{" "}
          <span className="font-display font-extrabold text-gold text-lg">
            {totalRate.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </span>
          {form.loaded_miles && Number(form.loaded_miles) > 0 ? (
            <span className="ml-2 text-steel-300">
              ({(totalRate / Number(form.loaded_miles)).toFixed(2)}/mi)
            </span>
          ) : null}
        </p>
      </Panel>

      {/* Assignment */}
      <Panel className="p-4 md:p-5 space-y-4">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Assignment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls} htmlFor="driver">Driver</label>
            <select
              id="driver" className={fieldCls} value={form.driver_id}
              onChange={(e) => set({ driver_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="truck">Truck</label>
            <select
              id="truck" className={fieldCls} value={form.truck_id}
              onChange={(e) => set({ truck_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {trucks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="trailer">Trailer</label>
            <select
              id="trailer" className={fieldCls} value={form.trailer_id}
              onChange={(e) => set({ trailer_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {trailers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="notes">Notes</label>
          <textarea
            id="notes" rows={3}
            className={`${fieldCls} h-auto py-3`}
            value={form.notes} onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
      </Panel>

      <button
        type="submit" disabled={pending}
        className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-8 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loadId ? "Save changes" : "Book load"}
      </button>
    </form>
  )
}
