"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { createAdvanceAction, createExpenseAction, savePriceBookEntryAction } from "@/app/hub/_actions/money"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { EXPENSE_CATEGORIES } from "@/lib/hub/types"
import type { Option } from "@/components/hub/LoadForm"

export function AdvanceForm({ drivers }: { drivers: Option[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    driverId: "", amount: "", issuedOn: new Date().toISOString().slice(0, 10), reference: "",
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createAdvanceAction(form)
      if (result.ok) {
        toast.success("Advance recorded — it deducts on the next settlement")
        setForm({ ...form, amount: "", reference: "" })
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }
  return (
    <Panel className="p-4 md:p-5">
      <h2 className="text-[13.5px] font-semibold text-fg mb-3">Issue advance</h2>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls} htmlFor="adv_driver">Driver *</label>
          <select id="adv_driver" required className={fieldCls} value={form.driverId}
            onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
            <option value="">Select…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="adv_amount">Amount ($) *</label>
          <input id="adv_amount" type="number" step="0.01" min="0.01" required className={fieldCls}
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="adv_date">Issued</label>
          <input id="adv_date" type="date" className={fieldCls} value={form.issuedOn}
            onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="adv_ref">Reference (EFS code…)</label>
          <input id="adv_ref" className={fieldCls} value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>
        <button type="submit" disabled={pending}
          className="col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Record advance
        </button>
      </form>
    </Panel>
  )
}

export function ExpenseForm({ drivers, trucks }: { drivers: Option[]; trucks: Option[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    category: "maintenance", amount: "", incurredOn: new Date().toISOString().slice(0, 10),
    truckId: "", driverId: "", reimbursable: false, billable: false, memo: "",
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createExpenseAction(form)
      if (result.ok) {
        toast.success("Expense recorded")
        setForm({ ...form, amount: "", memo: "" })
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })
  }
  return (
    <Panel className="p-4 md:p-5">
      <h2 className="text-[13.5px] font-semibold text-fg mb-3">Record expense</h2>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="exp_cat">Category</label>
          <select id="exp_cat" className={fieldCls} value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="exp_amount">Amount ($) *</label>
          <input id="exp_amount" type="number" step="0.01" min="0.01" required className={fieldCls}
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="exp_date">Date</label>
          <input id="exp_date" type="date" className={fieldCls} value={form.incurredOn}
            onChange={(e) => setForm({ ...form, incurredOn: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="exp_truck">Truck</label>
          <select id="exp_truck" className={fieldCls} value={form.truckId}
            onChange={(e) => setForm({ ...form, truckId: e.target.value })}>
            <option value="">—</option>
            {trucks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="exp_driver">Driver</label>
          <select id="exp_driver" className={fieldCls} value={form.driverId}
            onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
            <option value="">—</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="exp_memo">Memo</label>
          <input id="exp_memo" className={fieldCls} value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
          <input type="checkbox" checked={form.reimbursable} className="h-5 w-5 rounded border-border-strong accent-accent"
            onChange={(e) => setForm({ ...form, reimbursable: e.target.checked })} />
          <span className="text-sm text-fg-2">Reimburse driver (next settlement)</span>
        </label>
        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
          <input type="checkbox" checked={form.billable} className="h-5 w-5 rounded border-border-strong accent-accent"
            onChange={(e) => setForm({ ...form, billable: e.target.checked })} />
          <span className="text-sm text-fg-2">Billable to customer</span>
        </label>
        <button type="submit" disabled={pending}
          className="col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save expense
        </button>
      </form>
    </Panel>
  )
}

export interface PriceBookRow {
  id: string
  name: string
  default_amount_cents: number
  unit: string
  active: boolean
}

export function PriceBookEditor({ entries }: { entries: PriceBookRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: "", amount: "", unit: "flat" })

  const save = (values: { id?: string; name: string; amount: string; unit: string }) =>
    startTransition(async () => {
      const result = await savePriceBookEntryAction(values)
      if (result.ok) {
        toast.success("Price book updated")
        setForm({ name: "", amount: "", unit: "flat" })
        router.refresh()
      } else toast.error(result.error ?? "Failed")
    })

  return (
    <div className="space-y-4 max-w-2xl">
      <Panel className="divide-y divide-border">
        {entries.map((entry) => (
          <PriceBookRowEditor key={entry.id} entry={entry} onSave={save} pending={pending} />
        ))}
      </Panel>
      <Panel className="p-4">
        <h2 className="text-[13.5px] font-semibold text-fg mb-3">Add accessorial type</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save(form)
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input aria-label="Name" required placeholder="Name (e.g. Chains)" className={fieldCls}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input aria-label="Default amount" type="number" step="0.01" min="0" placeholder="$" className={`${fieldCls} sm:w-32`}
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select aria-label="Unit" className={`${fieldCls} sm:w-40`} value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="flat">Flat</option>
            <option value="per_hour">Per hour</option>
            <option value="per_day">Per day</option>
            <option value="pass_through">Pass-through</option>
          </select>
          <button type="submit" disabled={pending}
            className="min-h-[44px] shrink-0 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
            Add
          </button>
        </form>
      </Panel>
    </div>
  )
}

function PriceBookRowEditor({
  entry, onSave, pending,
}: {
  entry: PriceBookRow
  onSave: (values: { id: string; name: string; amount: string; unit: string }) => void
  pending: boolean
}) {
  const [amount, setAmount] = useState((entry.default_amount_cents / 100).toFixed(2))
  return (
    <div className="flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{entry.name}</p>
        <p className="text-body-xs text-fg-3 uppercase">{entry.unit.replace("_", " ")}</p>
      </div>
      <input
        aria-label={`${entry.name} default amount`}
        type="number" step="0.01" min="0"
        className={`${fieldCls} w-28`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        onClick={() => onSave({ id: entry.id, name: entry.name, amount, unit: entry.unit })}
        disabled={pending}
        className="min-h-[44px] shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        Save
      </button>
    </div>
  )
}
