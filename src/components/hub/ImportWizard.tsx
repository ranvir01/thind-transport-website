"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, FileSpreadsheet, Loader2, XCircle } from "lucide-react"
import { importLoadsAction, type ImportResult } from "@/app/hub/_actions/import"
import { parseCsv, IMPORT_FIELDS, type ImportFieldKey, type ImportRow } from "@/lib/hub/csv"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

type Mapping = Partial<Record<ImportFieldKey, number>>

/** Guess column mappings from header names. */
function guessMapping(headers: string[]): Mapping {
  const mapping: Mapping = {}
  const patterns: [ImportFieldKey, RegExp][] = [
    ["customer_name", /broker|customer|client/i],
    ["customer_reference", /ref|load\s*#|confirmation|order/i],
    ["origin_city", /origin.*city|pickup.*city|^origin$|from.*city|^from$/i],
    ["origin_state", /origin.*st|pickup.*st|from.*st/i],
    ["dest_city", /dest.*city|deliver.*city|^dest|to.*city|^to$/i],
    ["dest_state", /dest.*st|deliver.*st|to.*st/i],
    ["pickup_date", /pickup.*date|pu.*date|ship.*date/i],
    ["delivery_date", /deliver.*date|del.*date|drop.*date/i],
    ["equipment", /equip|trailer.*type/i],
    ["commodity", /commodity|freight|product/i],
    ["weight_lbs", /weight|lbs/i],
    ["linehaul", /rate|linehaul|revenue|amount|pay/i],
    ["fuel_surcharge", /fsc|fuel/i],
    ["loaded_miles", /miles|distance/i],
    ["driver_name", /driver/i],
    ["truck_unit", /truck|unit/i],
    ["notes", /note|comment/i],
  ]
  for (const [field, pattern] of patterns) {
    if (mapping[field] !== undefined) continue
    const index = headers.findIndex((h) => pattern.test(h))
    if (index >= 0 && !Object.values(mapping).includes(index)) mapping[field] = index
  }
  return mapping
}

export function ImportWizard() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [asHistory, setAsHistory] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, startTransition] = useTransition()

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
    setMapping(guessMapping(parsed[0]))
    setResult(null)
  }

  const mappedRows: ImportRow[] = useMemo(() => {
    return rows.map((row) => {
      const get = (key: ImportFieldKey) => {
        const index = mapping[key]
        return index !== undefined ? (row[index] ?? "").trim() : ""
      }
      return {
        customer_name: get("customer_name"),
        customer_reference: get("customer_reference"),
        origin_city: get("origin_city"),
        origin_state: get("origin_state"),
        dest_city: get("dest_city"),
        dest_state: get("dest_state"),
        pickup_date: get("pickup_date"),
        delivery_date: get("delivery_date"),
        equipment: get("equipment"),
        commodity: get("commodity"),
        weight_lbs: get("weight_lbs"),
        linehaul: get("linehaul"),
        fuel_surcharge: get("fuel_surcharge"),
        loaded_miles: get("loaded_miles"),
        driver_name: get("driver_name"),
        truck_unit: get("truck_unit"),
        notes: get("notes"),
      }
    })
  }, [rows, mapping])

  const requiredMissing = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] === undefined)
  const previewIssues = useMemo(() => {
    let count = 0
    for (const row of mappedRows) {
      if (!row.customer_name || !row.origin_city || !row.dest_city || !row.linehaul) count++
    }
    return count
  }, [mappedRows])

  const runImport = () =>
    startTransition(async () => {
      const res = await importLoadsAction(mappedRows, { asHistory })
      setResult(res)
      if (res.imported > 0) toast.success(`Imported ${res.imported} loads`)
      if (res.failed.length > 0) toast.error(`${res.failed.length} rows failed`)
    })

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Step 1: file */}
      <Panel className="p-4 md:p-5">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-1">
          1 · Upload your spreadsheet
        </h2>
        <p className="text-body-sm text-steel-200 mb-3">
          Export your Excel load sheet as CSV (File → Save As → CSV) and drop it here.
        </p>
        <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 p-4 text-center hover:border-gold/40 hover:bg-white/5">
          <FileSpreadsheet className="h-6 w-6 text-steel-300" />
          <span className="text-sm font-semibold text-steel-100">
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
          <p className="mt-2 text-body-sm text-steel-200">
            {rows.length} data rows · {headers.length} columns detected
          </p>
        ) : null}
      </Panel>

      {/* Step 2: mapping */}
      {headers.length > 0 ? (
        <Panel className="p-4 md:p-5">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-1">
            2 · Map your columns
          </h2>
          <p className="text-body-sm text-steel-200 mb-4">
            We guessed from your headers — fix anything that looks off.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IMPORT_FIELDS.map((field) => (
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
            <p className="mt-3 rounded-lg border border-gold/30 bg-gold/10 p-3 text-body-sm text-gold">
              Still needed: {requiredMissing.map((f) => f.label).join(", ")}
            </p>
          ) : null}
        </Panel>
      ) : null}

      {/* Step 3: preview + import */}
      {headers.length > 0 && requiredMissing.length === 0 ? (
        <Panel className="p-4 md:p-5">
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">
            3 · Preview &amp; import
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-label-sm text-steel-300 uppercase">
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Lane</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Driver</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-3 py-2 text-white">{row.customer_name || <span className="text-red-300">missing</span>}</td>
                    <td className="px-3 py-2 text-steel-100">
                      {row.origin_city || "?"}, {row.origin_state || "?"} → {row.dest_city || "?"}, {row.dest_state || "?"}
                    </td>
                    <td className="px-3 py-2 text-gold font-semibold">{row.linehaul || "—"}</td>
                    <td className="px-3 py-2 text-steel-100">{row.driver_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewIssues > 0 ? (
            <p className="mb-3 text-body-sm text-gold">
              {previewIssues} of {mappedRows.length} rows are missing required values — they&apos;ll be skipped and reported.
            </p>
          ) : null}
          <label className="mb-4 flex items-center gap-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={asHistory}
              onChange={(e) => setAsHistory(e.target.checked)}
              className="h-5 w-5 rounded accent-[#F2A900]"
            />
            <span className="text-sm text-steel-100">
              Import as history (settled) — recommended for past loads
            </span>
          </label>
          <button
            onClick={runImport}
            disabled={pending}
            className="flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-8 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import {mappedRows.length} loads
          </button>
        </Panel>
      ) : null}

      {/* Result */}
      {result ? (
        <Panel className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            {result.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            ) : (
              <XCircle className="h-5 w-5 text-gold" />
            )}
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
              Import finished
            </h2>
          </div>
          <p className="text-body-sm text-steel-100">
            {result.imported} loads imported · {result.customersCreated} customers created ·{" "}
            {result.failed.length} rows failed
          </p>
          {result.failed.length > 0 ? (
            <ul className="mt-2 space-y-1 text-body-xs text-red-300">
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
