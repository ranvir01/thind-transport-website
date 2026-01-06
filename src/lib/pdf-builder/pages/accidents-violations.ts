/**
 * Page 5: Accident Record & Traffic Convictions
 * 3-year history of accidents and violations
 * FIXED: Better field sizes and visibility
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawCheckbox,
  drawText,
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

export function buildAccidentsViolationsPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "ACCIDENT RECORD & TRAFFIC CONVICTIONS")
  
  // Accident Record Section
  y -= 8
  y = drawSectionHeader(page, ctx, "ACCIDENT RECORD (Past 3 Years) - Per FMCSR 391.21", y)
  
  y -= 8
  y = drawInstructions(
    page,
    ctx,
    "List all accidents in which you were involved during the past 3 years (whether or not you were at fault).",
    MARGIN_LEFT,
    y,
    CONTENT_WIDTH,
    FONT_SMALL
  )
  
  // Accident table header - larger and more visible
  y -= 12
  const accCols = [
    { text: "Date", width: 75 },
    { text: "Nature of Accident", width: 185 },
    { text: "Location", width: 130 },
    { text: "Fatal", width: 45 },
    { text: "Injuries", width: 50 },
    { text: "Hazmat", width: 45 },
  ]
  
  // Header row - taller
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 20,
    width: CONTENT_WIDTH,
    height: 22,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  accCols.forEach(col => {
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
  
  // Accident rows (4 entries) - taller fields
  for (let i = 1; i <= 4; i++) {
    y -= 26
    x = MARGIN_LEFT
    
    const dateField = ctx.form.createTextField(`acc${i}_date`)
    dateField.addToPage(page, { x: x, y: y - 2, width: 73, height: 20, backgroundColor: FIELD_BG })
    dateField.setFontSize(10)
    x += 75
    
    const natureField = ctx.form.createTextField(`acc${i}_nature`)
    natureField.addToPage(page, { x: x, y: y - 2, width: 183, height: 20, backgroundColor: FIELD_BG })
    natureField.setFontSize(10)
    x += 185
    
    const locField = ctx.form.createTextField(`acc${i}_location`)
    locField.addToPage(page, { x: x, y: y - 2, width: 128, height: 20, backgroundColor: FIELD_BG })
    locField.setFontSize(10)
    x += 130
    
    const fatalField = ctx.form.createTextField(`acc${i}_fatalities`)
    fatalField.addToPage(page, { x: x, y: y - 2, width: 43, height: 20, backgroundColor: FIELD_BG })
    fatalField.setFontSize(10)
    x += 45
    
    const injField = ctx.form.createTextField(`acc${i}_injuries`)
    injField.addToPage(page, { x: x, y: y - 2, width: 48, height: 20, backgroundColor: FIELD_BG })
    injField.setFontSize(10)
    x += 50
    
    const hazField = ctx.form.createTextField(`acc${i}_hazmat`)
    hazField.addToPage(page, { x: x, y: y - 2, width: 43, height: 20, backgroundColor: FIELD_BG })
    hazField.setFontSize(10)
  }
  
  // "No accidents" checkbox
  y -= 28
  drawCheckbox(page, ctx, "no_accidents", "I have had NO accidents in the past 3 years", MARGIN_LEFT, y)
  
  // Traffic Convictions Section
  y -= 35
  y = drawSectionHeader(page, ctx, "TRAFFIC CONVICTIONS (Past 3 Years) - Per FMCSR 391.21", y)
  
  y -= 8
  y = drawInstructions(
    page,
    ctx,
    "List all motor vehicle violations for which you were convicted or forfeited bond during the past 3 years.",
    MARGIN_LEFT,
    y,
    CONTENT_WIDTH,
    FONT_SMALL
  )
  
  // Traffic table header
  y -= 12
  const traffCols = [
    { text: "Date", width: 75 },
    { text: "Violation", width: 175 },
    { text: "Location", width: 125 },
    { text: "Vehicle", width: 75 },
    { text: "Penalty", width: 80 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 20,
    width: CONTENT_WIDTH,
    height: 22,
    color: NAVY,
  })
  
  x = MARGIN_LEFT
  traffCols.forEach(col => {
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
  
  // Traffic rows (4 entries)
  for (let i = 1; i <= 4; i++) {
    y -= 26
    x = MARGIN_LEFT
    
    const dateField = ctx.form.createTextField(`traffic${i}_date`)
    dateField.addToPage(page, { x: x, y: y - 2, width: 73, height: 20, backgroundColor: FIELD_BG })
    dateField.setFontSize(10)
    x += 75
    
    const violField = ctx.form.createTextField(`traffic${i}_violation`)
    violField.addToPage(page, { x: x, y: y - 2, width: 173, height: 20, backgroundColor: FIELD_BG })
    violField.setFontSize(10)
    x += 175
    
    const locField = ctx.form.createTextField(`traffic${i}_location`)
    locField.addToPage(page, { x: x, y: y - 2, width: 123, height: 20, backgroundColor: FIELD_BG })
    locField.setFontSize(10)
    x += 125
    
    const typeField = ctx.form.createTextField(`traffic${i}_vehicle_type`)
    typeField.addToPage(page, { x: x, y: y - 2, width: 73, height: 20, backgroundColor: FIELD_BG })
    typeField.setFontSize(10)
    x += 75
    
    const penaltyField = ctx.form.createTextField(`traffic${i}_penalty`)
    penaltyField.addToPage(page, { x: x, y: y - 2, width: 78, height: 20, backgroundColor: FIELD_BG })
    penaltyField.setFontSize(10)
  }
  
  // "No violations" checkbox
  y -= 28
  drawCheckbox(page, ctx, "no_violations", "I have had NO traffic convictions in the past 3 years", MARGIN_LEFT, y)
  
  // Certification
  y -= 35
  drawText(page, ctx, "I certify that the above information is true and complete to the best of my knowledge.", MARGIN_LEFT, y, { size: FONT_LABEL })
  
  y -= 30
  drawText(page, ctx, "Applicant Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 115, y: y - 2 },
    end: { x: 360, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("acc_viol_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 115, y: y - 2, width: 245, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 380, y)
  const signDateField = ctx.form.createTextField("acc_viol_date")
  signDateField.addToPage(page, { x: 415, y: y - 4, width: 90, height: 20, backgroundColor: FIELD_BG })
  signDateField.setFontSize(11)
  
  return [page]
}
