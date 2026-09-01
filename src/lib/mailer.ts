/**
 * Shared SMTP transport for every email the site sends.
 * Single source of truth so the apply form, pre-qualify, portal,
 * and password-reset flows all behave the same way.
 *
 * In SIMULATION mode, sendMail writes to hub.email_outbox and NEVER opens
 * an SMTP socket — fabricated numbers cannot leave to a real broker, driver,
 * bank, or the IRS. Call sites stay sync (`createMailTransport().sendMail`);
 * the echo happens inside sendMail.
 */

import * as nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import type Mail from "nodemailer/lib/mailer"

export const smtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER
export const smtpPass = () => process.env.SMTP_PASS || process.env.EMAIL_PASS

/** SMTP credentials present — independent of simulation echo. */
export function isEmailConfigured(): boolean {
  return Boolean(smtpUser() && smtpPass())
}

export async function mailShouldSend(): Promise<boolean> {
  if (isEmailConfigured()) return true
  if (process.env.HAULDESK_MODE === "simulation") return true
  try {
    const { queryOne } = await import("@/lib/hub/db")
    const row = await queryOne<{ mode: string }>(`SELECT mode FROM hub.platform_state WHERE id = 1`)
    return row?.mode === "simulation"
  } catch {
    return false
  }
}

function realTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    // Local catchers (maildev/mailhog) don't use auth — only pass creds when present
    ...(isEmailConfigured() ? { auth: { user: smtpUser(), pass: smtpPass() } } : {}),
    // Serverless guard: an unreachable SMTP host must fail in seconds, not hang
    // a Vercel function until its timeout (invoice/settlement actions await this).
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  })
}

type SendMailInput = Mail.Options

function addr(value: Mail.Options["to"] | Mail.Options["from"] | Mail.Options["cc"]): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : item.address)).join(", ")
  }
  return value.address
}

async function echoToOutbox(opts: SendMailInput) {
  try {
    const { query } = await import("@/lib/hub/db")
    await query(
      `INSERT INTO hub.email_outbox
         (to_addr, from_addr, cc_addr, subject, body_text, body_html, attachments_meta, kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        addr(opts.to) || "(none)",
        opts.from ?? null,
        addr(opts.cc) || null,
        opts.subject ?? null,
        typeof opts.text === "string" ? opts.text : null,
        typeof opts.html === "string" ? opts.html : null,
        JSON.stringify((opts.attachments ?? []).map((a) => ({ filename: a.filename ?? "attachment" }))),
        "simulation-echo",
      ]
    )
  } catch (err) {
    // Never throw — a missing table must not crash an invoice. Log instead.
    console.info("[sim-mail]", addr(opts.to), opts.subject, err instanceof Error ? err.message : "echo failed")
  }
  return { messageId: `sim-${Date.now()}`, accepted: [addr(opts.to)], rejected: [] as string[] }
}

/**
 * Drop-in transport. In simulation, sendMail echoes to the in-app outbox.
 * In legit mode, this is the real nodemailer SMTP transport.
 */
export function createMailTransport(): {
  sendMail: (opts: SendMailInput) => Promise<SMTPTransport.SentMessageInfo | { messageId: string }>
} {
  return {
    async sendMail(opts: SendMailInput) {
      const { isSimulation } = await import("@/lib/hub/mode")
      if (await isSimulation()) {
        return echoToOutbox(opts)
      }
      return realTransport().sendMail(opts)
    },
  }
}

export function mailFrom(displayName = "Thind Transport Website") {
  return process.env.SMTP_FROM || `"${displayName}" <${smtpUser() || "noreply@thindtransport.com"}>`
}
