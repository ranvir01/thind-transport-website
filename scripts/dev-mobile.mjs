#!/usr/bin/env node
/**
 * Start HaulDesk locally behind a public HTTPS tunnel for iPhone testing.
 *
 * iOS Safari requires HTTPS for camera capture, service workers, PWA install,
 * and push APIs. LAN http:// URLs are intentionally not enough for this flow.
 */
import { spawn, spawnSync } from "node:child_process"
import { networkInterfaces } from "node:os"

const PORT = process.env.PORT || "3000"
const SANDBOX_EMAIL = process.env.SANDBOX_SMOKE_EMAIL || "owner@sandbox.hauldesk.local"
const SANDBOX_PASSWORD = process.env.SANDBOX_SMOKE_PASSWORD || "SandboxOwner1!"

const children = new Set()

function spawnTracked(command, args, options = {}) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options })
  children.add(child)
  child.on("exit", () => children.delete(child))
  return child
}

function cleanup() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM")
  }
}

process.on("SIGINT", () => {
  cleanup()
  process.exit(130)
})
process.on("SIGTERM", () => {
  cleanup()
  process.exit(143)
})

function hasCommand(command) {
  return spawnSync("bash", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTunnelUrl(child, label) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) reject(new Error(`${label} did not print an https URL within 45 seconds`))
    }, 45_000)

    const scan = (chunk) => {
      const text = chunk.toString()
      process.stdout.write(text)
      const url = text.match(/https:\/\/[^\s|]+/)?.[0]
      if (url && !settled) {
        settled = true
        clearTimeout(timer)
        resolve(url.replace(/[.)\]]$/, ""))
      }
    }

    child.stdout.on("data", scan)
    child.stderr.on("data", scan)
    child.on("exit", (code) => {
      if (!settled) {
        clearTimeout(timer)
        reject(new Error(`${label} exited before tunnel URL was available (code ${code})`))
      }
    })
  })
}

async function waitForHttp(url, timeoutMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" })
      if (res.status < 500) return
    } catch {
      // dev server is still booting
    }
    await wait(1500)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function cookieHeaderFrom(setCookieHeaders) {
  return setCookieHeaders
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ")
}

async function smokeSignIn(baseUrl) {
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
  if (!csrfRes.ok) throw new Error(`CSRF request failed: ${csrfRes.status}`)
  const setCookie = csrfRes.headers.getSetCookie?.() ?? []
  const cookie = cookieHeaderFrom(setCookie)
  const csrf = await csrfRes.json()

  const body = new URLSearchParams({
    email: SANDBOX_EMAIL,
    password: SANDBOX_PASSWORD,
    csrfToken: csrf.csrfToken,
    callbackUrl: `${baseUrl}/hub`,
    json: "true",
  })

  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie,
    },
    redirect: "manual",
    body,
  })

  const loginCookies = loginRes.headers.getSetCookie?.() ?? []
  const sessionCookie = cookieHeaderFrom([...setCookie, ...loginCookies])
  const hubRes = await fetch(`${baseUrl}/hub`, {
    headers: { cookie: sessionCookie },
    redirect: "manual",
  })
  if (![200, 307, 308].includes(hubRes.status)) {
    throw new Error(`Hub smoke request returned ${hubRes.status}`)
  }
  if (!sessionCookie.includes("authjs.session-token")) {
    throw new Error("Sign-in did not return an authjs session cookie")
  }
}

function firstLanAddress() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address
    }
  }
  return null
}

async function main() {
  console.log("\n🚚 HaulDesk iPhone HTTPS dev tunnel\n")
  console.log("Starting tunnel first so NextAuth/server actions can trust the generated host…\n")

  const useCloudflared = hasCommand("cloudflared")
  const tunnel = useCloudflared
    ? spawnTracked("cloudflared", ["tunnel", "--url", `http://localhost:${PORT}`])
    : spawnTracked("npx", ["--yes", "localtunnel", "--port", PORT])

  const publicUrl = await waitForTunnelUrl(tunnel, useCloudflared ? "cloudflared" : "localtunnel")
  const host = new URL(publicUrl).host

  console.log(`\nTunnel URL captured: ${publicUrl}\n`)
  console.log("Starting Next.js with tunnel-safe auth/action origins…\n")

  const next = spawnTracked("npx", ["next", "dev", "-H", "0.0.0.0", "-p", PORT], {
    env: {
      ...process.env,
      NEXTAUTH_URL: publicUrl,
      NEXT_SERVER_ACTION_ALLOWED_ORIGINS: [
        host,
        process.env.NEXT_SERVER_ACTION_ALLOWED_ORIGINS,
      ].filter(Boolean).join(","),
    },
  })

  next.stdout.on("data", (chunk) => process.stdout.write(chunk))
  next.stderr.on("data", (chunk) => process.stderr.write(chunk))

  await waitForHttp(`http://localhost:${PORT}/hub/login`)

  try {
    await smokeSignIn(publicUrl)
    console.log("\n✅ Tunnel sign-in smoke passed with sandbox owner credentials.")
  } catch (error) {
    console.log("\n⚠️  Tunnel is up, but sandbox sign-in smoke did not pass.")
    console.log(`   ${error instanceof Error ? error.message : String(error)}`)
    console.log("   Run `npm run db:migrate && npm run seed:sandbox`, then restart `npm run dev:mobile`.")
  }

  const lan = firstLanAddress()
  console.log("\n============================================================")
  console.log("📱 OPEN THIS HTTPS URL ON YOUR IPHONE SAFARI")
  console.log(`\n   ${publicUrl}\n`)
  console.log("Sandbox owner login:")
  console.log(`   ${SANDBOX_EMAIL}`)
  console.log(`   ${SANDBOX_PASSWORD}`)
  console.log("\nQuick-tunnel URLs change every run. Use Vercel preview for a stable repeated-test URL.")
  if (lan) console.log(`LAN UI-only fallback: http://${lan}:${PORT} (not valid for camera/PWA on iOS)`)
  console.log("============================================================\n")
}

main().catch((error) => {
  cleanup()
  console.error(`\nFailed to start mobile tunnel: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
