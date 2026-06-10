/**
 * End-to-end portal test (temporary, not committed):
 * 1. Public apply form → stored in data/public-applications.json + email in maildev
 * 2. Register WITHOUT invitation code using the applied email
 * 3. Login → dashboard shows "Application Not Started"
 * 4. Inject complete DOT form data, generate PDF, submit
 * 5. Verify: HR email + driver confirmation in maildev, DB records, dashboard shows submitted
 */
import puppeteer from 'puppeteer'
import { readFileSync, existsSync } from 'fs'

const BASE = 'http://localhost:3000'
const EMAIL = `e2e.driver.${Date.now()}@example.com`
const PASSWORD = 'TestDriver123!'
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const maildev = async () => (await fetch('http://localhost:1080/email')).json()
const clearMaildev = () => fetch('http://localhost:1080/email/all', { method: 'DELETE' })

await clearMaildev()

const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

// ---------- 1. PUBLIC APPLY FORM ----------
await page.goto(`${BASE}/apply`, { waitUntil: 'networkidle2' })
await page.evaluate(() => {
  document.querySelector('#application-form')?.scrollIntoView()
  window.scrollBy(0, -100)
})
await new Promise(r => setTimeout(r, 800))

// Step 1: defaults are fine, pick CDL class + experience
const clickByText = async (text, tag = 'label') => {
  await page.evaluate((t, tg) => {
    const els = [...document.querySelectorAll(tg)]
    const el = els.find(e => e.textContent.trim().includes(t))
    if (el) el.click()
    else throw new Error('not found: ' + t)
  }, text, tag)
}
await clickByText('Class A')
await clickByText('3-5 Years')
await clickByText('CHECK MY ELIGIBILITY', 'button')
await new Promise(r => setTimeout(r, 800))

// Step 2: contact info
await page.type('#firstName', 'Etoe')
await page.type('#lastName', 'Driver')
await page.type('#email', EMAIL)
await page.type('#phone', '2065559876')
await clickByText('CONTINUE', 'button')
await new Promise(r => setTimeout(r, 1500))

// Step 3: details
await page.type('#cdlNumber', 'WDL7654321')
await clickByText('CONTINUE', 'button')
await new Promise(r => setTimeout(r, 800))

// Step 4: submit without docs
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('SUBMIT'))
  btn?.scrollIntoView({ block: 'center' })
})
await new Promise(r => setTimeout(r, 300))
await clickByText('SUBMIT & GET MY OFFER', 'button')
await new Promise(r => setTimeout(r, 3000))

const successVisible = await page.evaluate(() =>
  document.body.textContent.includes('Thank You for Submitting Your Info'))
check('Public apply form submitted (success screen shown)', successVisible)

const portalCta = await page.evaluate(() =>
  document.body.textContent.includes('create your driver portal account'))
check('Success screen shows portal account CTA', portalCta)

// Persistence check
const pubFile = 'data/public-applications.json'
const persisted = existsSync(pubFile) && JSON.parse(readFileSync(pubFile, 'utf8')).some(r => r.email === EMAIL.toLowerCase())
check('Public application persisted to DB store', persisted)

// Email check (lead capture from step 2 + full application)
let emails = await maildev()
const applyEmail = emails.find(e => (e.subject || '').includes('Application'))
check('Application email delivered to company inbox', Boolean(applyEmail), applyEmail?.subject)

// ---------- 2. REGISTER WITHOUT INVITATION CODE ----------
const regRes = await fetch(`${BASE}/api/driver/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName: 'Etoe', lastName: 'Driver', email: EMAIL, phone: '(206) 555-9876', password: PASSWORD }),
})
const regBody = await regRes.json()
check('Registered portal account with NO invitation code (applied email)', regRes.ok && regBody.success, JSON.stringify(regBody).slice(0, 120))

// Negative: registering a random email without code must fail
const regBad = await fetch(`${BASE}/api/driver/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName: 'No', lastName: 'Apply', email: `nobody.${Date.now()}@example.com`, phone: '(206) 555-0000', password: PASSWORD }),
})
check('Registration rejected for email with no application and no code', regBad.status === 400)

