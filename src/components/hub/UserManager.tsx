"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus, UserCheck, UserX } from "lucide-react"
import { createHubUserAction, setUserActiveAction } from "@/app/hub/_actions/people"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { OFFICE_INVITE_ROLES, type HubUser } from "@/lib/hub/types"

export function UserManager({ users, selfId }: { users: HubUser[]; selfId: string }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "dispatcher", password: "" })
  const [pending, startTransition] = useTransition()

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createHubUserAction({ ...form })
      if (result.ok) {
        toast.success(`Account created for ${form.name}. Share the temp password with them.`)
        setForm({ name: "", email: "", phone: "", role: "dispatcher", password: "" })
        setShowForm(false)
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not create user")
      }
    })
  }

  const toggle = (user: HubUser) =>
    startTransition(async () => {
      const result = await setUserActiveAction(user.id, !user.active)
      if (result.ok) {
        toast.success(user.active ? `${user.name} deactivated` : `${user.name} reactivated`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not update user")
      }
    })

  return (
    <div className="space-y-4 max-w-3xl">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
      >
        <Plus className="h-4 w-4" /> New account
      </button>

      {showForm ? (
        <Panel className="p-4 md:p-5">
          <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="u_name">Full name *</label>
              <input id="u_name" required className={fieldCls} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="u_email">Email *</label>
              <input id="u_email" type="email" required className={fieldCls} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="u_role">Role *</label>
              <select id="u_role" className={fieldCls} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {OFFICE_INVITE_ROLES.map((role) => (
                  <option key={role} value={role} className="capitalize">{role}</option>
                ))}
              </select>
              <p className="mt-1 text-body-xs text-fg-3">Dispatcher sees load board; accountant sees Money.</p>
            </div>
            <div>
              <label className={labelCls} htmlFor="u_phone">Phone</label>
              <input id="u_phone" type="tel" className={fieldCls} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="u_password">Temporary password * (8+ characters)</label>
              <input id="u_password" type="text" required minLength={8} className={fieldCls} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending}
                className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-accent px-8 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create account
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="divide-y divide-border">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg truncate">
                {user.name}
                {user.id === selfId ? <span className="text-fg-3 font-normal"> (you)</span> : null}
                {!user.active ? <span className="ml-2 text-bad text-body-xs font-bold uppercase">inactive</span> : null}
              </p>
              <p className="text-body-xs text-fg-3 truncate">{user.email}</p>
            </div>
            <span className="shrink-0 rounded-full border border-accent-soft bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-text">
              {user.role}
            </span>
            {user.id !== selfId ? (
              <button
                aria-label={user.active ? `Deactivate ${user.name}` : `Reactivate ${user.name}`}
                onClick={() => toggle(user)}
                disabled={pending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-fg-2 hover:bg-hover disabled:opacity-50"
              >
                {user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        ))}
      </Panel>
    </div>
  )
}
