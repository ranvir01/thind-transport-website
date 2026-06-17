import { Download } from "lucide-react"
import { PageHeader, Panel } from "@/components/hub/ui"
import { ImportWizard } from "@/components/hub/ImportWizard"

const templates = [
  ["loadboard.csv", "Loadboard"],
  ["drivers.csv", "Drivers"],
  ["trucks.csv", "Trucks"],
  ["trailers.csv", "Trailers"],
  ["customers.csv", "Customers"],
  ["pay-tariffs.csv", "Pay tariffs"],
  ["recurring-transactions.csv", "Recurring deductions"],
  ["open-ar.csv", "Open AR"],
  ["fuel.csv", "Fuel"],
  ["tolls.csv", "Tolls"],
]

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { kind } = await searchParams
  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="The universal engine: loads, fuel, tolls, positions, IFTA mileage — map columns once, reuse forever."
      />
      <Panel className="mb-4 p-4">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">Production templates</h2>
        <p className="mt-1 text-sm text-steel-200">
          Download a CSV header, fill it from your phone or spreadsheet, then upload it below. Example rows are clearly marked and should be replaced.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {templates.map(([file, label]) => (
            <a
              key={file}
              href={`/api/hub/import-template/${file}`}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-steel-100 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5 text-gold" /> {label}
            </a>
          ))}
        </div>
      </Panel>
      <ImportWizard initialKind={kind ?? "loads"} />
    </div>
  )
}
