"use client"

/**
 * Settings → Your fields: the owner shapes the workspace's data model.
 * One section per entity; add text/number/date/select fields; archive keeps
 * stored values for a later restore (re-adding the same name restores them).
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, Loader2, Plus } from "lucide-react"
import {
  archiveCustomFieldAction,
  createCustomFieldAction,
} from "@/app/hub/_actions/custom-fields"
import {
  CUSTOM_FIELD_ENTITIES,
  ENTITY_META,
  type CustomFieldDef,
  type CustomFieldEntity,
  type CustomFieldKind,
} from "@/lib/hub/custom-fields"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

const KIND_LABELS: Record<CustomFieldKind, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Choice list",
}

function AddFieldForm({ entity }: { entity: CustomFieldEntity }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [kind, setKind] = useState<CustomFieldKind>("text")
  const [optionsRaw, setOptionsRaw] = useState("")
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createCustomFieldAction({ entityType: entity, label, kind, optionsRaw })
      if (res.ok) {
        toast.success(`"${label.trim()}" added`)
        setLabel("")
        setOptionsRaw("")
        setKind("text")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error ?? "Could not add the field")
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-control border border-border-strong px-3.5 text-[13px] font-semibold text-fg-2 hover:bg-hover"
      >
        <Plus className="h-4 w-4" /> Add field
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-control bg-surface-2 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`nf-label-${entity}`}>Field name</label>
          <input
            id={`nf-label-${entity}`}
            className={fieldCls}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Reefer temp (°F)"
            required
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`nf-kind-${entity}`}>Type</label>
          <select
            id={`nf-kind-${entity}`}
            className={fieldCls}
            value={kind}
            onChange={(e) => setKind(e.target.value as CustomFieldKind)}
          >
            {Object.entries(KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      {kind === "select" ? (
        <div className="mt-3">
          <label className={labelCls} htmlFor={`nf-opts-${entity}`}>Choices — one per line</label>
          <textarea
            id={`nf-opts-${entity}`}
            className={cn(fieldCls, "h-24 py-2")}
            value={optionsRaw}
            onChange={(e) => setOptionsRaw(e.target.value)}
            placeholder={"Continuous\nCycle-sentry\nOff"}
          />
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Add field
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-[40px] items-center rounded-control px-3 text-sm font-medium text-fg-3 hover:bg-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function FieldRow({ def }: { def: CustomFieldDef }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const archive = () =>
    startTransition(async () => {
      const res = await archiveCustomFieldAction(def.id)
      if (res.ok) {
        toast.success(`"${def.label}" archived — re-add the same name to restore its data`)
        router.refresh()
      } else {
        toast.error(res.error ?? "Could not archive")
      }
    })
  return (
    <li className="flex min-h-[48px] items-center gap-3 px-1">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{def.label}</p>
        <p className="text-[11.5px] text-fg-3">
          {KIND_LABELS[def.kind]}
          {def.kind === "select" ? ` · ${def.options.slice(0, 4).join(", ")}${def.options.length > 4 ? "…" : ""}` : ""}
        </p>
      </div>
      <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-fg-3">{def.key}</span>
      <button
        type="button"
        onClick={archive}
        disabled={pending}
        aria-label={`Archive ${def.label}`}
        className="flex h-9 w-9 items-center justify-center rounded-control text-fg-3 hover:bg-hover hover:text-fg-2 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
      </button>
    </li>
  )
}

export function CustomFieldsManager({ defs }: { defs: CustomFieldDef[] }) {
  return (
    <div className="space-y-4">
      {CUSTOM_FIELD_ENTITIES.map((entity) => {
        const entityDefs = defs.filter((d) => d.entityType === entity && !d.archived)
        return (
          <Panel key={entity} className="p-4">
            <h2 className="text-[13.5px] font-semibold text-fg">{ENTITY_META[entity].label}</h2>
            {entityDefs.length > 0 ? (
              <ul className="mt-1 divide-y divide-border">
                {entityDefs.map((def) => (
                  <FieldRow key={def.id} def={def} />
                ))}
              </ul>
            ) : (
              <p className="mb-2 mt-1 text-[13px] text-fg-3">
                No custom fields yet — every one you add shows on each {entity}&apos;s page.
              </p>
            )}
            <div className="mt-2">
              <AddFieldForm entity={entity} />
            </div>
          </Panel>
        )
      })}
    </div>
  )
}
