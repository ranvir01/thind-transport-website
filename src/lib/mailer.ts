/**
 * Shared SMTP transport for every email the site sends.
 * Single source of truth so the apply form, pre-qualify, portal,
 * and password-reset flows all behave the same way.
 */

import * as nodemailer from "nodemailer"

export const smtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER
export const smtpPass = () => process.env.SMTP_PASS || process.env.EMAIL_PASS

const PLACEHOLDER_USERS = new Set([
  "your-gmail@gmail.com",
  "your-email@gmail.com",
])
const PLACEHOLDER_PASSES = new Set([
  "your-16-character-app-password",
  "your-app-password",
  "changeme",
])

function looksLikePlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const trimmed = value.trim().toLowerCase()
  return (
    PLACEHOLDER_USERS.has(trimmed) ||
    PLACEHOLDER_PASSES.has(trimmed) ||
    trimmed.includes("your-") ||
    trimmed.includes("example.com")
  )
}

/**
 * True only when SMTP creds look real. Empty *or* the .env.example
 * placeholders count as unset — otherwise production crons treat
 * "your-gmail@gmail.com" as configured and 535 against Gmail for 8s.
 */
export function isEmailConfigured(): boolean {
  const user = smtpUser()
  const pass = smtpPass()
  if (!user || !pass) return false
  return !looksLikePlaceholder(user) && !looksLikePlaceholder(pass)
}

export function createMailTransport() {
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

export function mailFrom(displayName = "Thind Transport Website") {
  return process.env.SMTP_FROM || `"${displayName}" <${smtpUser() || "noreply@thindtransport.com"}>`
}
