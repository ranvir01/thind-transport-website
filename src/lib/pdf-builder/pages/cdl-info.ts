/**
 * Page 6: CDL/License Information
 * License details, endorsements, and A/B/C questions
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawCheckbox,
  drawText,
  drawHorizontalLine,
  drawTextArea,
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

export function buildCDLInfoPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "CDL / LICENSE INFORMATION")
  
  // Current License Section
  y -= 5
  y = drawSectionHeader(page, ctx, "DRIVER'S LICENSE INFORMATION - Per FMCSR 391.21", y)
  
  // License table header
  y -= 5
  const licCols = [
    { text: "State", width: 50 },
    { text: "License Number", width: 140 },
    { text: "Class (A/B/C)", width: 70 },
    { text: "Endorsements", width: 100 },
    { text: "Restrictions", width: 80 },
    { text: "Exp. Date", width: 70 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  licCols.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 12,
      size: FONT_TINY,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // License rows (3 entries - for multiple licenses)
  for (let i = 1; i <= 3; i++) {
    y -= 22
    x = MARGIN_LEFT
    
    const stateField = ctx.form.createTextField(`lic${i}_state`)
    stateField.addToPage(page, { x: x, y: y - 2, width: 48, height: 16, backgroundColor: FIELD_BG })
    stateField.setFontSize(9)
    x += 50
    
    const numField = ctx.form.createTextField(`lic${i}_number`)
    numField.addToPage(page, { x: x, y: y - 2, width: 138, height: 16, backgroundColor: FIELD_BG })
    numField.setFontSize(9)
    x += 140
    
    const classField = ctx.form.createTextField(`lic${i}_class`)
    classField.addToPage(page, { x: x, y: y - 2, width: 68, height: 16, backgroundColor: FIELD_BG })
    classField.setFontSize(9)
    x += 70
    
    const endorField = ctx.form.createTextField(`lic${i}_endorsements`)
    endorField.addToPage(page, { x: x, y: y - 2, width: 98, height: 16, backgroundColor: FIELD_BG })
    endorField.setFontSize(9)
    x += 100
    
    const restrictField = ctx.form.createTextField(`lic${i}_restrictions`)
    restrictField.addToPage(page, { x: x, y: y - 2, width: 78, height: 16, backgroundColor: FIELD_BG })
    restrictField.setFontSize(9)
    x += 80
    
    const expField = ctx.form.createTextField(`lic${i}_exp`)
    expField.addToPage(page, { x: x, y: y - 2, width: 68, height: 16, backgroundColor: FIELD_BG })
    expField.setFontSize(9)
  }
  
  // Endorsements explanation
  y -= 30
  drawText(page, ctx, "Common Endorsements: H = Hazmat, N = Tank, P = Passenger, S = School Bus, T = Doubles/Triples, X = Hazmat + Tank", MARGIN_LEFT, y, { size: FONT_TINY, color: GRAY })
  
  // A/B/C Questions
  y -= 30
  y = drawSectionHeader(page, ctx, "DRIVER HISTORY QUESTIONS - Answer All Questions", y)
  
  // Question A
  y -= 10
  drawText(page, ctx, "A. Have you ever been denied a license, permit, or privilege to operate a motor vehicle?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "denied_yes", "Yes", MARGIN_LEFT + 420, y - 2)
  drawCheckbox(page, ctx, "denied_no", "No", MARGIN_LEFT + 470, y - 2)
  
  // Question B
  y -= 22
  drawText(page, ctx, "B. Has any license, permit, or privilege ever been suspended or revoked?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "suspended_yes", "Yes", MARGIN_LEFT + 420, y - 2)
  drawCheckbox(page, ctx, "suspended_no", "No", MARGIN_LEFT + 470, y - 2)
  
  // Question C
  y -= 22
  drawText(page, ctx, "C. Have you ever been convicted of a felony?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "felony_yes", "Yes", MARGIN_LEFT + 420, y - 2)
  drawCheckbox(page, ctx, "felony_no", "No", MARGIN_LEFT + 470, y - 2)
  
  // Question D - DUI
  y -= 22
  drawText(page, ctx, "D. Have you ever been convicted of DUI/DWI or refused a drug/alcohol test?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "dui_yes", "Yes", MARGIN_LEFT + 420, y - 2)
  drawCheckbox(page, ctx, "dui_no", "No", MARGIN_LEFT + 470, y - 2)
  
  // Question E - Failed Drug Test
  y -= 22
  drawText(page, ctx, "E. Have you ever failed or refused a pre-employment DOT drug/alcohol test?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "failed_drug_yes", "Yes", MARGIN_LEFT + 420, y - 2)
  drawCheckbox(page, ctx, "failed_drug_no", "No", MARGIN_LEFT + 470, y - 2)
  
  // Explanation field
  y -= 30
  drawText(page, ctx, "If you answered YES to any question above, provide details (include dates, locations, circumstances):", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 20
  const explainField = ctx.form.createTextField("abc_explanation")
  explainField.enableMultiline()
  explainField.addToPage(page, { x: MARGIN_LEFT, y: y - 70, width: CONTENT_WIDTH, height: 75, backgroundColor: FIELD_BG })
  explainField.setFontSize(9)
  
  // Medical Information
  y -= 100
  y = drawSectionHeader(page, ctx, "MEDICAL INFORMATION", y)
  
  y -= 10
  drawText(page, ctx, "Do you have any physical condition that would affect your ability to operate a commercial motor vehicle?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "physical_condition_yes", "Yes", MARGIN_LEFT + 460, y - 2)
  drawCheckbox(page, ctx, "physical_condition_no", "No", MARGIN_LEFT + 500, y - 2)
  
  y -= 22
  drawText(page, ctx, "Are you currently taking any medications that could impair your ability to safely operate a CMV?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, "medications_yes", "Yes", MARGIN_LEFT + 460, y - 2)
  drawCheckbox(page, ctx, "medications_no", "No", MARGIN_LEFT + 500, y - 2)
  
  y -= 22
  drawText(page, ctx, "If yes to either, explain:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const medExplainField = ctx.form.createTextField("medical_explanation")
  medExplainField.addToPage(page, { x: MARGIN_LEFT + 120, y: y - 4, width: 390, height: 16, backgroundColor: FIELD_BG })
  medExplainField.setFontSize(9)
  
  // Certification
  y -= 40
  drawText(page, ctx, "I certify that the above information is true and complete to the best of my knowledge.", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 25
  drawText(page, ctx, "Applicant Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 105, y: y - 2 },
    end: { x: 350, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("cdl_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 105, y: y - 2, width: 245, height: 18, borderWidth: 0 })
  sigField.setFontSize(12)
  
  drawText(page, ctx, "Date:", 370, y)
  const signDateField = ctx.form.createTextField("cdl_date")
  signDateField.addToPage(page, { x: 400, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  signDateField.setFontSize(10)
  
  return [page]
}

