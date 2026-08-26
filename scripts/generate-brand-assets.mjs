/**
 * Generates all favicon sizes and the social share (Open Graph) image
 * from the current Thind Transport brand system.
 *
 * Usage: npm run generate:brand-assets
 */
import sharp from "sharp"
import puppeteer from "puppeteer"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public")

// Brand palette (kept in sync with tailwind.config.ts)
const NAVY = "#0E1621"
const NAVY_DEEP = "#0A111B"
const RED = "#E0392F"
const GOLD = "#F2A900"

// ---------------------------------------------------------------------------
// Favicon mark: condensed "T" over forward-leaning road chevrons
// ---------------------------------------------------------------------------
const iconSvg = (rounded = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16222F"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  ${rounded ? `<rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6"/>` : ""}
  <rect x="112" y="112" width="288" height="66" fill="#FFFFFF"/>
  <rect x="221" y="112" width="70" height="240" fill="#FFFFFF"/>
  <path d="M132 398 h86 l-20 42 h-86 z" fill="${RED}"/>
  <path d="M248 398 h86 l-20 42 h-86 z" fill="${RED}" opacity="0.72"/>
  <path d="M364 398 h56 l-20 42 h-56 z" fill="${RED}" opacity="0.45"/>
</svg>`

async function generateFavicons() {
  const rounded = Buffer.from(iconSvg(true))
  const square = Buffer.from(iconSvg(false))

  const targets = [
    { file: "favicon-16x16.png", size: 16, src: rounded },
    { file: "favicon-32x32.png", size: 32, src: rounded },
    { file: "apple-touch-icon.png", size: 180, src: square }, // iOS applies its own mask
    { file: "android-chrome-192x192.png", size: 192, src: square }, // maskable
    { file: "android-chrome-512x512.png", size: 512, src: square }, // maskable
  ]

  for (const { file, size, src } of targets) {
    await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(join(publicDir, file))
    console.log(`✓ ${file}`)
  }

  // favicon.ico — single 32px PNG-encoded entry (valid for all modern browsers)
  const png32 = await sharp(rounded).resize(32, 32).png({ compressionLevel: 9 }).toBuffer()
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // image count
  const entry = Buffer.alloc(16)
  entry.writeUInt8(32, 0) // width
  entry.writeUInt8(32, 1) // height
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png32.length, 8) // data size
  entry.writeUInt32LE(22, 12) // data offset
  writeFileSync(join(publicDir, "favicon.ico"), Buffer.concat([header, entry, png32]))
  console.log("✓ favicon.ico")
}

// ---------------------------------------------------------------------------
// Open Graph image (1200x630)
// ---------------------------------------------------------------------------
const ogHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&display=block" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; }
  .card {
    position: relative; width: 1200px; height: 630px;
    background:
      radial-gradient(900px 500px at 88% -10%, rgba(224,57,47,0.16), transparent 60%),
      radial-gradient(700px 420px at -5% 110%, rgba(242,169,0,0.08), transparent 55%),
      linear-gradient(160deg, #15202E 0%, ${NAVY} 55%, ${NAVY_DEEP} 100%);
    font-family: 'Source Sans 3', sans-serif; color: #fff;
    padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between;
  }
  .stripes {
    position: absolute; inset: 0; opacity: 0.05; pointer-events: none;
    background: repeating-linear-gradient(-45deg, transparent 0 26px, #fff 26px 28px);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 10px;
    border: 1px solid rgba(224,57,47,0.55); border-radius: 999px;
    padding: 10px 22px; font-family: 'Barlow Condensed'; font-weight: 600;
    font-size: 24px; letter-spacing: 0.14em; text-transform: uppercase; color: #F8857C;
    background: rgba(224,57,47,0.10); width: fit-content;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: ${RED}; }
  h1 {
    font-family: 'Barlow Condensed'; font-weight: 800; text-transform: uppercase;
    font-size: 124px; line-height: 0.98; letter-spacing: 0.01em; margin-top: 30px;
  }
  h1 .accent { color: ${RED}; }
  .sub { font-size: 31px; color: #CDD5DF; margin-top: 26px; max-width: 980px; line-height: 1.45; }
  .sub .gold { color: ${GOLD}; font-weight: 700; }
  .bottom { display: flex; align-items: flex-end; justify-content: space-between; }
  .wordmark { font-family: 'Barlow Condensed'; font-weight: 700; font-size: 40px; letter-spacing: 0.16em; }
  .wordmark span { color: #828C98; font-weight: 600; }
  .meta { text-align: right; font-size: 22px; color: #A7B0BD; line-height: 1.5; }
  .meta b { color: #fff; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
    background: linear-gradient(90deg, ${RED} 0 70%, ${GOLD} 70% 100%); }
</style>
</head>
<body>
  <div class="card">
    <div class="stripes"></div>
    <div>
      <div class="badge"><span class="dot"></span> Family-run since 2014 · Kent, WA</div>
      <h1>Keep <span class="accent">90%</span> of<br>your gross.</h1>
      <div class="sub">Company drivers <span class="gold">$0.63/mi</span> · New Cascadias · Weekly pay · Zero forced dispatch</div>
    </div>
    <div class="bottom">
      <div class="wordmark">THIND <span>TRANSPORT</span></div>
      <div class="meta"><b>thindtransport.com</b><br>USDOT 2523064 · MC 876103</div>
    </div>
    <div class="bar"></div>
  </div>
</body>
</html>`

async function generateOgImage() {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.setContent(ogHtml, { waitUntil: "networkidle0" })
  await page.evaluateHandle("document.fonts.ready")
  const buffer = await page.screenshot({ type: "png" })
  await browser.close()
  await sharp(buffer).png({ compressionLevel: 9, palette: true }).toFile(join(publicDir, "og-image.png"))
  console.log("✓ og-image.png")
}

await generateFavicons()
await generateOgImage()
console.log("All brand assets generated.")
