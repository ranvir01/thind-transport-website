/**
 * Link-preview metadata refresher — compares the curated titles/blurbs in
 * src/lib/hub/link-previews.ts against what each site currently serves and
 * prints a diff-style report of SUGGESTED updates. It never rewrites files:
 * the fixtures are curated copy, and a human decides what lands.
 *
 * Usage:
 *   npm run previews:refresh          (or: node scripts/refresh-link-previews.mjs)
 *
 * Node builtins only (node:https, node:dns/promises, node:net, node:fs) — no
 * dependencies. Offline-safe: unreachable hosts are reported and skipped;
 * exit 0 = report printed, 2 = nothing reachable (no egress here — rerun
 * where the network is real). The URL list is regex-parsed out of
 * link-previews.ts itself (its entry formatting is committed as uniform for
 * exactly this reason), so the script can never drift from the fixtures.
 *
 * SSRF hardening (OWASP): https only; DNS is resolved first and the request
 * is pinned to a validated address (Host/SNI carry the hostname) so a
 * rebinding lookup can't swap targets mid-flight; private, loopback,
 * link-local (incl. 169.254.169.254 metadata), CGNAT, ULA fc00::/7 and
 * fe80::/10 ranges are refused; max 3 redirects, each re-validated the same
 * way; text/html required; 512 KB body cap; 8 s timeout; no cookies sent or
 * stored; User-Agent identifies the bot.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import https from "node:https"
import dns from "node:dns/promises"
import net from "node:net"

const UA = "LoadOffBot/1.0 (+https://thindtransport.com/bot)"
const MAX_REDIRECTS = 3
const MAX_BODY = 512 * 1024
const TIMEOUT_MS = 8000

// ---------------------------------------------------------------------------
// 1. The URL list, parsed from the fixture module (uniform field order:
//    id / title / blurb / domain / url / …).
// ---------------------------------------------------------------------------
const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..", "src", "lib", "hub", "link-previews.ts"
)
const source = readFileSync(fixturePath, "utf8")

const ENTRY_RE =
  /id:\s*"([^"]+)",\s*\n\s*title:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*blurb:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*domain:\s*"[^"]*",\s*\n\s*url:\s*(null|"https:\/\/[^"]+")/g

const entries = []
for (const m of source.matchAll(ENTRY_RE)) {
  entries.push({
    id: m[1],
    title: m[2],
    blurb: m[3],
    url: m[4] === "null" ? null : m[4].slice(1, -1),
  })
}
if (entries.length === 0) {
  console.error(`No fixture entries parsed from ${fixturePath} — did the entry formatting change?`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 2. SSRF guards.
// ---------------------------------------------------------------------------
function isForbiddenAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 0 || a === 10 || a === 127) return true            // this-net, 10/8, loopback
    if (a === 100 && b >= 64 && b <= 127) return true            // 100.64/10 CGNAT
    if (a === 169 && b === 254) return true                      // link-local incl. 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true             // 172.16/12
    if (a === 192 && b === 168) return true                      // 192.168/16
    if (a >= 224) return true                                    // multicast + reserved
    return false
  }
  const x = ip.toLowerCase()
  if (x === "::" || x === "::1") return true                     // unspecified, loopback
  if (x.startsWith("::ffff:")) return isForbiddenAddress(x.slice(7)) // v4-mapped
  if (x.startsWith("fc") || x.startsWith("fd")) return true      // fc00::/7 ULA
  if (/^fe[89ab]/.test(x)) return true                           // fe80::/10 link-local
  return false
}

/** Resolve a hostname; throw unless EVERY address is public. Returns one to pin. */
async function resolvePublicAddress(hostname) {
  if (net.isIP(hostname)) {
    if (isForbiddenAddress(hostname)) throw new Error(`literal address ${hostname} is in a forbidden range`)
    return hostname
  }
  const addrs = await dns.lookup(hostname, { all: true, verbatim: true })
  if (addrs.length === 0) throw new Error(`no A/AAAA records for ${hostname}`)
  for (const { address } of addrs) {
    if (isForbiddenAddress(address)) {
      throw new Error(`${hostname} resolves to forbidden address ${address}`)
    }
  }
  return addrs[0].address
}

