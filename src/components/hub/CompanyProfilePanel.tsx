"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldCheck } from "lucide-react"
import { updateCompanyProfileAction } from "@/app/hub/_actions/company"
import { Panel, fieldCls, labelCls } from "@/components/hub/ui"
import type { Carrier } from "@/lib/hub/settings"

/**
 * Owner edit form for the carrier row itself — the name/phone/email/address
 * printed on invoices, settlement PDFs, and the carrier packet. DOT/MC are
 * shown read-only: FMCSA-verified at signup, not self-serve editable.
 */
export function CompanyProfilePanel({ carrier }: { carrier: Carrier }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: carrier.name ?? "",
    phone: carrier.phone ?? "",
    email: carrier.email ?? "",
    address: carrier.address ?? "",
  })

  const saved =
    form.name.trim() === (carrier.name ?? "") &&
    form.phone.trim() === (carrier.phone ?? "") &&
    form.email.trim() === (carrier.email ?? "") &&
    form.address.trim() === (carrier.address ?? "")

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateCompanyProfileAction(form)
      if (result.ok) {
        toast.success("Company profile saved")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not save")
      }
    })
  }

  return (
    <Panel className="max-w-3xl p-4 md:p-5">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-body-sm text-fg-2">
          This is the company block printed on your invoices, settlement PDFs, and carrier packet.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="company_name" className={labelCls}>Company name</label>
            <input
              id="company_name" required maxLength={120}
              value={form.name} onChange={set("name")} className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="company_phone" className={labelCls}>Phone</label>
            <input
              id="company_phone" type="tel" autoComplete="tel" placeholder="(206) 555-0100"
              value={form.phone} onChange={set("phone")} className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="company_email" className={labelCls}>Billing email</label>
            <input
              id="company_email" type="email" autoComplete="email" placeholder="billing@yourcompany.com"
              value={form.email} onChange={set("email")} className={fieldCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="company_address" className={labelCls}>Address</label>
            <textarea
              id="company_address" rows={2} placeholder={"1234 Freight Way\nKent, WA 98032"}
              value={form.address} onChange={set("address")} className={fieldCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-xs text-fg-3">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            DOT {carrier.dot_number ?? "—"} · MC {carrier.mc_number ?? "—"}
          </span>
          <span>Authority numbers are verified at signup and can&apos;t be edited here.</span>
        </div>

        <button
          type="submit"
          disabled={pending || saved}
          className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-accent px-8 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saved ? "Saved" : "Save company profile"}
        </button>
      </form>
    </Panel>
  )
}
