"use client"

/**
 * Import, reworked: a category card grid (tinted icon chips + outcome copy)
 * in place of chip tabs and stacked dropzones, and a guided 4-step stepper
 * in a bottom sheet — file → mapping ("12 of 14 columns matched") → review
 * ("42 rows ready · 3 need attention") → apply + success.
 *
 * Connect-capable categories (ELD/positions, fuel) lead with pairing and
 * demote "upload a file" to the second option — the CSV path never goes away.
 * Server contracts unchanged: same actions, same ImportResult shape (row 0
 * carries permission denials), same saved-template machinery.
 */
import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft, ArrowRight, Building2, Cable, FileSpreadsheet, Fuel, Loader2,
  MapPin, Package, Route, Save, Coins, Truck, Users, type LucideIcon,
} from "lucide-react"
import {
  importCustomersAction, importDriversAction, importFuelAction, importLoadsAction,
  importMileageAction, importPositionsAction, importTollsAction, importTrucksAction,
  listImportTemplatesAction, saveImportTemplateAction,
  type ImportResult,
} from "@/app/hub/_actions/import"
import {
  parseCsv, IMPORT_FIELDS, FUEL_IMPORT_FIELDS, TOLL_IMPORT_FIELDS,
  POSITION_IMPORT_FIELDS, MILEAGE_IMPORT_FIELDS,
  TRUCK_IMPORT_FIELDS, DRIVER_IMPORT_FIELDS, CUSTOMER_IMPORT_FIELDS,
  type ImportFieldDef, type ImportRow,
} from "@/lib/hub/csv"
import { fieldCls, labelCls } from "@/components/hub/ui"
import { BottomSheet } from "@/components/hub/BottomSheet"
import { CheckDraw } from "@/components/hub/CheckDraw"
import { EldFileImport } from "@/components/hub/EldFileImport"
import { cn } from "@/lib/utils"

type ImportKind = "loads" | "trucks" | "drivers" | "customers" | "fuel" | "tolls" | "positions" | "mileage"

// templateKind is absent for setup-entity kinds: hub.import_templates only
// accepts loads/fuel/tolls/positions, and one-time setup lists rarely repeat.
const KINDS: {
  key: ImportKind
  label: string
  outcome: string
  hint: string
  icon: LucideIcon
  tint: "accent" | "info" | "ok" | "warn"
  fields: readonly ImportFieldDef[]
  templateKind?: "loads" | "fuel" | "tolls" | "positions"
  /** Connect-first: pairing leads, file upload is the demoted second path. */
  connect?: { title: string; blurb: string }
}[] = [
  {
    key: "loads", label: "Load history", icon: Package, tint: "accent",
    outcome: "History lands as settled — lane stats from day one.",
    hint: "Your Excel load sheet — brokers are auto-created as they appear.",
    fields: IMPORT_FIELDS as unknown as ImportFieldDef[], templateKind: "loads",
  },
  {
    key: "trucks", label: "Trucks", icon: Truck, tint: "info",
    outcome: "VINs decode year, make & model automatically.",
    hint: "Your fleet list — unit numbers already on file are skipped.",
    fields: TRUCK_IMPORT_FIELDS,
  },
  {
    key: "drivers", label: "Drivers", icon: Users, tint: "info",
    outcome: "Each driver can get the phone app by email invite.",
    hint: "Pay starts at your Settings default; a combined name column is split for you.",
    fields: DRIVER_IMPORT_FIELDS,
  },
  {
    key: "customers", label: "Brokers", icon: Building2, tint: "info",
    outcome: "MC numbers cleaned up, duplicates skipped.",
    hint: "Broker / customer list — names already on file are skipped.",
    fields: CUSTOMER_IMPORT_FIELDS,
  },
  {
    key: "fuel", label: "Fuel", icon: Fuel, tint: "ok",
    outcome: "Fuel feeds IFTA automatically.",
    hint: "Any card program statement (EFS, Comdata, WEX…). Re-import safely.",
    fields: FUEL_IMPORT_FIELDS, templateKind: "fuel",
    connect: {
      title: "Connect your fuel card feed",
      blurb: "EFS, WEX and Comdata sync transactions nightly once connected.",
    },
  },
  {
    key: "tolls", label: "Tolls", icon: Coins, tint: "ok",
    outcome: "Transponder charges reconcile against loads.",
    hint: "Transponder statements (BestPass, state systems).",
    fields: TOLL_IMPORT_FIELDS, templateKind: "tolls",
  },
  {
    key: "positions", label: "ELD / GPS", icon: MapPin, tint: "warn",
    outcome: "Feeds the live map and the IFTA engine.",
    hint: "ELD GPS export — one row per ping.",
    fields: POSITION_IMPORT_FIELDS, templateKind: "positions",
    connect: {
      title: "Connect your ELD",
      blurb: "Terminal (TruckX) and TruckerCloud stream positions automatically.",
    },
  },
  {
    key: "mileage", label: "IFTA mileage", icon: Route, tint: "warn",
    outcome: "Jurisdiction miles per quarter, filing-ready.",
    hint: "Per-truck quarterly summaries. Upload the whole fleet's quarter together.",
    fields: MILEAGE_IMPORT_FIELDS, templateKind: "positions",
  },
]

