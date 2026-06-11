"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Phone, Mail, Plus, Trash2 } from "lucide-react"
import { addContactAction, removeContactAction, addCrmNoteAction } from "@/app/hub/_actions/people"
import { fieldCls, Panel } from "@/components/hub/ui"
import type { Contact } from "@/lib/hub/types"

export function ContactsPanel({ customerId, contacts }: { customerId: string; contacts: Contact[] }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "" })
  const [pending, startTransition] = useTransition()

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addContactAction({ customer_id: customerId, ...form })
      if (result.ok) {
        toast.success("Contact added")
        setForm({ name: "", role: "", phone: "", email: "" })
        setAdding(false)
      } else {
        toast.error(result.error ?? "Could not add contact")
      }
    })
  }

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await removeContactAction(id, customerId)
      if (result.ok) toast.success("Contact removed")
      else toast.error(result.error ?? "Could not remove contact")
    })

  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Contacts</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 px-3 text-xs font-semibold text-steel-100 hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {adding ? (
        <form onSubmit={add} className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Name" required placeholder="Name *" className={fieldCls} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input aria-label="Role" placeholder="Role" className={fieldCls} value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input aria-label="Phone" type="tel" placeholder="Phone" className={fieldCls} value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input aria-label="Email" type="email" placeholder="Email" className={fieldCls} value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <button type="submit" disabled={pending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm font-bold text-gold hover:bg-gold/20 disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save contact
          </button>
        </form>
      ) : null}

      {contacts.length === 0 ? (
        <p className="text-body-sm text-steel-300">No contacts yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {contact.name}
                  {contact.role ? <span className="text-steel-300 font-normal"> · {contact.role}</span> : null}
                </p>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-body-xs text-gold">
                      <Phone className="h-3 w-3" /> {contact.phone}
                    </a>
                  ) : null}
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-body-xs text-gold">
                      <Mail className="h-3 w-3" /> {contact.email}
                    </a>
                  ) : null}
                </div>
              </div>
              <button
                aria-label={`Remove ${contact.name}`}
                onClick={() => remove(contact.id)}
                disabled={pending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export interface CrmActivity {
  id: string
  kind: string
  body: string
  actor_name: string | null
  created_at: string
}

export function CrmNotesPanel({ customerId, activities }: { customerId: string; activities: CrmActivity[] }) {
  const [body, setBody] = useState("")
  const [kind, setKind] = useState<"note" | "call" | "email">("note")
  const [pending, startTransition] = useTransition()

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addCrmNoteAction({ customerId, body, kind })
      if (result.ok) {
        toast.success("Logged")
        setBody("")
      } else {
        toast.error(result.error ?? "Could not log activity")
      }
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">Activity</h2>
      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-4">
        <select aria-label="Activity type" className={`${fieldCls} sm:w-28`} value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
        </select>
        <input
          aria-label="Activity" placeholder="Talked to Mike — lane rates going up next month…"
          className={fieldCls} value={body} onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={pending || !body.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm font-bold text-gold hover:bg-gold/20 disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Log
        </button>
      </form>
      {activities.length === 0 ? (
        <p className="text-body-sm text-steel-300">Nothing logged yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li key={activity.id} className="rounded-lg bg-white/5 p-3">
              <p className="text-sm text-steel-100">{activity.body}</p>
              <p className="mt-1 text-body-xs text-steel-400 uppercase">
                {activity.kind} · {activity.actor_name ?? "—"} ·{" "}
                {new Date(activity.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
