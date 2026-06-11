"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ScanSearch } from "lucide-react"
import { saveTruckAction, saveTrailerAction, decodeVinAction } from "@/app/hub/_actions/fleet"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import type { Option } from "@/components/hub/LoadForm"

const STATUSES = ["active", "shop", "idle", "retired"] as const

export interface TruckFormState {
  unit_number: string
  vin: string
  plate: string
  plate_state: string
  year: string
  make: string
  model: string
  ownership: string
  status: string
  registration_expiry: string
  inspection_due: string
  insurance_expiry: string
  assigned_driver_id: string
  notes: string
}

export function emptyTruck(): TruckFormState {
  return {
    unit_number: "", vin: "", plate: "", plate_state: "", year: "", make: "", model: "",
    ownership: "company", status: "active", registration_expiry: "", inspection_due: "",
    insurance_expiry: "", assigned_driver_id: "", notes: "",
  }
}

export function TruckForm({
  truckId,
  initial,
  drivers,
}: {
  truckId?: string
  initial: TruckFormState
  drivers: Option[]
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [decoding, setDecoding] = useState(false)
  const set = (patch: Partial<TruckFormState>) => setForm((f) => ({ ...f, ...patch }))

  const decode = async () => {
    if (!form.vin.trim()) {
      toast.error("Enter a VIN first")
      return
    }
    setDecoding(true)
    try {
      const result = await decodeVinAction(form.vin)
      if (result && (result.year || result.make || result.model)) {
        set({
          year: result.year?.toString() ?? form.year,
          make: result.make ?? form.make,
          model: result.model ?? form.model,
        })
        toast.success("VIN decoded — specs filled in")
      } else {
        toast.error("Could not decode that VIN")
      }
    } finally {
      setDecoding(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveTruckAction(truckId ?? null, { ...form })
      if (result.ok) {
        toast.success(truckId ? "Truck updated" : "Truck added")
        router.push("/hub/fleet")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save truck")
      }
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Panel className="p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="unit_number">Unit number *</label>
            <input id="unit_number" required className={fieldCls} value={form.unit_number}
              onChange={(e) => set({ unit_number: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="vin">VIN</label>
            <div className="flex gap-2">
              <input id="vin" className={fieldCls} value={form.vin}
                onChange={(e) => set({ vin: e.target.value.toUpperCase() })} />
              <button type="button" onClick={decode} disabled={decoding}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50">
                {decoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
                Decode
              </button>
            </div>
            <p className="mt-1 text-body-xs text-steel-400">Free NHTSA decode fills year/make/model.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div>
              <label className={labelCls} htmlFor="year">Year</label>
              <input id="year" type="number" inputMode="numeric" className={fieldCls} value={form.year}
                onChange={(e) => set({ year: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="make">Make</label>
              <input id="make" className={fieldCls} value={form.make}
                onChange={(e) => set({ make: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="model">Model</label>
              <input id="model" className={fieldCls} value={form.model}
                onChange={(e) => set({ model: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <div>
              <label className={labelCls} htmlFor="plate">Plate</label>
              <input id="plate" className={fieldCls} value={form.plate}
                onChange={(e) => set({ plate: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="plate_state">State</label>
              <input id="plate_state" maxLength={2} className={fieldCls} value={form.plate_state}
                onChange={(e) => set({ plate_state: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="ownership">Ownership</label>
            <select id="ownership" className={fieldCls} value={form.ownership}
              onChange={(e) => set({ ownership: e.target.value })}>
              <option value="company">Company</option>
              <option value="owner_operator">Owner-operator</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="status">Status</label>
            <select id="status" className={fieldCls} value={form.status}
              onChange={(e) => set({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="assigned_driver">Assigned driver</label>
            <select id="assigned_driver" className={fieldCls} value={form.assigned_driver_id}
              onChange={(e) => set({ assigned_driver_id: e.target.value })}>
              <option value="">Unassigned</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="registration_expiry">Registration expiry</label>
            <input id="registration_expiry" type="date" className={fieldCls} value={form.registration_expiry}
              onChange={(e) => set({ registration_expiry: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="inspection_due">Annual inspection due</label>
            <input id="inspection_due" type="date" className={fieldCls} value={form.inspection_due}
              onChange={(e) => set({ inspection_due: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="insurance_expiry">Insurance expiry</label>
            <input id="insurance_expiry" type="date" className={fieldCls} value={form.insurance_expiry}
              onChange={(e) => set({ insurance_expiry: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="truck_notes">Notes</label>
          <textarea id="truck_notes" rows={2} className={`${fieldCls} h-auto py-3`} value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <button type="submit" disabled={pending}
          className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-8 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {truckId ? "Save truck" : "Add truck"}
        </button>
      </Panel>
    </form>
  )
}

export interface TrailerFormState {
  unit_number: string
  vin: string
  plate: string
  plate_state: string
  year: string
  make: string
  type: string
  status: string
  registration_expiry: string
  inspection_due: string
  notes: string
}

export function emptyTrailer(): TrailerFormState {
  return {
    unit_number: "", vin: "", plate: "", plate_state: "", year: "", make: "",
    type: "dry_van", status: "active", registration_expiry: "", inspection_due: "", notes: "",
  }
}

export function TrailerForm({
  trailerId,
  initial,
}: {
  trailerId?: string
  initial: TrailerFormState
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [pending, startTransition] = useTransition()
  const set = (patch: Partial<TrailerFormState>) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveTrailerAction(trailerId ?? null, { ...form })
      if (result.ok) {
        toast.success(trailerId ? "Trailer updated" : "Trailer added")
        router.push("/hub/fleet?tab=trailers")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save trailer")
      }
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Panel className="p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="t_unit">Unit number *</label>
            <input id="t_unit" required className={fieldCls} value={form.unit_number}
              onChange={(e) => set({ unit_number: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="t_type">Type</label>
            <select id="t_type" className={fieldCls} value={form.type}
              onChange={(e) => set({ type: e.target.value })}>
              <option value="dry_van">Dry Van</option>
              <option value="reefer">Reefer</option>
              <option value="flatbed">Flatbed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor="t_year">Year</label>
              <input id="t_year" type="number" inputMode="numeric" className={fieldCls} value={form.year}
                onChange={(e) => set({ year: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t_make">Make</label>
              <input id="t_make" className={fieldCls} value={form.make}
                onChange={(e) => set({ make: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <div>
              <label className={labelCls} htmlFor="t_plate">Plate</label>
              <input id="t_plate" className={fieldCls} value={form.plate}
                onChange={(e) => set({ plate: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t_plate_state">State</label>
              <input id="t_plate_state" maxLength={2} className={fieldCls} value={form.plate_state}
                onChange={(e) => set({ plate_state: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="t_status">Status</label>
            <select id="t_status" className={fieldCls} value={form.status}
              onChange={(e) => set({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="t_reg">Registration expiry</label>
            <input id="t_reg" type="date" className={fieldCls} value={form.registration_expiry}
              onChange={(e) => set({ registration_expiry: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="t_insp">Annual inspection due</label>
            <input id="t_insp" type="date" className={fieldCls} value={form.inspection_due}
              onChange={(e) => set({ inspection_due: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="t_notes">Notes</label>
          <textarea id="t_notes" rows={2} className={`${fieldCls} h-auto py-3`} value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <button type="submit" disabled={pending}
          className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-8 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {trailerId ? "Save trailer" : "Add trailer"}
        </button>
      </Panel>
    </form>
  )
}
