import crypto from "node:crypto"
import { revalidatePath } from "next/cache"
import { requirePermissionPage } from "@/lib/hub/session"
import { hubDbAvailable, query } from "@/lib/hub/db"
import { BackLink, PageHeader, Panel, fieldCls, labelCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

const PROVIDERS = [
  ["smtp", "SMTP outbound mail"],
  ["imap", "Docs/load mailbox (IMAP)"],
  ["truckx", "TruckX / Terminal ELD"],
  ["fuel", "Fuel card feed"],
  ["tolls", "Toll portal"],
  ["factoring", "Factoring portal"],
  ["quickbooks", "QuickBooks Online"],
  ["dat", "DAT"],
  ["uber_freight", "Uber Freight"],
] as const

interface IntegrationRow {
  id: string
  provider: string
  label: string
  status: string
  metadata: Record<string, unknown>
  encrypted_secret: string | null
  updated_at: string
}

function encryptSecret(secret: string): string {
  const keyMaterial = process.env.CREDENTIALS_KEY
  if (!keyMaterial || keyMaterial.length < 32) {
    throw new Error("CREDENTIALS_KEY must be set to 32+ random characters before storing integration secrets.")
  }
  const key = crypto.createHash("sha256").update(keyMaterial).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".")
}

async function saveIntegration(formData: FormData) {
  "use server"
  const user = await requirePermissionPage("settings:manage")
  if (!hubDbAvailable()) throw new Error("Connect POSTGRES_URL before saving production integration credentials.")

  const provider = String(formData.get("provider") || "").trim()
  const label = String(formData.get("label") || "default").trim() || "default"
  const account = String(formData.get("account") || "").trim()
  const secret = String(formData.get("secret") || "").trim()
  const notes = String(formData.get("notes") || "").trim()
  if (!provider) throw new Error("Provider is required.")

  const encryptedSecret = secret ? encryptSecret(secret) : null
  await query(
    `INSERT INTO hub.integration_credentials (
      carrier_id, data_mode, provider, label, status, metadata, encrypted_secret
     ) VALUES ($1,'production',$2,$3,$4,$5::jsonb,$6)
     ON CONFLICT (carrier_id, provider, label) DO UPDATE SET
       status = EXCLUDED.status,
       metadata = EXCLUDED.metadata,
       encrypted_secret = COALESCE(EXCLUDED.encrypted_secret, hub.integration_credentials.encrypted_secret),
       updated_at = NOW()`,
    [
      user.carrierId,
      provider,
      label,
      encryptedSecret || account ? "configured" : "pending",
      JSON.stringify({ account, notes, hasSecret: Boolean(encryptedSecret) }),
      encryptedSecret,
    ]
  )
  await query(
    `UPDATE hub.onboarding_items SET status = 'done', updated_at = NOW()
     WHERE carrier_id = $1 AND item_key IN ('smtp','integrations')`,
    [user.carrierId]
  )
  revalidatePath("/hub/settings/integrations")
  revalidatePath("/hub/onboarding")
}

export default async function IntegrationsPage() {
  const user = await requirePermissionPage("settings:manage")
  const rows = hubDbAvailable()
    ? await query<IntegrationRow>(
        `SELECT id, provider, label, status, metadata, encrypted_secret, updated_at
         FROM hub.integration_credentials
         WHERE carrier_id = $1
         ORDER BY provider, label`,
        [user.carrierId]
      )
    : []

  return (
    <div className="max-w-5xl">
      <BackLink href="/hub/onboarding" label="Onboarding" />
      <PageHeader
        title="Integration credentials"
        subtitle="Live paths activate when credentials exist. CSV/manual imports keep working while vendors are pending."
      />

      <Panel className="mb-4 p-4">
        <p className="text-sm font-semibold text-white">Security rule</p>
        <p className="mt-1 text-sm text-steel-200">
          Set `CREDENTIALS_KEY` in Vercel before storing secrets. Secrets are encrypted with AES-256-GCM and never printed back to the UI.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel className="p-4 md:p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-white">Add credential</h2>
          <form action={saveIntegration} className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="provider">Provider</label>
              <select id="provider" name="provider" className={fieldCls}>
                {PROVIDERS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="label">Label</label>
              <input id="label" name="label" className={fieldCls} placeholder="default / EFS / Bestpass…" />
            </div>
            <div>
              <label className={labelCls} htmlFor="account">Account / username / client ID</label>
              <input id="account" name="account" className={fieldCls} autoComplete="off" />
            </div>
            <div>
              <label className={labelCls} htmlFor="secret">Secret / API key / app password</label>
              <input id="secret" name="secret" type="password" className={fieldCls} autoComplete="new-password" />
            </div>
            <div>
              <label className={labelCls} htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" className={`${fieldCls} min-h-24`} placeholder="Portal URL, rep contact, feed cadence, setup status…" />
            </div>
            <button className="min-h-[48px] w-full rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta">
              Save encrypted credential
            </button>
          </form>
        </Panel>

        <Panel className="p-4 md:p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-white">Configured / pending</h2>
          {!hubDbAvailable() ? (
            <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
              No database connected. This page is ready, but production credentials require `POSTGRES_URL` and `CREDENTIALS_KEY`.
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-3 text-sm text-steel-200">
              No live credentials yet. CSV/manual fallback remains active for every integration.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">{row.provider} · {row.label}</p>
                    <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-gold">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-steel-200">
                    Account: {String(row.metadata?.account || "—")} · Secret: {row.encrypted_secret ? "encrypted" : "not stored"}
                  </p>
                  {row.metadata?.notes ? <p className="mt-1 text-xs text-steel-300">{String(row.metadata.notes)}</p> : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