// ---------- 3. LOGIN → DASHBOARD ----------
await page.goto(`${BASE}/driver/login`, { waitUntil: 'networkidle2' })
await page.type('#email', EMAIL)
await page.type('#password', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
await new Promise(r => setTimeout(r, 2000))
const onDashboard = page.url().includes('/driver/dashboard')
check('Login redirects to dashboard', onDashboard, page.url())

const notStarted = await page.evaluate(() => document.body.textContent.includes('Application Not Started'))
check('Dashboard shows "Application Not Started" before DOT submission', notStarted)
await page.screenshot({ path: '/tmp/audit/portal-dashboard-before.png' })

// ---------- 4. DOT APPLICATION WIZARD ----------
// Inject complete, valid form data then load the wizard on the review step
const completeForm = {
  app_date: new Date().toLocaleDateString(),
  currentStep: 9,
  personal: {
    applicant_name: 'Etoe Driver', phone: '(206) 555-9876', emergency_phone: '(425) 555-1111',
    dob: '1988-04-12', age: '38', ssn: '123-45-6789', email: EMAIL,
    physical_exam_exp: '2027-04-12', pos_company_driver: true, legal_work_yes: true, age_21_yes: true, english_yes: true,
  },
  address: { addr1_street: '123 Test Ave, Kent, WA 98031', addr1_from: '2019-01', addr1_to: 'Present' },
  education: { edu_grade_12: true },
  employment: { employers: [{ from: '2019-02', to: 'Present', name: 'Acme Freight LLC', address: '500 Cargo Way, Seattle, WA', phone: '(206) 555-2222', position: 'CDL-A Driver', salary: '$72,000', supervisor: 'Jane Boss', reason: 'Seeking better pay', fmcsr_yes: true, drug_yes: true }] },
  accidents: { accidents: [], no_accidents: true },
  traffic: { violations: [], no_violations: true },
  cdl: { licenses: [{ state: 'WA', number: 'WDL7654321', class: 'A', endorsements: 'None', restrictions: 'None', exp: '2028-06-30' }] },
  experience: { states_operated: 'WA, OR, ID, CA' },
  training: { training: [] },
  certification: { e_signature_consent: true, main_signature: 'Etoe Driver', signature_date: new Date().toLocaleDateString() },
  completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
  lastSaved: new Date().toISOString(),
}
await page.evaluate((data) => {
  localStorage.setItem('thind_driver_application_v2', JSON.stringify(data))
}, completeForm)

await page.goto(`${BASE}/driver/application`, { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 2500))

const onReview = await page.evaluate(() => document.body.textContent.includes('Review') && document.body.textContent.includes('Generate'))
check('Wizard restored saved data onto review step', onReview)
await page.screenshot({ path: '/tmp/audit/portal-wizard-review.png' })

// Generate the PDF
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Generate Application PDF'))
  btn?.click()
})
await new Promise(r => setTimeout(r, 8000)) // PDF builds ~25 pages client-side
const pdfReady = await page.evaluate(() => document.body.textContent.includes('PDF generated') || [...document.querySelectorAll('button')].some(b => b.textContent.includes('Submit')))
check('DOT PDF generated client-side', pdfReady)

// Open review modal and complete the checklist
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes('Review') && b.textContent.includes('Submit'))
  btn?.click()
})
await new Promise(r => setTimeout(r, 1200))
await page.screenshot({ path: '/tmp/audit/portal-review-modal.png' })

// Check all checklist checkboxes inside the modal
const checked = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('[role="checkbox"], input[type="checkbox"]')]
  boxes.forEach(b => { if (b.getAttribute('aria-checked') !== 'true' && !b.checked) b.click() })
  return boxes.length
})
check('Review checklist completed', checked >= 8, `${checked} checkboxes`)
await new Promise(r => setTimeout(r, 600))

// Final submit
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const btn = btns.reverse().find(b => /submit application/i.test(b.textContent))
  btn?.click()
})
await new Promise(r => setTimeout(r, 9000))

const submitted = await page.evaluate(() => document.body.textContent.includes('Application Submitted'))
check('Wizard shows submission success screen', submitted)
await page.screenshot({ path: '/tmp/audit/portal-wizard-submitted.png' })

// ---------- 5. VERIFY EMAILS + DB + DASHBOARD ----------
emails = await maildev()
const hrEmail = emails.find(e => (e.subject || '').includes('New Driver Application'))
const confirmEmail = emails.find(e => (e.subject || '').includes('Application Received'))
check('HR received DOT application email with PDF attachment', Boolean(hrEmail?.attachments?.length), hrEmail?.attachments?.[0]?.fileName)
check('Driver received confirmation email', Boolean(confirmEmail), confirmEmail?.to?.[0]?.address)

const appsFile = 'data/applications.json'
const appRecord = existsSync(appsFile) && JSON.parse(readFileSync(appsFile, 'utf8')).find(a => a.data?.personal?.email === EMAIL)
check('Application record stored in DB with form data + status', Boolean(appRecord) && appRecord.status === 'submitted', appRecord?.id)

const drivers = JSON.parse(readFileSync('data/drivers.json', 'utf8'))
const driverRec = drivers.find(d => d.email === EMAIL.toLowerCase())
check('Driver marked applicationCompleted in DB', Boolean(driverRec?.applicationCompleted))

// Dashboard now shows submitted status
await page.goto(`${BASE}/driver/dashboard`, { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 2000))
const showsSubmitted = await page.evaluate(() => document.body.textContent.includes('Submitted — In Review Queue'))
const showsRef = await page.evaluate(() => document.body.textContent.includes('Reference:'))
check('Dashboard shows submitted status + reference', showsSubmitted && showsRef)
await page.screenshot({ path: '/tmp/audit/portal-dashboard-after.png' })

// Unauthenticated upload must be rejected
const anonUpload = await fetch(`${BASE}/api/driver/upload-application`, { method: 'POST', body: new FormData() })
check('Unauthenticated PDF upload rejected (401)', anonUpload.status === 401)

await browser.close()

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) { console.log('FAILED:', failed.map(f => f.name)); process.exit(1) }
