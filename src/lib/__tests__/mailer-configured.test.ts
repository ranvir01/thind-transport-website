import { afterEach, describe, expect, it } from "vitest"
import { isEmailConfigured } from "../mailer"

const KEYS = ["SMTP_USER", "SMTP_PASS", "EMAIL_USER", "EMAIL_PASS"] as const
const saved: Record<string, string | undefined> = {}

function setEnv(user: string | undefined, pass: string | undefined) {
  for (const key of KEYS) saved[key] = process.env[key]
  if (user === undefined) {
    delete process.env.SMTP_USER
    delete process.env.EMAIL_USER
  } else {
    process.env.SMTP_USER = user
    delete process.env.EMAIL_USER
  }
  if (pass === undefined) {
    delete process.env.SMTP_PASS
    delete process.env.EMAIL_PASS
  } else {
    process.env.SMTP_PASS = pass
    delete process.env.EMAIL_PASS
  }
}

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe("isEmailConfigured", () => {
  it("is false when creds are missing", () => {
    setEnv(undefined, undefined)
    expect(isEmailConfigured()).toBe(false)
  })

  it("treats .env.example placeholders as unset so Vercel crons do not 535", () => {
    setEnv("your-gmail@gmail.com", "your-16-character-app-password")
    expect(isEmailConfigured()).toBe(false)
  })

  it("is true for a real-looking user and app password", () => {
    setEnv("thindcarrier@gmail.com", "abcd efgh ijkl mnop")
    expect(isEmailConfigured()).toBe(true)
  })
})
