#!/usr/bin/env node
/**
 * Same-Wi-Fi development server for quick UI checks.
 * This is intentionally HTTP; use npm run dev:mobile for iPhone camera/PWA.
 */
import { spawn } from "node:child_process"
import { networkInterfaces } from "node:os"

const PORT = process.env.PORT || "3000"

function lanAddresses() {
  const addresses = []
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address)
    }
  }
  return addresses
}

const addresses = lanAddresses()

console.log("\n🚚 HaulDesk same-Wi-Fi dev server\n")
console.log("Use this for quick UI-only checks from a phone on the same Wi-Fi.")
console.log("iOS camera, service worker, push, and Add to Home Screen require HTTPS:")
console.log("  npm run dev:mobile\n")
if (addresses.length === 0) {
  console.log("No LAN IPv4 address detected yet; Next.js will still listen on 0.0.0.0.")
} else {
  console.log("Open one of these on your phone:")
  for (const address of addresses) console.log(`  http://${address}:${PORT}`)
}
console.log("")

const child = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", PORT], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "local-lan-dev-secret-change-me",
    AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "local-lan-dev-secret-change-me",
  },
})

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
