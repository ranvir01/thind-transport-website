"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, FileSpreadsheet, Loader2, Save, XCircle } from "lucide-react"
import {
  importFuelAction, importLoadsAction, importMileageAction, importPositionsAction,
  importTollsAction, listImportTemplatesAction, saveImportTemplateAction,
  type ImportResult,
} from "@/app/hub/_actions/import"
import {
  parseCsv, IMPORT_FIELDS, FUEL_IMPORT_FIELDS, TOLL_IMPORT_FIELDS,
  POSITION_IMPORT_FIELDS, MILEAGE_IMPORT_FIELDS,
  type ImportFieldDef, type ImportRow,
} from "@/lib/hub/csv"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

type ImportKind = "loads" | "fuel" | "tolls" | "positions" | "mileage"

const KINDS: { key: ImportKind; label: string; hint: string; fields: readonly ImportFieldDef[]; templateKind: "loads" | "fuel" | "tolls" | "positions" }[] = [
  { key: "loads", label: "Load history", hint: "Your Excel load sheet — history lands as settled, brokers auto-created.", fields: IMPORT_FIELDS as unknown as ImportFieldDef[], templateKind: "loads" },
  { key: "fuel", label: "Fuel", hint: "Any card program statement (EFS, Comdata, WEX…). Idempotent — re-import safely.", fields: FUEL_IMPORT_FIELDS, templateKind: "fuel" },
  { key: "tolls", label: "Tolls", hint: "Transponder statements (BestPass, state systems).", fields: TOLL_IMPORT_FIELDS, templateKind: "tolls" },
  { key: "positions", label: "Positions", hint: "ELD GPS export — feeds the map and the IFTA engine.", fields: POSITION_IMPORT_FIELDS, templateKind: "positions" },
  { key: "mileage", label: "IFTA mileage", hint: "TruckX-style jurisdiction-mile summaries (per truck per quarter).", fields: MILEAGE_IMPORT_FIELDS, templateKind: "positions" },
]

type Mapping = Record<string, number | undefined>

function guessMapping(headers: string[], fields: readonly ImportFieldDef[]): Mapping {
  const patterns: Record<string, RegExp> = {
    customer_name: /broker|customer|client/i,
    customer_reference: /ref|load\s*#|confirmation|order/i,
    origin_city: /origin.*city|pickup.*city|^origin$|from.*city|^from$/i,
    origin_state: /origin.*st|pickup.*st|from.*st/i,
    dest_city: /dest.*city|deliver.*city|^dest|to.*city|^to$/i,
    dest_state: /dest.*st|deliver.*st|to.*st/i,
    pickup_date: /pickup.*date|pu.*date|ship.*date/i,
    delivery_date: /deliver.*date|del.*date|drop.*date/i,
    equipment: /equip|trailer.*type/i,
    commodity: /commodity|freight|product/i,
    weight_lbs: /weight|lbs/i,
    linehaul: /rate|linehaul|revenue|amount|pay/i,
    fuel_surcharge: /fsc|fuel\s*sur/i,
    loaded_miles: /miles|distance/i,
    driver_name: /driver/i,
    truck_unit: /truck|unit/i,
    notes: /note|comment/i,
    external_id: /trans.*id|txn|id$/i,
    ts: /date|time/i,
    merchant: /merchant|location|stop|site/i,
    city: /city/i,
    jurisdiction: /state|jur/i,
    gallons: /gal/i,
    fuel_type: /type|product/i,
    unit_price: /ppg|price/i,
    total: /total|amount|cost/i,
    odometer: /odo/i,
    card_program: /program|card/i,
    transponder: /transponder|tag/i,
    plaza: /plaza|road|exit/i,
    lat: /lat/i,
    lng: /lon|lng/i,
    quarter: /quarter|qtr/i,
    miles: /miles/i,
  }
  const mapping: Mapping = {}
  for (const field of fields) {
    const pattern = patterns[field.key]
    if (!pattern) continue
    const index = headers.findIndex((h) => pattern.test(h))
    if (index >= 0 && !Object.values(mapping).includes(index)) mapping[field.key] = index
  }
  return mapping
}

interface Template {
  id: string
  name: string
  mapping: Mapping
}

