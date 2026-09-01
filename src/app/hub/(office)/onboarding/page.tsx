import { revalidatePath } from "next/cache"
import Link from "next/link"
import { CheckCircle2, ExternalLink, LockKeyhole, Upload } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { query } from "@/lib/hub/db"
import { Panel, PageHeader, fieldCls, labelCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

async function saveCarrierProfile(formData: FormData) {
  "use server"
  const user = await requireOfficeUser()
  const carrier = await getCarrier(user.carrierId)
  if (!carrier || carrier.environment === "sandbox") return

  const legalName = String(formData.get("legalName") || "").trim() || null
  const dot = String(formData.get("dot") || "").trim() || null
  const mc = String(formData.get("mc") || "").trim() || null
  const phone = String(formData.get("phone") || "").trim() || null
  const billingEmail = String(formData.get("billingEmail") || "").trim() || null
  const invoicePrefix = String(formData.get("invoicePrefix") || "").trim() || null
  const remitTo = String(formData.get("remitTo") || "").trim() || null

  await query(
    `UPDATE hub.carriers
     SET legal_name = $2, name = COALESCE($2, name), dot_number = $3,
         mc_number = $4, phone = $5, email = $6, invoice_prefix = $7,
         remit_to = $8, updated_at = NOW()
     WHERE id = $1 AND environment = 'production'`,
    [user.carrierId, legalName, dot, mc, phone, billingEmail, invoicePrefix, remitTo]
  )
  await query(
    `UPDATE hub.carrier_settings
     SET settings = settings || $2::jsonb, updated_at = NOW()
     WHERE carrier_id = $1`,
    [
      user.carrierId,
      JSON.stringify({
        knownFacts: { dot, mc, phone },
        invoice: { prefix: invoicePrefix || "INV-", defaultTermsDays: 30 },
        notifications: { officeEmail: billingEmail },
        factoring: { remitName: remitTo ? legalName : null, remitAddress: remitTo },
      }),
    ]
  )
  await query(
    `UPDATE hub.onboarding_items
     SET status = 'done', updated_at = NOW()
     WHERE carrier_id = $1 AND item_key IN ('carrier-profile','invoice-branding')`,
    [user.carrierId]
  )
  revalidatePath("/hub/onboarding")
}

const setupCards = [
  { title: "Drivers", href: "/hub/drivers/new", hint: "Add CDL, med card, 1099 assignment, and pay tariff." },
  { title: "Trucks", href: "/hub/fleet/trucks/new", hint: "Add unit, VIN, odometer, ELD ID, fuel-card last 4." },
  { title: "Trailers", href: "/hub/fleet/trailers/new", hint: "Add dry van, reefer, or flatbed equipment." },
  { title: "Customers", href: "/hub/customers/new", hint: "Add broker/shipper terms, factoring, slow payer, blacklist." },
  { title: "Pay tariffs", href: "/hub/settings/pay-tariffs", hint: "Enter plain-English rules, recurring deductions, categories." },
  { title: "Fuel CSVs", href: "/hub/import", hint: "Upload last full quarter EFS/WEX/Comdata files." },
]

export default async function OnboardingPage() {
  const user = await requireOfficeUser()
  const carrier = await getCarrier(user.carrierId)
  const isSandbox = carrier?.environment === "sandbox" || user.dataMode === "sandbox"

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Get things done"
        subtitle="Phone-first setup checklist. Sandbox is for practice; production saves real company facts."
      />

      {isSandbox ? (
        <Panel className="mb-4 border-gold/40 bg-gold/10 p-4">
          <p className="text-sm font-bold text-gold">SANDBOX mode</p>
          <p className="mt-1 text-sm text-steel-100">
            You can click through sample data here. To enter real go-live details, sign into a production owner account
            and use this same page; sandbox saves never write production records.
          </p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-gold" />
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">Company profile & invoice branding</h2>
          </div>
          <form action={saveCarrierProfile} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="legalName">Legal name</label>
              <input id="legalName" name="legalName" defaultValue={carrier?.legal_name ?? carrier?.name ?? ""} className={fieldCls} disabled={isSandbox} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="dot">DOT #</label>
                <input id="dot" name="dot" defaultValue={carrier?.dot_number ?? ""} className={fieldCls} disabled={isSandbox} />
              </div>
              <div>
                <label className={labelCls} htmlFor="mc">MC #</label>
                <input id="mc" name="mc" defaultValue={carrier?.mc_number ?? ""} className={fieldCls} disabled={isSandbox} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="phone">Ops phone</label>
                <input id="phone" name="phone" defaultValue={carrier?.phone ?? ""} className={fieldCls} disabled={isSandbox} />
              </div>
              <div>
                <label className={labelCls} htmlFor="billingEmail">Billing / reply-to email</label>
                <input id="billingEmail" name="billingEmail" type="email" defaultValue={carrier?.email ?? ""} className={fieldCls} disabled={isSandbox} />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="invoicePrefix">Invoice prefix</label>
              <input id="invoicePrefix" name="invoicePrefix" defaultValue={carrier?.invoice_prefix ?? ""} className={fieldCls} disabled={isSandbox} />
            </div>
            <div>
              <label className={labelCls} htmlFor="remitTo">Remit-to / factoring address</label>
              <textarea id="remitTo" name="remitTo" defaultValue={carrier?.remit_to ?? ""} className={`${fieldCls} min-h-28`} disabled={isSandbox} />
            </div>
            <button
              type="submit"
              disabled={isSandbox}
              className="min-h-[48px] w-full rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Save production profile
            </button>
          </form>
        </Panel>

        <div className="space-y-3">
          {setupCards.map((card) => (
            <Link key={card.title} href={card.href} className="block">
              <Panel className="p-4 transition-colors hover:border-white/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{card.title}</p>
                    <p className="mt-1 text-sm text-steel-200">{card.hint}</p>
                  </div>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-gold" />
                </div>
              </Panel>
            </Link>
          ))}
          <Panel className="p-4">
            <div className="flex gap-3">
              <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="font-semibold text-white">Integration credentials</p>
                <p className="mt-1 text-sm text-steel-200">
                  Add SMTP/IMAP/Fuel/Factoring/QBO secrets in Vercel env first. App forms only store encrypted metadata when CREDENTIALS_KEY is set.
                </p>
                <Link href="/hub/settings/integrations" className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-steel-100 hover:bg-white/5">
                  Open integration settings
                </Link>
              </div>
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="flex gap-3">
              <Upload className="mt-1 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="font-semibold text-white">Import real files</p>
                <p className="mt-1 text-sm text-steel-200">
                  Drop CSV/PDF files into the intake folder or use Hub → Import from your phone for fuel, tolls, mileage, and loadboard files.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
