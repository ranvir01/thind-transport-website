"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { saveCustomerAction } from "@/app/hub/_actions/people"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

export interface CustomerFormState {
  name: string
  type: string
  mc_number: string
  dot_number: string
  billing_email: string
  billing_address: string
  phone: string
  payment_terms_days: string
  credit_limit: string
  factored: boolean
  status: string
  notes: string
}

export function CustomerForm({
  customerId,
  initial,
}: {
  customerId?: string
  initial: CustomerFormState
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [pending, startTransition] = useTransition()
  const set = (patch: Partial<CustomerFormState>) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveCustomerAction(customerId ?? null, { ...form })
      if (result.ok) {
        toast.success(customerId ? "Customer updated" : "Customer added")
        router.push(customerId ? `/hub/customers/${customerId}` : `/hub/customers/${result.id}`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save customer")
      }
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Panel className="p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="c_name">Company name *</label>
            <input id="c_name" required className={fieldCls} value={form.name}
              onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c_type">Type</label>
            <select id="c_type" className={fieldCls} value={form.type}
              onChange={(e) => set({ type: e.target.value })}>
              <option value="broker">Broker</option>
              <option value="shipper">Shipper</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="c_status">Status</label>
            <select id="c_status" className={fieldCls} value={form.status}
              onChange={(e) => set({ status: e.target.value })}>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="mc_number">MC number</label>
            <input id="mc_number" className={fieldCls} value={form.mc_number}
              onChange={(e) => set({ mc_number: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="dot_number">DOT number</label>
            <input id="dot_number" className={fieldCls} value={form.dot_number}
              onChange={(e) => set({ dot_number: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="billing_email">Billing email</label>
            <input id="billing_email" type="email" className={fieldCls} value={form.billing_email}
              onChange={(e) => set({ billing_email: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c_phone">Phone</label>
            <input id="c_phone" type="tel" className={fieldCls} value={form.phone}
              onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="billing_address">Billing address</label>
            <input id="billing_address" className={fieldCls} value={form.billing_address}
              onChange={(e) => set({ billing_address: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="terms">Payment terms (days)</label>
            <input id="terms" type="number" inputMode="numeric" min="0" max="365"
              className={fieldCls} value={form.payment_terms_days}
              onChange={(e) => set({ payment_terms_days: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="credit_limit">Credit limit ($)</label>
            <input id="credit_limit" type="number" inputMode="decimal" min="0"
              className={fieldCls} value={form.credit_limit}
              onChange={(e) => set({ credit_limit: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={form.factored}
            onChange={(e) => set({ factored: e.target.checked })}
            className="h-5 w-5 rounded border-white/20 bg-white/10 accent-[#F2A900]"
          />
          <span className="text-sm text-steel-100">Loads from this customer are factored</span>
        </label>
        <div>
          <label className={labelCls} htmlFor="c_notes">Notes</label>
          <textarea id="c_notes" rows={2} className={`${fieldCls} h-auto py-3`} value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <button type="submit" disabled={pending}
          className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-8 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {customerId ? "Save customer" : "Add customer"}
        </button>
      </Panel>
    </form>
  )
}
