/* Visual-QA slice screenshotter: viewport-height slices down each page at 390px and 1440px. */
import puppeteer from "puppeteer"
import fs from "node:fs"

const OUT = process.env.OUT_DIR || "/tmp/slices"
const PAGES = (process.env.PAGES || "/,/shippers,/cdl-jobs,/cdl-jobs/washington,/apply").split(",")
const WIDTHS = [390, 1440]
const HEIGHTS = { 390: 844, 1440: 900 }

fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  headless: "new",
  args: ["--no-sandbox"],
})

for (const path of PAGES) {
  const slug = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-")
  for (const width of WIDTHS) {
    const page = await browser.newPage()
    await page.setViewport({ width, height: HEIGHTS[width], deviceScaleFactor: 1 })
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle0", timeout: 60000 })
    await page.addStyleTag({ content: "html, body { scroll-behavior: auto !important; }" })
    // Scroll to the bottom first to fire lazy loads / reveal-on-scroll, then back to top.
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let y = 0
        const step = () => {
          y += window.innerHeight
          window.scrollTo(0, y)
          if (y < document.body.scrollHeight) setTimeout(step, 120)
          else resolve()
        }
        step()
      })
    })
    await new Promise((r) => setTimeout(r, 800))
    const total = await page.evaluate(() => document.body.scrollHeight)
    const vh = HEIGHTS[width]
    const slices = Math.ceil(total / vh)
    for (let i = 0; i < slices; i++) {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), i * vh)
      await new Promise((r) => setTimeout(r, 400))
      const actual = await page.evaluate(() => window.scrollY)
      if (Math.abs(actual - i * vh) > 4 && i * vh < total - vh) console.warn(`  drift ${slug}@${width} s${i}: wanted ${i * vh} got ${actual}`)
      await page.screenshot({ path: `${OUT}/${slug}-${width}-s${String(i).padStart(2, "0")}.png` })
    }
    console.log(`${slug} @${width}px: ${slices} slices (height ${total}px)`)
    await page.close()
  }
}
await browser.close()
