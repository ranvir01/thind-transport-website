/**
 * Pages 14-19: Previous Employer Inquiry Forms
 * DOT-required forms for verifying employment history (3 years)
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawText,
  drawCheckbox,
  drawInstructions,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  FONT_LABEL,
  FONT_SMALL,
  FONT_TINY,
  GRAY,
  BLACK,
  FIELD_BG,
  NAVY,
  WHITE,
} from '../utils'

function buildEmployerInquiryForm(ctx: PDFContext, employerNum: number): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, `PREVIOUS EMPLOYER INQUIRY - EMPLOYER #${employerNum}`)
  
  y -= 5
  y = drawSectionHeader(page, ctx, "REQUEST FOR INFORMATION FROM PREVIOUS EMPLOYER (49 CFR 391.23)", y)
  
  const introText = `This inquiry is being made in accordance with Section 391.23 of the Federal Motor Carrier Safety Regulations. Please complete this form and return it within 30 days.`
  
  y -= 5
  y = drawInstructions(page, ctx, introText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // To/From section
  y -= 15
  drawText(page, ctx, "TO (Previous Employer):", MARGIN_LEFT, y, { bold: true })
  
  y -= 18
  drawText(page, ctx, "Company:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const companyField = ctx.form.createTextField(`inq${employerNum}_company`)
  companyField.addToPage(page, { x: 110, y: y - 4, width: 400, height: 16, backgroundColor: FIELD_BG })
  companyField.setFontSize(10)
  
  y -= 20
  drawText(page, ctx, "Address:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const addrField = ctx.form.createTextField(`inq${employerNum}_address`)
  addrField.addToPage(page, { x: 100, y: y - 4, width: 410, height: 16, backgroundColor: FIELD_BG })
  addrField.setFontSize(10)
  
  y -= 20
  drawText(page, ctx, "City, State, ZIP:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const cityField = ctx.form.createTextField(`inq${employerNum}_city`)
  cityField.addToPage(page, { x: 130, y: y - 4, width: 250, height: 16, backgroundColor: FIELD_BG })
  cityField.setFontSize(10)
  
  drawText(page, ctx, "Phone:", 400, y, { size: FONT_SMALL, color: GRAY })
  const phoneField = ctx.form.createTextField(`inq${employerNum}_phone`)
  phoneField.addToPage(page, { x: 440, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  phoneField.setFontSize(10)
  
  y -= 20
  drawText(page, ctx, "Fax:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const faxField = ctx.form.createTextField(`inq${employerNum}_fax`)
  faxField.addToPage(page, { x: 80, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  faxField.setFontSize(10)
  
  drawText(page, ctx, "Email:", 220, y, { size: FONT_SMALL, color: GRAY })
  const emailField = ctx.form.createTextField(`inq${employerNum}_email`)
  emailField.addToPage(page, { x: 260, y: y - 4, width: 250, height: 16, backgroundColor: FIELD_BG })
  emailField.setFontSize(10)
  
  // Applicant info
  y -= 30
  y = drawSectionHeader(page, ctx, "APPLICANT INFORMATION", y)
  
  y -= 10
  drawText(page, ctx, "Name:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const nameField = ctx.form.createTextField(`inq${employerNum}_applicant_name`)
  nameField.addToPage(page, { x: 90, y: y - 4, width: 200, height: 16, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "SSN (last 4):", 310, y, { size: FONT_SMALL, color: GRAY })
  const ssnField = ctx.form.createTextField(`inq${employerNum}_ssn4`)
  ssnField.addToPage(page, { x: 380, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  ssnField.setFontSize(10)
  
  drawText(page, ctx, "DOB:", 460, y, { size: FONT_SMALL, color: GRAY })
  const dobField = ctx.form.createTextField(`inq${employerNum}_dob`)
  dobField.addToPage(page, { x: 490, y: y - 4, width: 70, height: 16, backgroundColor: FIELD_BG })
  dobField.setFontSize(10)
  
  // Response section
  y -= 30
  y = drawSectionHeader(page, ctx, "RESPONSE FROM PREVIOUS EMPLOYER (Please Complete Below)", y)
  
  y -= 10
  drawText(page, ctx, "Dates of Employment:", MARGIN_LEFT, y)
  drawText(page, ctx, "From:", 160, y, { size: FONT_SMALL, color: GRAY })
  const empFromField = ctx.form.createTextField(`inq${employerNum}_emp_from`)
  empFromField.addToPage(page, { x: 190, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  empFromField.setFontSize(10)
  
  drawText(page, ctx, "To:", 290, y, { size: FONT_SMALL, color: GRAY })
  const empToField = ctx.form.createTextField(`inq${employerNum}_emp_to`)
  empToField.addToPage(page, { x: 310, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  empToField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Position Held:", MARGIN_LEFT, y)
  const posField = ctx.form.createTextField(`inq${employerNum}_position`)
  posField.addToPage(page, { x: 130, y: y - 4, width: 200, height: 16, backgroundColor: FIELD_BG })
  posField.setFontSize(10)
  
  drawText(page, ctx, "Reason for Leaving:", 350, y)
  const reasonField = ctx.form.createTextField(`inq${employerNum}_reason`)
  reasonField.addToPage(page, { x: 460, y: y - 4, width: 100, height: 16, backgroundColor: FIELD_BG })
  reasonField.setFontSize(10)
  
  // DOT Questions
  y -= 30
  drawText(page, ctx, "1. Was this person subject to FMCSR (49 CFR Part 391)?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `inq${employerNum}_fmcsr_yes`, "Yes", 350, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_fmcsr_no`, "No", 400, y - 2)
  
  y -= 20
  drawText(page, ctx, "2. Was this person subject to DOT drug/alcohol testing (49 CFR Part 40)?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `inq${employerNum}_drug_yes`, "Yes", 380, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_drug_no`, "No", 430, y - 2)
  
  y -= 20
  drawText(page, ctx, "3. Did this person have any DOT drug/alcohol violations?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `inq${employerNum}_violation_yes`, "Yes", 330, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_violation_no`, "No", 380, y - 2)
  
  y -= 20
  drawText(page, ctx, "If YES to #3, did the person complete a return-to-duty process?", MARGIN_LEFT + 20, y, { size: FONT_SMALL, color: GRAY })
  drawCheckbox(page, ctx, `inq${employerNum}_rtd_yes`, "Yes", 340, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_rtd_no`, "No", 390, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_rtd_na`, "N/A", 440, y - 2)
  
  y -= 25
  drawText(page, ctx, "4. Any accidents while employed here?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `inq${employerNum}_acc_yes`, "Yes", 250, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_acc_no`, "No", 300, y - 2)
  
  y -= 20
  drawText(page, ctx, "If YES, describe:", MARGIN_LEFT + 20, y, { size: FONT_SMALL, color: GRAY })
  const accDescField = ctx.form.createTextField(`inq${employerNum}_acc_desc`)
  accDescField.addToPage(page, { x: 130, y: y - 4, width: 380, height: 16, backgroundColor: FIELD_BG })
  accDescField.setFontSize(9)
  
  y -= 25
  drawText(page, ctx, "5. Would you rehire this person?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `inq${employerNum}_rehire_yes`, "Yes", 210, y - 2)
  drawCheckbox(page, ctx, `inq${employerNum}_rehire_no`, "No", 260, y - 2)
  
  y -= 20
  drawText(page, ctx, "If NO, why?", MARGIN_LEFT + 20, y, { size: FONT_SMALL, color: GRAY })
  const noRehireField = ctx.form.createTextField(`inq${employerNum}_norehire_reason`)
  noRehireField.addToPage(page, { x: 100, y: y - 4, width: 410, height: 16, backgroundColor: FIELD_BG })
  noRehireField.setFontSize(9)
  
  // Signature
  y -= 35
  drawText(page, ctx, "Completed By:", MARGIN_LEFT, y)
  const respNameField = ctx.form.createTextField(`inq${employerNum}_resp_name`)
  respNameField.addToPage(page, { x: 130, y: y - 4, width: 180, height: 16, backgroundColor: FIELD_BG })
  respNameField.setFontSize(10)
  
  drawText(page, ctx, "Title:", 330, y)
  const titleField = ctx.form.createTextField(`inq${employerNum}_resp_title`)
  titleField.addToPage(page, { x: 360, y: y - 4, width: 150, height: 16, backgroundColor: FIELD_BG })
  titleField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Phone:", MARGIN_LEFT, y)
  const respPhoneField = ctx.form.createTextField(`inq${employerNum}_resp_phone`)
  respPhoneField.addToPage(page, { x: 95, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  respPhoneField.setFontSize(10)
  
  drawText(page, ctx, "Date:", 240, y)
  const respDateField = ctx.form.createTextField(`inq${employerNum}_resp_date`)
  respDateField.addToPage(page, { x: 275, y: y - 4, width: 90, height: 16, backgroundColor: FIELD_BG })
  respDateField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 115, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  
  // Footer
  y -= 30
  drawText(page, ctx, "Please return this form to: Thind Transport LLC • Fax: [Company Fax] • Email: hr@thindtransport.com", MARGIN_LEFT, y, { size: FONT_TINY, color: GRAY })
  
  return page
}

export function buildEmployerInquiryPages(ctx: PDFContext): PDFPage[] {
  const pages: PDFPage[] = []
  
  // Generate 6 employer inquiry forms (for 3 years of employment history, typically 2-6 employers)
  for (let i = 1; i <= 6; i++) {
    pages.push(buildEmployerInquiryForm(ctx, i))
  }
  
  return pages
}

