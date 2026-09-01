"use client"

/**
 * Client editor for an entity's custom-field values (rendered by
 * CustomDetailsPanel, which fetches definitions + stored values server-side).
 */
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { saveCustomValuesAction } from "@/app/hub/_actions/custom-fields"
import type { CustomFieldDef, CustomFieldEntity } from "@/lib/hub/custom-fields"
import { fieldCls, labelCls } from "@/components/hub/ui"

export function CustomFieldsPanel({
  entity,
  entityId,
  defs,
  values,
  canWrite,
  isOwner,
}: {
  entity: CustomFieldEntity
  entityId: string
  defs: CustomFieldDef[]
  values: Record<string, string>
  canWrite: boolean
  isOwner: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(defs.map((d) => [d.key, values[d.key] ?? ""]))
  )
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const res = await saveCustomValuesAction(entity, entityId, form)
      if (res.ok) {
        toast.success("Details saved")
        setDirty(false)
        router.refresh()
      } else {
        toast.error(res.error ?? "Could not save details")
      }
    })

  if (defs.length === 0 && !isOwner) return null

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13.5px] font-semibold text-fg">Your fields</h2>
        {isOwner ? (
          <Link
            href="/hub/settings/fields"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-text hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add field
          </Link>
        ) : null}
      </div>

      {defs.length === 0 ? (
        <p className="text-[13px] text-fg-3">
          Track anything your operation needs on every {entity} — temp ranges, terminal, portal
          codes. Fields you add appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {defs.map((def) => (
            <div key={def.key}>
              <label className={labelCls} htmlFor={`cf-${def.key}`}>
                {def.label}
              </label>
              {def.kind === "select" ? (
                <select
                  id={`cf-${def.key}`}
                  className={fieldCls}
                  value={form[def.key] ?? ""}
                  disabled={!canWrite}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, [def.key]: e.target.value }))
                    setDirty(true)
                  }}
                >
                  <option value="">—</option>
                  {def.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`cf-${def.key}`}
                  className={fieldCls}
                  type={def.kind === "date" ? "date" : "text"}
                  inputMode={def.kind === "number" ? "decimal" : undefined}
                  value={form[def.key] ?? ""}
                  disabled={!canWrite}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, [def.key]: e.target.value }))
                    setDirty(true)
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {canWrite && defs.length > 0 ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save details
          </button>
        </div>
      ) : null}
    </section>
  )
}
