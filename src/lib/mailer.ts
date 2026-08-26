/**
 * Shared SMTP transport for every email the site sends.
 * Single source of truth so the apply form, pre-qualify, portal,
 * and password-reset flows all behave the same way.
 */

import * as nodemailer from "nodemailer"

export const smtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER
export const smtpPass = () => process.env.SMTP_PASS || process.env.EMAIL_PASS

export function isEmailConfigured(): boolean {
  return Boolean(smtpUser() && smtpPass())
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
