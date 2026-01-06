/**
 * Page 6: CDL/License Information
 * License details, endorsements, and A/B/C questions
 * FIXED: Better layout and visibility
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawCheckbox,
  drawText,
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
  y -= 8
  y = drawSectionHeader(page, ctx, "DRIVER'S LICENSE INFORMATION - Per FMCSR 391.21", y)
  
  // License table header
  y -= 10
  const licCols = [
    { text: "State", width: 55 },
    { text: "License Number", width: 130 },
    { text: "Class", width: 55 },
    { text: "Endorsements", width: 100 },
    { text: "Restrictions", width: 90 },
    { text: "Exp. Date", width: 80 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 20,
    width: CONTENT_WIDTH,
    height: 22,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  licCols.forEach(col => {
    page.drawText(col.text, {
      x: x + 3,
      y: y - 14,
      size: FONT_SMALL,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  y -= 22
  
  // License rows (3 entries)
  for (let i = 1; i <= 3; i++) {
    y -= 28
    x = MARGIN_LEFT
    
    const stateField = ctx.form.createTextField(`lic${i}_state`)
    stateField.addToPage(page, { x: x, y: y - 2, width: 53, height: 22, backgroundColor: FIELD_BG })
    stateField.setFontSize(10)
    x += 55
    
    const numField = ctx.form.createTextField(`lic${i}_number`)
    numField.addToPage(page, { x: x, y: y - 2, width: 128, height: 22, backgroundColor: FIELD_BG })
    numField.setFontSize(10)
    x += 130
    
    const classField = ctx.form.createTextField(`lic${i}_class`)
    classField.addToPage(page, { x: x, y: y - 2, width: 53, height: 22, backgroundColor: FIELD_BG })
    classField.setFontSize(10)
    x += 55
    
    const endorField = ctx.form.createTextField(`lic${i}_endorsements`)
    endorField.addToPage(page, { x: x, y: y - 2, width: 98, height: 22, backgroundColor: FIELD_BG })
    endorField.setFontSize(10)
    x += 100
    
    const restrictField = ctx.form.createTextField(`lic${i}_restrictions`)
    restrictField.addToPage(page, { x: x, y: y - 2, width: 88, height: 22, backgroundColor: FIELD_BG })
    restrictField.setFontSize(10)
    x += 90
    
    const expField = ctx.form.createTextField(`lic${i}_exp`)
    expField.addToPage(page, { x: x, y: y - 2, width: 78, height: 22, backgroundColor: FIELD_BG })
    expField.setFontSize(10)
  }
  
  // Endorsements explanation
  y -= 30
  drawText(page, ctx, "Endorsements: H=Hazmat, N=Tank, P=Passenger, S=School Bus, T=Doubles/Triples, X=Hazmat+Tank", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  
  // A/B/C/D/E Questions - Better spacing
  y -= 30
  y = drawSectionHeader(page, ctx, "DRIVER HISTORY QUESTIONS - Answer All", y)
  
  const questions = [
    { id: "denied", text: "A. Have you ever been denied a license, permit, or privilege to operate a motor vehicle?" },
    { id: "suspended", text: "B. Has any license, permit, or privilege ever been suspended or revoked?" },
    { id: "felony", text: "C. Have you ever been convicted of a felony?" },
    { id: "dui", text: "D. Have you ever been convicted of DUI/DWI or refused a drug/alcohol test?" },
    { id: "failed_drug", text: "E. Have you ever failed or refused a pre-employment DOT drug/alcohol test?" },
  ]
  
  y -= 10
  for (const q of questions) {
    y -= 26
    drawText(page, ctx, q.text, MARGIN_LEFT, y, { size: FONT_LABEL })
    drawCheckbox(page, ctx, `${q.id}_yes`, "Yes", MARGIN_LEFT + 420, y - 2)
    drawCheckbox(page, ctx, `${q.id}_no`, "No", MARGIN_LEFT + 470, y - 2)
  }
  
  // Explanation field
  y -= 35
  drawText(page, ctx, "If you answered YES to any question above, provide details:", MARGIN_LEFT, y, { size: FONT_LABEL })
  
  y -= 10
  const explainField = ctx.form.createTextField("abc_explanation")
  explainField.enableMultiline()
  explainField.addToPage(page, { x: MARGIN_LEFT, y: y - 65, width: CONTENT_WIDTH, height: 70, backgroundColor: FIELD_BG })
  explainField.setFontSize(10)
  
  // Medical Information
  y -= 95
  y = drawSectionHeader(page, ctx, "MEDICAL INFORMATION", y)
  
  y -= 15
  drawText(page, ctx, "Do you have any physical condition that would affect your ability to operate a CMV?", MARGIN_LEFT, y, { size: FONT_LABEL })
  drawCheckbox(page, ctx, "physical_condition_yes", "Yes", MARGIN_LEFT + 430, y - 2)
  drawCheckbox(page, ctx, "physical_condition_no", "No", MARGIN_LEFT + 480, y - 2)
  
  y -= 26
  drawText(page, ctx, "Are you currently taking any medications that could impair safe CMV operation?", MARGIN_LEFT, y, { size: FONT_LABEL })
  drawCheckbox(page, ctx, "medications_yes", "Yes", MARGIN_LEFT + 430, y - 2)
  drawCheckbox(page, ctx, "medications_no", "No", MARGIN_LEFT + 480, y - 2)
  
  y -= 28
  drawText(page, ctx, "If yes to either, explain:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const medExplainField = ctx.form.createTextField("medical_explanation")
  medExplainField.addToPage(page, { x: MARGIN_LEFT + 130, y: y - 4, width: 380, height: 20, backgroundColor: FIELD_BG })
  medExplainField.setFontSize(10)
  
  // Signature
  y -= 45
  drawText(page, ctx, "Applicant Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 115, y: y - 2 },
    end: { x: 360, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("cdl_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 115, y: y - 2, width: 245, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 380, y)
  const signDateField = ctx.form.createTextField("cdl_date")
  signDateField.addToPage(page, { x: 415, y: y - 4, width: 90, height: 20, backgroundColor: FIELD_BG })
  signDateField.setFontSize(11)
  
  return [page]
}