const TINT_CLS = {
  accent: "bg-accent-soft text-accent-text",
  info: "bg-info-soft text-info",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
} as const

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
    unit_number: /unit|truck/i,
    vin: /vin/i,
    plate: /plate|license/i,
    plate_state: /plate\s*st/i,
    year: /year/i,
    make: /make/i,
    model: /model/i,
    ownership: /owner/i,
    first_name: /first/i,
    last_name: /last/i,
    full_name: /^(driver|full)?\s*name$|^driver$/i,
    phone: /phone|cell|mobile/i,
    email: /e-?mail/i,
    cdl_number: /cdl\s*(#|num(ber)?)?$/i,
    cdl_state: /cdl.*st/i,
    cdl_expiry: /cdl.*exp/i,
    medical_card_expiry: /med/i,
    hire_date: /hire/i,
    name: /^name$|broker|customer|company/i,
    customer_type: /type/i,
    mc_number: /mc/i,
    dot_number: /dot/i,
    billing_email: /e-?mail/i,
    payment_terms_days: /terms|net\s*\d*/i,
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

/** Per-row readiness for the review step: required fields present? */
function reviewRows(
  mapped: Record<string, string>[],
  fields: readonly ImportFieldDef[],
  mapping: Mapping
): { ready: number; attention: { row: number; missing: string[] }[] } {
  const covered = new Set(
    fields.flatMap((f) => (mapping[f.key] !== undefined ? (f.coversRequired ?? []) : []))
  )
  const required = fields.filter((f) => f.required && !covered.has(f.key))
  const attention: { row: number; missing: string[] }[] = []
  let ready = 0
  mapped.forEach((row, i) => {
    const missing = required.filter((f) => !(row[f.key] ?? "").trim()).map((f) => f.label)
    if (missing.length === 0) ready += 1
    else attention.push({ row: i + 1, missing })
  })
  return { ready, attention }
}

export function ImportHub({
  initialKind,
  canConnect = false,
}: {
  initialKind?: string
  /** Owner only — the integrations page the connect rows lead to is owner-gated. */
  canConnect?: boolean
}) {
  const [kind, setKind] = useState<ImportKind | null>(
    KINDS.some((k) => k.key === initialKind) ? (initialKind as ImportKind) : null
  )
  const [chooserFor, setChooserFor] = useState<ImportKind | null>(null)
  const def = KINDS.find((k) => k.key === kind) ?? null

  // Stepper state
  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [asHistory, setAsHistory] = useState(true)
  const [sendInvites, setSendInvites] = useState(true)
  const [program, setProgram] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateName, setTemplateName] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!def?.templateKind) {
      // Clear stale templates when switching to a kind without templates (async to satisfy set-state-in-effect).
      queueMicrotask(() => setTemplates([]))
      return
    }
    let stale = false
    listImportTemplatesAction(def.templateKind)
      .then((t) => {
        if (!stale) setTemplates(t)
      })
      .catch(() => {
        if (!stale) setTemplates([])
      })
    return () => {
      stale = true
    }
  }, [def?.templateKind])

  const resetFlow = () => {
    setStep(1)
    setFileName(null)
    setHeaders([])
    setRows([])
    setMapping({})
    setResult(null)
    setTemplateName("")
  }

  const openKind = (key: ImportKind) => {
    const target = KINDS.find((k) => k.key === key)!
    // The connect-first chooser leads to the owner-only integrations page;
    // everyone else goes straight to the upload flow (positions still gets
    // the chooser for the ELD output-file option).
    if (target.connect && (canConnect || key === "positions")) {
      setChooserFor(key)
    } else {
      resetFlow()
      setKind(key)
    }
  }

  const startUploadFlow = (key: ImportKind) => {
    setChooserFor(null)
    resetFlow()
    setKind(key)
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
    if (def) setMapping(guessMapping(parsed[0], def.fields))
    setResult(null)
    setStep(2)
  }

  const mappedRows = useMemo(() => {
    if (!def) return []
    return rows.map((row) => {
      const out: Record<string, string> = {}
      for (const field of def.fields) {
        const index = mapping[field.key]
        out[field.key] = index !== undefined ? (row[index] ?? "").trim() : ""
      }
      return out
    })
  }, [rows, mapping, def])

  // A mapped covering column (e.g. one combined "Driver name") waives the
  // required fields it splits into.
  const coveredRequired = new Set(
    (def?.fields ?? []).flatMap((f) => (mapping[f.key] !== undefined ? (f.coversRequired ?? []) : []))
  )
  const requiredMissing = (def?.fields ?? []).filter(
    (f) => f.required && mapping[f.key] === undefined && !coveredRequired.has(f.key)
  )
  const mappedCount = (def?.fields ?? []).filter((f) => mapping[f.key] !== undefined).length
  const review = useMemo(
    () => (def ? reviewRows(mappedRows, def.fields, mapping) : { ready: 0, attention: [] }),
    [def, mappedRows, mapping]
  )

  const runImport = () =>
    startTransition(async () => {
      if (!def) return
      let res: ImportResult
      switch (def.key) {
        case "loads":
          res = await importLoadsAction(mappedRows as unknown as ImportRow[], { asHistory })
          break
        case "trucks":
          res = await importTrucksAction(mappedRows)
          break
        case "drivers":
          res = await importDriversAction(mappedRows, { sendInvites })
          break
        case "customers":
          res = await importCustomersAction(mappedRows)
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
      setStep(4)
      if (res.imported > 0) toast.success(`Imported ${res.imported} rows`)
      if (res.failed.length > 0) toast.error(`${res.failed.length} rows failed`)
    })

  const saveTemplate = () =>
    startTransition(async () => {
      if (!def?.templateKind) return
      const name = templateName.trim() || program.trim() || fileName || "default"
      const res = await saveImportTemplateAction(def.templateKind, name, mapping)
      if (res.ok) {
        toast.success(`Mapping saved as "${name}" — one-click next time`)
        const fresh = await listImportTemplatesAction(def.templateKind)
        setTemplates(fresh)
      } else toast.error(res.error ?? "Could not save template")
    })

  const chooser = KINDS.find((k) => k.key === chooserFor) ?? null

  return (
    <div>
      {/* Category card grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 hub-stagger">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => openKind(k.key)}
            className="flex min-h-[112px] flex-col items-start rounded-card border border-border bg-surface p-4 text-left shadow-card hover:bg-hover"
          >
            <span className={cn("mb-2.5 flex h-10 w-10 items-center justify-center rounded-control", TINT_CLS[k.tint])}>
              <k.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-fg">{k.label}</span>
            <span className="mt-0.5 text-[12px] leading-snug text-fg-3">{k.outcome}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-[12.5px] text-fg-3">
        Map columns once — saved mappings apply themselves next time. Connected sources (ELD, fuel
        cards) keep these fresh automatically;{" "}
        <Link href="/hub/settings/integrations" className="font-medium text-accent-text hover:underline">
          see integrations
        </Link>
        .
      </p>

      {/* Connect-first chooser for ELD/positions + fuel */}
      <BottomSheet
        open={chooser != null}
        onOpenChange={(o) => !o && setChooserFor(null)}
        title={chooser?.connect?.title ?? ""}
        description={chooser?.connect?.blurb}
      >
        {chooser ? (
          <div className="space-y-2">
            {canConnect ? (
              <Link
                href="/hub/settings/integrations"
                className="flex min-h-[56px] items-center gap-3 rounded-card border border-border bg-surface px-3 shadow-card hover:bg-hover"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text">
                  <Cable className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">
                    {chooser.key === "positions" ? "Connect Terminal or TruckerCloud" : "Connect EFS, WEX or Comdata"}
                  </span>
                  <span className="block text-[12px] text-fg-3">Set up once — data syncs itself.</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-fg-3" />
              </Link>
            ) : (
              <p className="rounded-control bg-surface-2 px-3 py-2.5 text-[12.5px] text-fg-3">
                A live {chooser.key === "positions" ? "ELD" : "fuel-card"} feed can sync this
                automatically — ask the workspace owner to set it up under Integrations.
              </p>
            )}
            <button
              type="button"
              onClick={() => startUploadFlow(chooser.key)}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-control px-3 text-[13px] font-medium text-fg-3 hover:bg-hover hover:text-fg-2"
            >
              or upload a file instead
            </button>
            {chooser.key === "positions" ? (
              <div className="pt-1">
                <EldFileImport />
              </div>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      {/* Guided importer stepper */}
      <BottomSheet
        open={def != null}
        onOpenChange={(o) => {
          if (!o) {
            setKind(null)
            resetFlow()
          }
        }}
        title={def ? `Import ${def.label.toLowerCase()}` : ""}
        description={def && step < 4 ? `Step ${step} of 3 · ${def.hint}` : undefined}
        wide
      >
        {def ? (
          <div>
            {/* Step dots */}
            {step < 4 ? (
              <div className="mb-4 flex items-center gap-1.5" aria-hidden>
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "h-1.5 rounded-pill transition-all duration-base",
                      s === step ? "w-6 bg-accent" : s < step ? "w-3 bg-accent-soft" : "w-3 bg-surface-2"
                    )}
                  />
                ))}
              </div>
            ) : null}

            {/* Step 1 — choose file */}
            {step === 1 ? (
              <div>
                {def.key === "mileage" ? (
                  <p className="mb-3 rounded-control bg-warn-soft p-3 text-body-sm text-warn">
                    An IFTA-mileage import <strong>replaces</strong> that quarter&apos;s imported
                    mileage on file — every truck, not just the ones in your file. Always upload the
                    whole quarter together.
                  </p>
                ) : null}
                {def.key === "fuel" || def.key === "tolls" ? (
                  <div className="mb-3 max-w-xs">
                    <label className={labelCls} htmlFor="program">Program name (EFS, Comdata…)</label>
                    <input id="program" className={fieldCls} value={program}
                      onChange={(e) => setProgram(e.target.value)} placeholder="EFS" />
                  </div>
                ) : null}
                <label className="pressable flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-strong p-4 text-center hover:border-accent hover:bg-hover">
                  <FileSpreadsheet className="h-6 w-6 text-fg-3" />
                  <span className="text-sm font-semibold text-fg-2">
                    {fileName ?? "Choose a .csv file"}
                  </span>
                  <span className="text-[12px] text-fg-3">Straight from your spreadsheet export</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      // Clear so re-picking the same file after a failed
                      // parse fires change again.
                      e.target.value = ""
                      if (file) handleFile(file)
                    }}
                  />
                </label>
              </div>
            ) : null}

            {/* Step 2 — mapping */}
            {step === 2 ? (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-fg">
                    {mappedCount} of {def.fields.length} columns matched
                    <span className="ml-2 font-normal text-fg-3">
                      {rows.length} data row{rows.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  {templates.length > 0 ? (
                    <select
                      aria-label="Apply saved template"
                      className={`${fieldCls} w-52`}
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
                  <p className="mt-3 rounded-control bg-warn-soft p-3 text-body-sm text-warn">
                    Still needed: {requiredMissing.map((f) => f.label).join(", ")}
                  </p>
                ) : null}
                {def.templateKind ? (
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
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> Save mapping
                    </button>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control px-3 text-sm font-medium text-fg-3 hover:bg-hover hover:text-fg-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={requiredMissing.length > 0}
                    onClick={() => setStep(3)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
                  >
                    Review rows <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* Step 3 — review (client-side dry run) */}
            {step === 3 ? (
              <div>
                <p className="text-sm font-semibold text-fg">
                  {review.ready} row{review.ready === 1 ? "" : "s"} ready
                  {review.attention.length > 0 ? (
                    <span className="text-warn"> · {review.attention.length} need attention</span>
                  ) : null}
                </p>
                {review.attention.length > 0 ? (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-control bg-warn-soft p-3">
                    {review.attention.slice(0, 8).map((a) => (
                      <p key={a.row} className="text-body-xs text-warn">
                        Row {a.row}: missing {a.missing.join(", ")}
                      </p>
                    ))}
                    {review.attention.length > 8 ? (
                      <p className="mt-1 text-body-xs text-warn">
                        …and {review.attention.length - 8} more. Fix the file or go back to remap —
                        incomplete rows are reported, not silently dropped.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {def.key === "loads" ? (
                  <label className="mt-4 flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={asHistory}
                      onChange={(e) => setAsHistory(e.target.checked)}
                      className="h-5 w-5 rounded border-border-strong accent-accent"
                    />
                    <span className="text-sm text-fg-2">
                      Import as history (settled) — recommended for past loads
                    </span>
                  </label>
                ) : null}
                {def.key === "drivers" ? (
                  <label className="mt-4 flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInvites}
                      onChange={(e) => setSendInvites(e.target.checked)}
                      className="h-5 w-5 rounded border-border-strong accent-accent"
                    />
                    <span className="text-sm text-fg-2">
                      Email each driver an app invite (only rows with an email address)
                    </span>
                  </label>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control px-3 text-sm font-medium text-fg-3 hover:bg-hover hover:text-fg-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={runImport}
                    disabled={pending || mappedRows.length === 0}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Import {mappedRows.length} row{mappedRows.length === 1 ? "" : "s"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Step 4 — result */}
            {step === 4 && result ? (
              <div className="py-2 text-center">
                {result.ok && result.imported > 0 ? <CheckDraw className="mb-3" /> : null}
                <p className="text-[17px] font-semibold text-fg">
                  {result.imported > 0
                    ? `${result.imported} ${def.label.toLowerCase()} row${result.imported === 1 ? "" : "s"} imported`
                    : "Nothing imported"}
                </p>
                <p className="mt-1 text-body-sm text-fg-2">
                  {result.customersCreated != null ? `${result.customersCreated} brokers created · ` : ""}
                  {result.skippedDuplicates != null && result.skippedDuplicates > 0 ? `${result.skippedDuplicates} duplicates skipped · ` : ""}
                  {(result.vinDecoded ?? 0) > 0 ? `${result.vinDecoded} decoded from VIN · ` : ""}
                  {(result.invitesSent ?? 0) > 0 ? `${result.invitesSent} app invites emailed · ` : ""}
                  {result.failed.length} failed
                </p>
                {(result.rowsReplaced ?? 0) > 0 ? (
                  <p className="mt-1 text-body-xs text-warn">
                    Replaced {result.rowsReplaced} previously imported rows for the quarter(s) in this file.
                  </p>
                ) : null}
                {(result.invitesFailed ?? 0) > 0 ? (
                  <p className="mt-1 text-body-xs text-warn">{result.invitesFailed} invites couldn&apos;t be emailed.</p>
                ) : null}
                {result.failed.length > 0 ? (
                  <ul className="mx-auto mt-2 max-w-sm space-y-1 text-left text-body-xs text-bad">
                    {result.failed.slice(0, 10).map((f) => (
                      <li key={f.row}>{f.row === 0 ? f.error : `Row ${f.row}: ${f.error}`}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setKind(null)
                      resetFlow()
                    }}
                    className="inline-flex min-h-[44px] items-center rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
                  >
                    Done
                  </button>
                  {result.imported > 0 ? (
                    <Link
                      href={
                        def.key === "trucks" ? "/hub/fleet"
                        : def.key === "drivers" ? "/hub/drivers"
                        : def.key === "customers" ? "/hub/customers"
                        : def.key === "fuel" ? "/hub/fuel"
                        : def.key === "positions" ? "/hub/map"
                        : def.key === "mileage" ? "/hub/compliance/ifta"
                        : "/hub/loads"
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                    >
                      See them <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  )
}
