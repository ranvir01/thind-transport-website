/**
 * Local Next.js + a Cloudflare quick tunnel so a phone on Safari can hit
 * an https:// origin (required for Add to Home Screen / camera).
 *
 *   npm run dev:mobile
 *
 * Prints the HTTPS URL and the simulation logins. Leaves both processes
 * running until you Ctrl+C.
 */
import { spawn } from "node:child_process"
import { loadEnvLocal } from "./env-local.mjs"

loadEnvLocal()

const PORT = process.env.PORT || "3000"

function which(bin) {
  try {
    const result = spawn("which", [bin], { stdio: ["ignore", "pipe", "ignore"] })
    return new Promise((resolve) => {
      let out = ""
      result.stdout?.on("data", (d) => {
        out += d
      })
      result.on("close", (code) => resolve(code === 0 ? out.trim() : ""))
    })
  } catch {
    return Promise.resolve("")
  }
}

function pipeLabeled(child, label) {
  const tag = (buf, stream) => {
    const text = buf.toString()
    for (const line of text.split("\n")) {
      if (line.length) stream.write(`[${label}] ${line}\n`)
    }
  }
  child.stdout?.on("data", (d) => tag(d, process.stdout))
  child.stderr?.on("data", (d) => tag(d, process.stderr))
}

const kids = []

function shutdown() {
  for (const child of kids) {
    if (child.pid && !child.killed) {
      try {
        process.kill(child.pid, "SIGTERM")
      } catch {
        /* already gone */
      }
    }
  }
}

process.on("SIGINT", () => {
  shutdown()
  process.exit(0)
})
process.on("SIGTERM", () => {
  shutdown()
  process.exit(0)
})

console.log(`Starting Next.js on http://localhost:${PORT} …`)
const next = spawn("npx", ["next", "dev", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
})
kids.push(next)
pipeLabeled(next, "next")

const cloudflared = await which("cloudflared")
if (!cloudflared) {
  console.log("")
  console.log("cloudflared is not installed — phone HTTPS tunnel skipped.")
  console.log("  Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/")
  console.log(`  Meanwhile open http://localhost:${PORT}/hub on this machine.`)
  console.log("")
  printLogins(`http://localhost:${PORT}`)
} else {
  const tunnel = spawn(cloudflared, ["tunnel", "--url", `http://localhost:${PORT}`], {
    stdio: ["ignore", "pipe", "pipe"],
  })
  kids.push(tunnel)
  let printed = false
  const onChunk = (buf) => {
    const text = buf.toString()
    process.stderr.write(`[tunnel] ${text}`)
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (match && !printed) {
      printed = true
      console.log("")
      console.log(`Safari (phone): ${match[0]}/hub`)
      console.log("Add to Home Screen from the Share sheet after login.")
      printLogins(match[0])
    }
  }
  tunnel.stdout?.on("data", onChunk)
  tunnel.stderr?.on("data", onChunk)
}

function printLogins(origin) {
  console.log("")
  console.log("SIMULATION logins (password ThindDemo1!):")
  console.log("  owner@demo.thind     — Thind office (switcher: Thind / ATS / All)")
  console.log("  dispatch@demo.thind  — dispatcher, locked to Thind")
  console.log("  driver@demo.thind    — driver PWA")
  console.log("  owner@demo.ats       — ATS office")
  console.log(`  Login: ${origin}/hub/login`)
  console.log("")
}

next.on("exit", (code) => {
  shutdown()
  process.exit(code ?? 1)
})
