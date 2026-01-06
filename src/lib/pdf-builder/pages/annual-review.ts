/**
 * Pages 20-21: Annual Review of Driving Record
 * DOT-required annual MVR review and certification
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

// Page 20: Annual Review Form
function buildAnnualReviewForm(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "ANNUAL REVIEW OF DRIVING RECORD")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "DRIVER INFORMATION - 49 CFR 391.25", y)
  
  // Driver info
  y -= 10
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("annual_driver_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Review Date:", 410, y)
  const dateField = ctx.form.createTextField("annual_review_date")
  dateField.addToPage(page, { x: 490, y: y - 4, width: 70, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "SSN (last 4):", MARGIN_LEFT, y)
  const ssnField = ctx.form.createTextField("annual_ssn4")
  ssnField.addToPage(page, { x: 115, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  ssnField.setFontSize(10)
  
  drawText(page, ctx, "CDL Number:", 200, y)
  const cdlField = ctx.form.createTextField("annual_cdl")
  cdlField.addToPage(page, { x: 280, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  cdlField.setFontSize(10)
  
  drawText(page, ctx, "State:", 420, y)
  const stateField = ctx.form.createTextField("annual_cdl_state")
  stateField.addToPage(page, { x: 455, y: y - 4, width: 50, height: 16, backgroundColor: FIELD_BG })
  stateField.setFontSize(10)
  
  // MVR Review Section
  y -= 35
  y = drawSectionHeader(page, ctx, "MOTOR VEHICLE RECORD (MVR) REVIEW", y)
  
  y -= 10
  drawText(page, ctx, "MVR was obtained from which state(s):", MARGIN_LEFT, y, { size: FONT_SMALL })
  const mvrStatesField = ctx.form.createTextField("annual_mvr_states")
  mvrStatesField.addToPage(page, { x: 240, y: y - 4, width: 270, height: 16, backgroundColor: FIELD_BG })
  mvrStatesField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Date MVR obtained:", MARGIN_LEFT, y, { size: FONT_SMALL })
  const mvrDateField = ctx.form.createTextField("annual_mvr_date")
  mvrDateField.addToPage(page, { x: 145, y: y - 4, width: 90, height: 16, backgroundColor: FIELD_BG })
  mvrDateField.setFontSize(10)
  
  // Violations found
  y -= 30
  drawText(page, ctx, "Violations found on MVR:", MARGIN_LEFT, y, { bold: true })
  drawCheckbox(page, ctx, "annual_viol_none", "None", 200, y - 2)
  drawCheckbox(page, ctx, "annual_viol_found", "Yes (list below)", 270, y - 2)
  
  y -= 5
  const violTable = [
    { text: "Date", width: 80 },
    { text: "Violation", width: 200 },
    { text: "Location", width: 120 },
    { text: "Points", width: 50 },
  ]
  
  // Table header
  y -= 20
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 14,
    width: CONTENT_WIDTH,
    height: 16,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  violTable.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 10,
      size: FONT_SMALL,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // Violation rows (4)
  for (let i = 1; i <= 4; i++) {
    y -= 20
    x = MARGIN_LEFT
    
    const vDateField = ctx.form.createTextField(`annual_viol${i}_date`)
    vDateField.addToPage(page, { x: x, y: y - 2, width: 78, height: 14, backgroundColor: FIELD_BG })
    vDateField.setFontSize(9)
    x += 80
    
    const vDescField = ctx.form.createTextField(`annual_viol${i}_desc`)
    vDescField.addToPage(page, { x: x, y: y - 2, width: 198, height: 14, backgroundColor: FIELD_BG })
    vDescField.setFontSize(9)
    x += 200
    
    const vLocField = ctx.form.createTextField(`annual_viol${i}_loc`)
    vLocField.addToPage(page, { x: x, y: y - 2, width: 118, height: 14, backgroundColor: FIELD_BG })
    vLocField.setFontSize(9)
    x += 120
    
    const vPtsField = ctx.form.createTextField(`annual_viol${i}_pts`)
    vPtsField.addToPage(page, { x: x, y: y - 2, width: 48, height: 14, backgroundColor: FIELD_BG })
    vPtsField.setFontSize(9)
  }
  
  // Certification
  y -= 35
  y = drawSectionHeader(page, ctx, "REVIEWER CERTIFICATION", y)
  
  y -= 10
  const certText = `I certify that I have reviewed the motor vehicle record for the above-named driver in accordance with 49 CFR 391.25. Based on this review, I have determined that:`
  y = drawInstructions(page, ctx, certText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  y -= 15
  drawCheckbox(page, ctx, "annual_qualified", "The driver meets the minimum requirements and IS QUALIFIED to operate a commercial motor vehicle.", MARGIN_LEFT, y)
  
  y -= 22
  drawCheckbox(page, ctx, "annual_not_qualified", "The driver does NOT meet minimum requirements and is NOT QUALIFIED to operate a CMV.", MARGIN_LEFT, y)
  
  y -= 22
  drawCheckbox(page, ctx, "annual_conditional", "The driver is CONDITIONALLY QUALIFIED (explain below).", MARGIN_LEFT, y)
  
  y -= 20
  drawText(page, ctx, "Comments/Explanation:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const commentsField = ctx.form.createTextField("annual_comments")
  commentsField.enableMultiline()
  commentsField.addToPage(page, { x: MARGIN_LEFT, y: y - 45, width: CONTENT_WIDTH, height: 45, backgroundColor: FIELD_BG })
  commentsField.setFontSize(9)
  
  // Signatures
  y -= 70
  drawText(page, ctx, "Reviewer Name:", MARGIN_LEFT, y)
  const revNameField = ctx.form.createTextField("annual_reviewer_name")
  revNameField.addToPage(page, { x: 135, y: y - 4, width: 180, height: 16, backgroundColor: FIELD_BG })
  revNameField.setFontSize(10)
  
  drawText(page, ctx, "Title:", 340, y)
  const revTitleField = ctx.form.createTextField("annual_reviewer_title")
  revTitleField.addToPage(page, { x: 370, y: y - 4, width: 140, height: 16, backgroundColor: FIELD_BG })
  revTitleField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 115, y: y - 2 },
    end: { x: 350, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  
  drawText(page, ctx, "Date:", 370, y)
  const revDateField = ctx.form.createTextField("annual_reviewer_date")
  revDateField.addToPage(page, { x: 400, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  revDateField.setFontSize(10)
  
  return page
}

// Page 21: Annual Driver Certification
function buildDriverCertificationForm(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "ANNUAL DRIVER'S CERTIFICATION OF VIOLATIONS")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "DRIVER CERTIFICATION - 49 CFR 391.27", y)
  
  const introText = `Each motor carrier shall, at least once every 12 months, require each driver it employs to prepare and furnish it with a list of all violations of motor vehicle traffic laws and ordinances (other than violations involving only parking) of which the driver has been convicted or forfeited bond or collateral during the preceding 12 months.`
  
  y -= 5
  y = drawInstructions(page, ctx, introText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Driver info
  y -= 20
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("cert_driver_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Date:", 410, y)
  const dateField = ctx.form.createTextField("cert_date")
  dateField.addToPage(page, { x: 445, y: y - 4, width: 115, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Social Security Number:", MARGIN_LEFT, y)
  const ssnField = ctx.form.createTextField("cert_ssn")
  ssnField.addToPage(page, { x: 175, y: y - 4, width: 130, height: 16, backgroundColor: FIELD_BG })
  ssnField.setFontSize(10)
  
  drawText(page, ctx, "Certification Period:", 340, y, { size: FONT_SMALL, color: GRAY })
  const periodFromField = ctx.form.createTextField("cert_period_from")
  periodFromField.addToPage(page, { x: 445, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  periodFromField.setFontSize(9)
  
  drawText(page, ctx, "to", 510, y, { size: FONT_SMALL })
  const periodToField = ctx.form.createTextField("cert_period_to")
  periodToField.addToPage(page, { x: 525, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  periodToField.setFontSize(9)
  
  // Violations section
  y -= 35
  y = drawSectionHeader(page, ctx, "TRAFFIC VIOLATIONS (Past 12 Months)", y)
  
  y -= 10
  drawCheckbox(page, ctx, "cert_no_violations", "I certify that I have had NO violations during the above period.", MARGIN_LEFT, y)
  
  y -= 20
  drawCheckbox(page, ctx, "cert_has_violations", "I have had the following violation(s):", MARGIN_LEFT, y)
  
  // Violations table
  y -= 5
  const violTable = [
    { text: "Date", width: 70 },
    { text: "Offense/Violation", width: 200 },
    { text: "Location (City, State)", width: 140 },
    { text: "Vehicle Type", width: 70 },
  ]
  
  y -= 20
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 14,
    width: CONTENT_WIDTH,
    height: 16,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  violTable.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 10,
      size: FONT_SMALL,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // Violation rows (6)
  for (let i = 1; i <= 6; i++) {
    y -= 20
    x = MARGIN_LEFT
    
    const vDateField = ctx.form.createTextField(`cert_viol${i}_date`)
    vDateField.addToPage(page, { x: x, y: y - 2, width: 68, height: 14, backgroundColor: FIELD_BG })
    vDateField.setFontSize(9)
    x += 70
    
    const vDescField = ctx.form.createTextField(`cert_viol${i}_desc`)
    vDescField.addToPage(page, { x: x, y: y - 2, width: 198, height: 14, backgroundColor: FIELD_BG })
    vDescField.setFontSize(9)
    x += 200
    
    const vLocField = ctx.form.createTextField(`cert_viol${i}_loc`)
    vLocField.addToPage(page, { x: x, y: y - 2, width: 138, height: 14, backgroundColor: FIELD_BG })
    vLocField.setFontSize(9)
    x += 140
    
    const vTypeField = ctx.form.createTextField(`cert_viol${i}_type`)
    vTypeField.addToPage(page, { x: x, y: y - 2, width: 68, height: 14, backgroundColor: FIELD_BG })
    vTypeField.setFontSize(9)
  }
  
  // Certification
  y -= 35
  y = drawSectionHeader(page, ctx, "DRIVER CERTIFICATION", y)
  
  const certStatement = `I certify that the above information is true and complete. I understand that providing false information may result in immediate termination and may be a violation of federal regulations.`
  
  y -= 10
  y = drawInstructions(page, ctx, certStatement, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  y -= 20
  drawText(page, ctx, "Driver Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 130, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("cert_driver_signature")
  sigField.addToPage(page, { x: 130, y: y - 2, width: 250, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 400, y)
  const signDateField = ctx.form.createTextField("cert_sign_date")
  signDateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  signDateField.setFontSize(10)
  
  // Company acknowledgment
  y -= 50
  drawText(page, ctx, "Received By (Company Representative):", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  page.drawLine({
    start: { x: 250, y: y - 2 },
    end: { x: 450, y: y - 2 },
    thickness: 1,
    color: GRAY,
  })
  
  drawText(page, ctx, "Date:", 470, y, { size: FONT_SMALL, color: GRAY })
  const recDateField = ctx.form.createTextField("cert_received_date")
  recDateField.addToPage(page, { x: 500, y: y - 4, width: 60, height: 14, backgroundColor: FIELD_BG })
  recDateField.setFontSize(9)
  
  return page
}

export function buildAnnualReviewPages(ctx: PDFContext): PDFPage[] {
  return [
    buildAnnualReviewForm(ctx),
    buildDriverCertificationForm(ctx),
  ]
}

