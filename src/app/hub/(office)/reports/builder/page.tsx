import Link from "next/link"
import { revalidatePath } from "next/cache"
import { Download, Save } from "lucide-react"
import { requirePermissionPage } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { hubDbAvailable } from "@/lib/hub/db-available"
import { PageHeader, Panel, fieldCls, labelCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

interface TemplateRow {
  id: string
  name: string
  source: string
  columns: string[]
  date_range: string
}

const fallbackTemplates: TemplateRow[] = [
  { id: "weekly-owner", name: "Weekly owner report", source: "loads", columns: ["Company", "Load", "Customer", "Gross", "Margin", "Status"], date_range: "This week" },
  { id: "ar-aging", name: "AR aging detail", source: "invoices", columns: ["Company", "Invoice", "Customer", "Due", "Bucket", "Open"], date_range: "Open invoices" },
  { id: "driver-pay", name: "Driver settlement history", source: "settlements", columns: ["Driver", "Tariff", "Gross", "Deductions", "Net"], date_range: "This month" },
]

const PNL_EXPORT_URL = "/api/hub/exports/pnl"

async function saveReportTemplate(formData: FormData) {
  "use server"
  const user = await requirePermissionPage("money:read")
  if (!hubDbAvailable()) throw new Error("Connect POSTGRES_URL before saving report templates.")
  const name = String(formData.get("name") || "").trim()
  const source = String(formData.get("source") || "loads").trim()
  const dateRange = String(formData.get("dateRange") || "This week").trim()
  const columns = String(formData.get("columns") || "")
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
  if (!name) throw new Error("Template name is required.")
  await query(
    `INSERT INTO hub.saved_report_templates (carrier_id, data_mode, name, source, mapping)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (carrier_id, name) DO UPDATE SET
       source = EXCLUDED.source,
       mapping = EXCLUDED.mapping,
       updated_at = NOW()`,
    [user.carrierId, user.dataMode, name, source, JSON.stringify({ columns, dateRange })]
  )
  revalidatePath("/hub/reports/builder")
}

export default async function ReportBuilderPage() {
  await requirePermissionPage("money:read")
  const templates = hubDbAvailable()
    ? await query<TemplateRow>(
        `SELECT id, name, source, COALESCE(mapping->'columns','[]'::jsonb) AS columns,
                COALESCE(mapping->>'dateRange','Saved') AS date_range
         FROM hub.saved_report_templates
         ORDER BY updated_at DESC
         LIMIT 50`
      ).catch(() => fallbackTemplates)
    : fallbackTemplates

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Report builder"
        subtitle="Pick a source, columns, and date range. Saved templates become one-click weekly owner reports."
        action={
          <Link href="/hub/reports" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5">
            Reports
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-4 md:p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-white">New template</h2>
          <form action={saveReportTemplate} className="space-y-3">
            <div>
              <label htmlFor="report-name" className={labelCls}>Template name</label>
              <input id="report-name" name="name" className={fieldCls} placeholder="Friday dispatcher report" />
            </div>
            <div>
              <label htmlFor="source" className={labelCls}>Source</label>
              <select id="source" name="source" className={fieldCls}>
                <option value="loads">Loads</option>
                <option value="invoices">Invoices / AR</option>
                <option value="settlements">Settlements</option>
                <option value="fuel">Fuel</option>
                <option value="tolls">Tolls</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            <div>
              <label htmlFor="range" className={labelCls}>Date range</label>
              <select id="range" name="dateRange" className={fieldCls}>
                <option>This week</option>
                <option>This month</option>
                <option>Last quarter</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label htmlFor="columns" className={labelCls}>Columns</label>
              <textarea id="columns" name="columns" className={`${fieldCls} min-h-28`} placeholder="Company, Load, Broker, Lane, Gross, Driver pay, Fuel, Tolls, Net" />
            </div>
            <button className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta">
              <Save className="h-4 w-4" /> Save template
            </button>
            <p className="text-xs text-steel-300">
              Template persistence is enabled when production Postgres is connected. The sandbox fallback shows sample templates now.
            </p>
          </form>
        </Panel>

        <Panel className="p-4 md:p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-white">Saved templates</h2>
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{template.name}</p>
                    <p className="mt-1 text-sm text-steel-200">
                      {template.source} · {template.date_range}
                    </p>
                  </div>
                  <a
                    href={PNL_EXPORT_URL}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-gold"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </a>
                </div>
                <p className="mt-2 text-xs text-steel-300">{template.columns.join(", ")}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