// ---------------------------------------------------------------------------
// 3. Pinned, capped, redirect-revalidating fetch.
// ---------------------------------------------------------------------------
function requestOnce(url, address) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: address,                 // connect to the address we validated…
        servername: url.hostname,      // …but verify TLS against the hostname
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Host: url.hostname,
          "User-Agent": UA,
          Accept: "text/html",
          "Accept-Encoding": "identity",
          // No Cookie header, ever — and Set-Cookie responses are ignored.
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          resolve({ redirect: res.headers.location })
          return
        }
        const type = res.headers["content-type"] ?? ""
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        if (!type.includes("text/html")) {
          res.resume()
          reject(new Error(`not text/html (${type.split(";")[0] || "no content-type"})`))
          return
        }
        let size = 0
        const chunks = []
        res.on("data", (chunk) => {
          size += chunk.length
          if (size > MAX_BODY) {
            chunks.push(chunk.subarray(0, chunk.length - (size - MAX_BODY)))
            res.destroy() // body cap reached — parse what we have
            resolve({ body: Buffer.concat(chunks).toString("utf8") })
            return
          }
          chunks.push(chunk)
        })
        res.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8") }))
        res.on("error", reject)
      }
    )
    req.on("timeout", () => req.destroy(new Error(`timeout after ${TIMEOUT_MS}ms`)))
    req.on("error", reject)
    req.end()
  })
}

async function fetchHtml(urlStr) {
  let url = new URL(urlStr)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:") throw new Error(`refusing non-https URL ${url}`)
    const address = await resolvePublicAddress(url.hostname)
    const result = await requestOnce(url, address)
    if (result.redirect !== undefined) {
      if (hop === MAX_REDIRECTS) throw new Error(`more than ${MAX_REDIRECTS} redirects`)
      url = new URL(result.redirect, url) // next loop pass re-validates scheme + DNS
      continue
    }
    return result.body
  }
  throw new Error("unreachable")
}

// ---------------------------------------------------------------------------
// 4. Metadata extraction + diff report.
// ---------------------------------------------------------------------------
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
}

function clean(s) {
  return decodeEntities(s).replace(/\s+/g, " ").trim()
}

function metaContent(html, attr, name) {
  const tag = html.match(new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*>`, "i"))?.[0]
  if (!tag) return null
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1]
  return content ? clean(content) : null
}

function extract(html) {
  const title =
    metaContent(html, "property", "og:title") ??
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)[1]) : null)
  const description =
    metaContent(html, "name", "description") ?? metaContent(html, "property", "og:description")
  return { title, description }
}

const withUrls = entries.filter((e) => e.url !== null)
console.log(`Checking ${withUrls.length} fixture URLs (${entries.length - withUrls.length} entries have no public URL)\n`)

let suggestions = 0
let matches = 0
let unreachable = 0

// Small pool — polite to the hosts, still finishes fast.
const queue = [...withUrls]
async function worker(results) {
  for (let e = queue.shift(); e; e = queue.shift()) {
    try {
      const html = await fetchHtml(e.url)
      results.set(e.id, { entry: e, live: extract(html) })
    } catch (err) {
      results.set(e.id, { entry: e, error: err.message ?? String(err) })
    }
  }
}
const results = new Map()
await Promise.all(Array.from({ length: 6 }, () => worker(results)))

for (const e of withUrls) {
  const r = results.get(e.id)
  if (r.error) {
    unreachable++
    console.log(`?  ${e.id}: unreachable — ${r.error.slice(0, 100)}`)
    continue
  }
  const { title, description } = r.live
  const titleDiffers = title && title !== e.title
  const descDiffers = description && description !== e.blurb
  if (!titleDiffers && !descDiffers) {
    matches++
    console.log(`ok ${e.id}: live metadata matches (or adds nothing beyond) the fixture`)
    continue
  }
  suggestions++
  console.log(`\n@@ ${e.id} (${e.url})`)
  if (titleDiffers) {
    console.log(`-  title: ${JSON.stringify(e.title)}`)
    console.log(`+  title: ${JSON.stringify(title)}`)
  }
  if (descDiffers) {
    console.log(`-  blurb: ${JSON.stringify(e.blurb)}`)
    console.log(`+  blurb: ${JSON.stringify(description)}`)
  }
  console.log("")
}

console.log(
  `\n${suggestions} suggestion(s), ${matches} match(es), ${unreachable} unreachable — ` +
    "review above and edit src/lib/hub/link-previews.ts by hand (this script never writes)."
)
if (unreachable === withUrls.length) {
  console.error("No host was reachable — this environment has no egress; rerun where the network is real.")
  process.exit(2)
}
