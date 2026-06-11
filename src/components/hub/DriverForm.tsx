"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { saveDriverAction } from "@/app/hub/_actions/people"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

export interface DriverFormState {
  first_name: string
  last_name: string
  phone: string
  email: string
  cdl_number: string
  cdl_state: string
  cdl_expiry: string
  medical_card_expiry: string
  hire_date: string
  pay_type: string
  pay_rate: string
  status: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
}

export function emptyDriver(): DriverFormState {
  return {
    first_name: "", last_name: "", phone: "", email: "", cdl_number: "", cdl_state: "",
    cdl_expiry: "", medical_card_expiry: "", hire_date: "", pay_type: "per_mile",
    pay_rate: "", status: "active", emergency_contact_name: "", emergency_contact_phone: "",
    notes: "",
  }
}

export function DriverForm({ driverId, initial }: { driverId?: string; initial: DriverFormState }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [pending, startTransition] = useTransition()
  const set = (patch: Partial<DriverFormState>) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveDriverAction(driverId ?? null, { ...form, pay_rate: form.pay_rate || "0" })
      if (result.ok) {
        toast.success(driverId ? "Driver updated" : "Driver added")
        router.push("/hub/drivers")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save driver")
      }
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Panel className="p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="first_name">First name *</label>
            <input id="first_name" required className={fieldCls} value={form.first_name}
              onChange={(e) => set({ first_name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="last_name">Last name *</label>
            <input id="last_name" required className={fieldCls} value={form.last_name}
              onChange={(e) => set({ last_name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="d_phone">Phone</label>
            <input id="d_phone" type="tel" className={fieldCls} value={form.phone}
              onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="d_email">Email</label>
            <input id="d_email" type="email" className={fieldCls} value={form.email}
              onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <div>
              <label className={labelCls} htmlFor="cdl_number">CDL number</label>
              <input id="cdl_number" className={fieldCls} value={form.cdl_number}
                onChange={(e) => set({ cdl_number: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cdl_state">State</label>
              <input id="cdl_state" maxLength={2} className={fieldCls} value={form.cdl_state}
                onChange={(e) => set({ cdl_state: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="cdl_expiry">CDL expiry</label>
            <input id="cdl_expiry" type="date" className={fieldCls} value={form.cdl_expiry}
              onChange={(e) => set({ cdl_expiry: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="med_expiry">Medical card expiry</label>
            <input id="med_expiry" type="date" className={fieldCls} value={form.medical_card_expiry}
              onChange={(e) => set({ medical_card_expiry: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="hire_date">Hire date</label>
            <input id="hire_date" type="date" className={fieldCls} value={form.hire_date}
              onChange={(e) => set({ hire_date: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="pay_type">Pay type</label>
            <select id="pay_type" className={fieldCls} value={form.pay_type}
              onChange={(e) => set({ pay_type: e.target.value })}>
              <option value="per_mile">Per mile (company driver)</option>
              <option value="percentage">Percentage (owner-operator)</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="pay_rate">
              {form.pay_type === "percentage" ? "Commission (e.g. 0.90 = 90%)" : "Rate per mile ($)"}
            </label>
            <input id="pay_rate" type="number" inputMode="decimal" step="0.01" min="0"
              className={fieldCls} value={form.pay_rate}
              onChange={(e) => set({ pay_rate: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="d_status">Status</label>
            <select id="d_status" className={fieldCls} value={form.status}
              onChange={(e) => set({ status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="applicant">Applicant</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ec_name">Emergency contact</label>
            <input id="ec_name" className={fieldCls} value={form.emergency_contact_name}
              onChange={(e) => set({ emergency_contact_name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ec_phone">Emergency phone</label>
            <input id="ec_phone" type="tel" className={fieldCls} value={form.emergency_contact_phone}
              onChange={(e) => set({ emergency_contact_phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="d_notes">Notes</label>
          <textarea id="d_notes" rows={2} className={`${fieldCls} h-auto py-3`} value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <button type="submit" disabled={pending}
          className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-8 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {driverId ? "Save driver" : "Add driver"}
        </button>
      </Panel>
    </form>
  )
}