export function ImportWizard({ initialKind = "loads" }: { initialKind?: string }) {
  const kindDef = KINDS.find((k) => k.key === initialKind) ?? KINDS[0]
  const [kind, setKind] = useState<ImportKind>(kindDef.key)
  const def = KINDS.find((k) => k.key === kind)!

  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [asHistory, setAsHistory] = useState(true)
  const [program, setProgram] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateName, setTemplateName] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    listImportTemplatesAction(def.templateKind)
      .then(setTemplates)
      .catch(() => setTemplates([]))
  }, [def.templateKind])

  const reset = () => {
    setFileName(null)
    setHeaders([])
    setRows([])
    setMapping({})
    setResult(null)
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.length < 2) {
      toast.error("That file needs a header row plus at least one data row")
      return
    }
    setFileName(file.name)
    setHeaders(parsed[0].map((h) => h.trim()))
    setRows(parsed.slice(1))
    setMapping(guessMapping(parsed[0], def.fields))
    setResult(null)
  }

  const mappedRows = useMemo(() => {
    return rows.map((row) => {
      const out: Record<string, string> = {}
      for (const field of def.fields) {
        const index = mapping[field.key]
        out[field.key] = index !== undefined ? (row[index] ?? "").trim() : ""
      }
      return out
    })
  }, [rows, mapping, def.fields])

  const requiredMissing = def.fields.filter((f) => f.required && mapping[f.key] === undefined)

  const runImport = () =>
    startTransition(async () => {
      let res: ImportResult
      switch (kind) {
        case "loads":
          res = await importLoadsAction(mappedRows as unknown as ImportRow[], { asHistory })
          break
        case "fuel":
          res = await importFuelAction(mappedRows, program)
          break
        case "tolls":
          res = await importTollsAction(mappedRows, program)
          break
        case "positions":
          res = await importPositionsAction(mappedRows)
          break
        case "mileage":
          res = await importMileageAction(mappedRows)
          break
      }
      setResult(res)
      if (res.imported > 0) toast.success(`Imported ${res.imported} rows`)
      if ((res.skippedDuplicates ?? 0) > 0) toast.info(`${res.skippedDuplicates} duplicates skipped`)
      if (res.failed.length > 0) toast.error(`${res.failed.length} rows failed`)
    })

  const saveTemplate = () =>
    startTransition(async () => {
      const name = templateName.trim() || program.trim() || fileName || "default"
      const res = await saveImportTemplateAction(def.templateKind, name, mapping)
      if (res.ok) {
        toast.success(`Mapping saved as "${name}" — one-click next time`)
        const fresh = await listImportTemplatesAction(def.templateKind)
        setTemplates(fresh)
      } else toast.error(res.error ?? "Could not save template")
    })

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Kind tabs */}
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => { setKind(k.key); reset() }}
            className={cn(
              "min-h-[44px] rounded-xl px-4 text-sm font-bold",
              kind === k.key ? "bg-accent-soft text-accent-text border border-accent-soft" : "text-fg-2 hover:bg-hover border border-border"
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Step 1: file */}
      <Panel className="p-4 md:p-5">
        <h2 className="text-[13.5px] font-semibold text-fg mb-1">
          1 · Upload {def.label.toLowerCase()} CSV
        </h2>
        <p className="text-body-sm text-fg-2 mb-3">{def.hint}</p>
        {(kind === "fuel" || kind === "tolls") ? (
          <div className="mb-3 max-w-xs">
            <label className={labelCls} htmlFor="program">Program name (EFS, Comdata…)</label>
            <input id="program" className={fieldCls} value={program}
              onChange={(e) => setProgram(e.target.value)} placeholder="EFS" />
          </div>
        ) : null}
        <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong p-4 text-center hover:border-accent hover:bg-hover">
          <FileSpreadsheet className="h-6 w-6 text-fg-3" />
          <span className="text-sm font-semibold text-fg-2">
            {fileName ?? "Tap to choose a .csv file"}
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </label>
        {rows.length > 0 ? (
          <p className="mt-2 text-body-sm text-fg-2">
            {rows.length} data rows · {headers.length} columns detected
          </p>
        ) : null}
      </Panel>

      {/* Step 2: mapping */}
      {headers.length > 0 ? (
        <Panel className="p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-[13.5px] font-semibold text-fg">
              2 · Map your columns
            </h2>
            {templates.length > 0 ? (
              <select
                aria-label="Apply saved template"
                className={`${fieldCls} w-56`}
                defaultValue=""
                onChange={(e) => {
                  const template = templates.find((t) => t.id === e.target.value)
                  if (template) {
                    setMapping(template.mapping)
                    toast.success(`Applied "${template.name}"`)
                  }
                }}
              >
                <option value="">Apply saved mapping…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ) : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {def.fields.map((field) => (
              <div key={field.key}>
                <label className={labelCls} htmlFor={`map-${field.key}`}>
                  {field.label}{field.required ? " *" : ""}
                </label>
                <select
                  id={`map-${field.key}`}
                  className={fieldCls}
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [field.key]: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">— not in file —</option>
                  {headers.map((header, i) => (
                    <option key={i} value={i}>{header || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {requiredMissing.length > 0 ? (
            <p className="mt-3 rounded-lg border border-warn-soft bg-warn-soft p-3 text-body-sm text-warn">
              Still needed: {requiredMissing.map((f) => f.label).join(", ")}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              aria-label="Template name"
              placeholder={`Save mapping as… (e.g. ${program || "My export"})`}
              className={`${fieldCls} max-w-xs`}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <button
              onClick={saveTemplate}
              disabled={pending}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Save mapping
            </button>
          </div>
        </Panel>
      ) : null}

      {/* Step 3: import */}
      {headers.length > 0 && requiredMissing.length === 0 ? (
        <Panel className="p-4 md:p-5">
          <h2 className="text-[13.5px] font-semibold text-fg mb-3">
            3 · Import
          </h2>
          {kind === "loads" ? (
            <label className="mb-4 flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={asHistory}
                onChange={(e) => setAsHistory(e.target.checked)}
                className="h-5 w-5 rounded accent-[#F2A900]"
              />
              <span className="text-sm text-fg-2">
                Import as history (settled) — recommended for past loads
              </span>
            </label>
          ) : null}
          <button
            onClick={runImport}
            disabled={pending}
            className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent px-8 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import {mappedRows.length} rows
          </button>
        </Panel>
      ) : null}

      {/* Result */}
      {result ? (
        <Panel className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            {result.ok ? (
              <CheckCircle2 className="h-5 w-5 text-ok" />
            ) : (
              <XCircle className="h-5 w-5 text-bad" />
            )}
            <h2 className="text-[13.5px] font-semibold text-fg">
              Import finished
            </h2>
          </div>
          <p className="text-body-sm text-fg-2">
            {result.imported} imported
            {result.customersCreated != null ? ` · ${result.customersCreated} customers created` : ""}
            {result.skippedDuplicates != null ? ` · ${result.skippedDuplicates} duplicates skipped` : ""}
            {` · ${result.failed.length} failed`}
          </p>
          {result.failed.length > 0 ? (
            <ul className="mt-2 space-y-1 text-body-xs text-bad">
              {result.failed.slice(0, 10).map((f) => (
                <li key={f.row}>Row {f.row}: {f.error}</li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}
    </div>
  )
}
