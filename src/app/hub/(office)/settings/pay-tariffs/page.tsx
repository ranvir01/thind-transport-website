import { revalidatePath } from "next/cache"
import { requirePermissionPage } from "@/lib/hub/session"
import { query } from "@/lib/hub/db"
import { hubDbAvailable } from "@/lib/hub/db-available"
import { dollarsToCents, fmtCentsExact } from "@/lib/hub/types"
import { BackLink, PageHeader, Panel, fieldCls, labelCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

interface TariffRow {
  id: string
  name: string
  contractor_type: string
  pay_type: "per_mile" | "percentage"
  rate_bps: number | null
  loaded_rate_cents: number | null
  empty_rate_cents: number | null
  fsc_passthrough_bps: number
  plain_english: string
}

interface CategoryRow {
  id: string
  name: string
  active: boolean
}

interface RecurringRow {
  id: string
  label: string
  category: string
  amount_cents: number
  cadence: string
  active: boolean
}

function bpsFromPercent(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null
  const numeric = Number(String(value).replace(/[^0-9.\-]/g, ""))
  if (!Number.isFinite(numeric)) return null
  return Math.round(numeric * 100)
}

async function saveTariff(formData: FormData) {
  "use server"
  const user = await requirePermissionPage("settings:manage")
  if (!hubDbAvailable()) throw new Error("Connect POSTGRES_URL before saving production pay tariffs.")

  const name = String(formData.get("name") || "").trim()
  const contractorType = String(formData.get("contractorType") || "company_driver_1099")
  const payType = String(formData.get("payType") || "per_mile") as "per_mile" | "percentage"
  const plainEnglish = String(formData.get("plainEnglish") || "").trim()
  if (!name || !plainEnglish) throw new Error("Tariff name and plain-English rules are required.")

  await query(
    `INSERT INTO hub.pay_tariffs (
       carrier_id, data_mode, name, contractor_type, pay_type, rate_bps,
       loaded_rate_cents, empty_rate_cents, fsc_passthrough_bps, plain_english, rules
     ) VALUES ($1,'production',$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
     ON CONFLICT (carrier_id, name) DO UPDATE SET
       contractor_type = EXCLUDED.contractor_type,
       pay_type = EXCLUDED.pay_type,
       rate_bps = EXCLUDED.rate_bps,
       loaded_rate_cents = EXCLUDED.loaded_rate_cents,
       empty_rate_cents = EXCLUDED.empty_rate_cents,
       fsc_passthrough_bps = EXCLUDED.fsc_passthrough_bps,
       plain_english = EXCLUDED.plain_english,
       rules = EXCLUDED.rules,
       updated_at = NOW()`,
    [
      user.carrierId,
      name,
      contractorType,
      payType,
      payType === "percentage" ? bpsFromPercent(formData.get("percent")) : null,
      payType === "per_mile" ? dollarsToCents(String(formData.get("loadedRate") || "")) : null,
      payType === "per_mile" ? dollarsToCents(String(formData.get("emptyRate") || "")) : null,
      bpsFromPercent(formData.get("fscPassthrough")) ?? 0,
      plainEnglish,
      JSON.stringify({
        deductions: String(formData.get("deductions") || "").trim(),
        accessorials: String(formData.get("accessorials") || "").trim(),
      }),
    ]
  )
  await query(
    `UPDATE hub.onboarding_items SET status = 'done', updated_at = NOW()
     WHERE carrier_id = $1 AND item_key = 'pay-tariffs'`,
    [user.carrierId]
  )
  revalidatePath("/hub/settings/pay-tariffs")
  revalidatePath("/hub/onboarding")
}

async function saveCategory(formData: FormData) {
  "use server"
  const user = await requirePermissionPage("settings:manage")
  if (!hubDbAvailable()) throw new Error("Connect POSTGRES_URL before saving production categories.")
  const table = formData.get("kind") === "debit" ? "debit_categories" : "revenue_categories"
  const name = String(formData.get("name") || "").trim()
  if (!name) throw new Error("Category name is required.")
  await query(
    `INSERT INTO hub.${table} (carrier_id, data_mode, name)
     VALUES ($1,'production',$2)
     ON CONFLICT (carrier_id, name) DO UPDATE SET active = TRUE`,
    [user.carrierId, name]
  )
  revalidatePath("/hub/settings/pay-tariffs")
}

async function saveRecurring(formData: FormData) {
  "use server"
  const user = await requirePermissionPage("settings:manage")
  if (!hubDbAvailable()) throw new Error("Connect POSTGRES_URL before saving recurring deductions.")
  const label = String(formData.get("label") || "").trim()
  const category = String(formData.get("category") || "Other").trim()
  if (!label) throw new Error("Recurring transaction label is required.")
  await query(
    `INSERT INTO hub.recurring_transactions (
      carrier_id, data_mode, category, label, amount_cents, cadence, active
     ) VALUES ($1,'production',$2,$3,$4,'weekly',TRUE)`,
    [user.carrierId, category, label, dollarsToCents(String(formData.get("amount") || ""))]
  )
  revalidatePath("/hub/settings/pay-tariffs")
}

export default async function PayTariffsPage() {
  const user = await requirePermissionPage("settings:manage")
  const [tariffs, revenueCategories, debitCategories, recurring] = hubDbAvailable()
    ? await Promise.all([
        query<TariffRow>(`SELECT * FROM hub.pay_tariffs WHERE carrier_id = $1 ORDER BY name`, [user.carrierId]),
        query<CategoryRow>(`SELECT * FROM hub.revenue_categories WHERE carrier_id = $1 ORDER BY name`, [user.carrierId]),
        query<CategoryRow>(`SELECT * FROM hub.debit_categories WHERE carrier_id = $1 ORDER BY name`, [user.carrierId]),
        query<RecurringRow>(`SELECT * FROM hub.recurring_transactions WHERE carrier_id = $1 ORDER BY created_at DESC LIMIT 100`, [user.carrierId]),
      ])
    : [
        [
          {
            id: "fallback-oo",
            name: "OO-88 sample",
            contractor_type: "owner_operator_1099",
            pay_type: "percentage" as const,
            rate_bps: 8800,
            loaded_rate_cents: null,
            empty_rate_cents: null,
            fsc_passthrough_bps: 10000,
            plain_english: "Sample only: owner-operator gets 88% of linehaul + 100% FSC with weekly insurance/ELD/trailer/escrow deductions.",
          },
        ],
        ["Linehaul", "Fuel surcharge", "Detention", "Layover"].map((name, id) => ({ id: String(id), name, active: true })),
        ["Insurance", "ELD fee", "Trailer rent", "Escrow", "Advance recapture"].map((name, id) => ({ id: String(id), name, active: true })),
        [{ id: "sample", label: "Sample weekly insurance", category: "Insurance", amount_cents: 31200, cadence: "weekly", active: true }],
      ] as [TariffRow[], CategoryRow[], CategoryRow[], RecurringRow[]]

  return (
    <div className="max-w-6xl">
      <BackLink href="/hub/onboarding" label="Onboarding" />
      <PageHeader
        title="Pay tariffs & settlement setup"
        subtitle="Enter real 1099 pay rules in plain English. Sandbox examples are not production facts."
      />

      {!hubDbAvailable() ? (
        <Panel className="mb-4 border-gold/40 bg-gold/10 p-4">
          <p className="font-semibold text-gold">No database connected</p>
          <p className="mt-1 text-sm text-steel-100">
            These are sample fallback rows. Connect `POSTGRES_URL` before saving production tariffs.
          </p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel className="p-4 md:p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-white">Add or update tariff</h2>
          <form action={saveTariff} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="tariff_name">Tariff name</label>
              <input id="tariff_name" name="name" className={fieldCls} placeholder="OO-88 / CD-65-1099" />
            </div>
            <div>
              <label className={labelCls} htmlFor="contractorType">Contractor type</label>
              <select id="contractorType" name="contractorType" className={fieldCls}>
                <option value="owner_operator_1099">Owner-operator 1099</option>
                <option value="company_driver_1099">Company driver 1099</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="payType">Pay type</label>
              <select id="payType" name="payType" className={fieldCls}>
                <option value="percentage">% of gross / linehaul</option>
                <option value="per_mile">Per mile</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="percent">Percent rate</label>
              <input id="percent" name="percent" className={fieldCls} inputMode="decimal" placeholder="88" />
            </div>
            <div>
              <label className={labelCls} htmlFor="loadedRate">Loaded $/mi</label>
              <input id="loadedRate" name="loadedRate" className={fieldCls} inputMode="decimal" placeholder="0.65" />
            </div>
            <div>
              <label className={labelCls} htmlFor="emptyRate">Empty $/mi</label>
              <input id="emptyRate" name="emptyRate" className={fieldCls} inputMode="decimal" placeholder="0.40" />
            </div>
            <div>
              <label className={labelCls} htmlFor="fscPassthrough">FSC passthrough %</label>
              <input id="fscPassthrough" name="fscPassthrough" className={fieldCls} inputMode="decimal" placeholder="100" />
            </div>
            <div>
              <label className={labelCls} htmlFor="deductions">Recurring deductions notes</label>
              <input id="deductions" name="deductions" className={fieldCls} placeholder="$312 insurance, $45 ELD…" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="accessorials">Accessorial rules</label>
              <input id="accessorials" name="accessorials" className={fieldCls} placeholder="Detention $40/hr after 2 hours when broker pays…" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="plainEnglish">Plain-English pay rule</label>
              <textarea id="plainEnglish" name="plainEnglish" required className={`${fieldCls} min-h-32`} placeholder="Write it exactly how you'd explain it to a new bookkeeper." />
            </div>
            <button className="min-h-[48px] rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta sm:col-span-2">
              Save tariff
            </button>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4 md:p-5">
            <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-white">Tariffs</h2>
            <div className="space-y-2">
              {tariffs.map((tariff) => (
                <div key={tariff.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">{tariff.name}</p>
                    <span className="text-xs font-bold uppercase text-gold">{tariff.contractor_type.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-sm text-steel-200">{tariff.plain_english}</p>
                  <p className="mt-2 text-xs text-steel-300">
                    {tariff.pay_type === "percentage"
                      ? `${((tariff.rate_bps ?? 0) / 100).toFixed(2)}% + ${((tariff.fsc_passthrough_bps ?? 0) / 100).toFixed(0)}% FSC`
                      : `${fmtCentsExact(tariff.loaded_rate_cents ?? 0)}/loaded mi · ${fmtCentsExact(tariff.empty_rate_cents ?? 0)}/empty mi`}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4 md:p-5">
            <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-white">Revenue / debit categories</h2>
            <form action={saveCategory} className="mb-3 grid grid-cols-[1fr_auto] gap-2">
              <input name="name" className={fieldCls} placeholder="Category name" />
              <select name="kind" className={`${fieldCls} w-28`}>
                <option value="revenue">Revenue</option>
                <option value="debit">Debit</option>
              </select>
              <button className="col-span-2 min-h-[44px] rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100">
                Add category
              </button>
            </form>
            <p className="text-sm text-steel-200">Revenue: {revenueCategories.map((c) => c.name).join(", ") || "—"}</p>
            <p className="mt-1 text-sm text-steel-200">Debits: {debitCategories.map((c) => c.name).join(", ") || "—"}</p>
          </Panel>

          <Panel className="p-4 md:p-5">
            <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-white">Recurring weekly deductions</h2>
            <form action={saveRecurring} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input name="label" className={fieldCls} placeholder="Insurance" />
              <input name="category" className={fieldCls} placeholder="Insurance" />
              <input name="amount" className={fieldCls} inputMode="decimal" placeholder="312.00" />
              <button className="min-h-[44px] rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 sm:col-span-3">
                Add recurring deduction
              </button>
            </form>
            <div className="mt-3 space-y-1">
              {recurring.map((row) => (
                <p key={row.id} className="text-sm text-steel-200">
                  {row.label} · {row.category} · {fmtCentsExact(row.amount_cents)} / {row.cadence}
                </p>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
