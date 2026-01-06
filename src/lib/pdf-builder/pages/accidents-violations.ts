/**
 * Page 5: Accident Record & Traffic Convictions
 * 3-year history of accidents and violations
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
  y -= 5
  y = drawSectionHeader(page, ctx, "ACCIDENT RECORD (Past 3 Years) - Per FMCSR 391.21", y)
  
  y -= 5
  y = drawInstructions(
    page,
    ctx,
    "List all accidents in which you were involved during the past 3 years (whether or not you were at fault). An \"accident\" means any occurrence involving a commercial motor vehicle resulting in a fatality, bodily injury requiring immediate medical treatment, or disabling damage to vehicles requiring tow-away.",
    MARGIN_LEFT,
    y,
    CONTENT_WIDTH,
    FONT_TINY
  )
  
  // Accident table header
  y -= 10
  const accCols = [
    { text: "Date", width: 70 },
    { text: "Nature of Accident", width: 200 },
    { text: "Location (City, State)", width: 130 },
    { text: "Fatal", width: 40 },
    { text: "Injuries", width: 45 },
    { text: "Hazmat", width: 45 },
  ]
  
  // Header row
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  accCols.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 12,
      size: FONT_TINY,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // Accident rows (5 entries)
  for (let i = 1; i <= 5; i++) {
    y -= 22
    x = MARGIN_LEFT
    
    // Date
    const dateField = ctx.form.createTextField(`acc${i}_date`)
    dateField.addToPage(page, { x: x, y: y - 2, width: 68, height: 16, backgroundColor: FIELD_BG })
    dateField.setFontSize(8)
    x += 70
    
    // Nature
    const natureField = ctx.form.createTextField(`acc${i}_nature`)
    natureField.addToPage(page, { x: x, y: y - 2, width: 198, height: 16, backgroundColor: FIELD_BG })
    natureField.setFontSize(8)
    x += 200
    
    // Location
    const locField = ctx.form.createTextField(`acc${i}_location`)
    locField.addToPage(page, { x: x, y: y - 2, width: 128, height: 16, backgroundColor: FIELD_BG })
    locField.setFontSize(8)
    x += 130
    
    // Fatalities (checkbox or number)
    const fatalField = ctx.form.createTextField(`acc${i}_fatalities`)
    fatalField.addToPage(page, { x: x, y: y - 2, width: 38, height: 16, backgroundColor: FIELD_BG })
    fatalField.setFontSize(8)
    x += 40
    
    // Injuries
    const injField = ctx.form.createTextField(`acc${i}_injuries`)
    injField.addToPage(page, { x: x, y: y - 2, width: 43, height: 16, backgroundColor: FIELD_BG })
    injField.setFontSize(8)
    x += 45
    
    // Hazmat
    const hazField = ctx.form.createTextField(`acc${i}_hazmat`)
    hazField.addToPage(page, { x: x, y: y - 2, width: 43, height: 16, backgroundColor: FIELD_BG })
    hazField.setFontSize(8)
  }
  
  // "No accidents" checkbox
  y -= 25
  drawCheckbox(page, ctx, "no_accidents", "I have had NO accidents in the past 3 years", MARGIN_LEFT, y)
  
  // Traffic Convictions Section
  y -= 30
  y = drawSectionHeader(page, ctx, "TRAFFIC CONVICTIONS (Past 3 Years) - Per FMCSR 391.21", y)
  
  y -= 5
  y = drawInstructions(
    page,
    ctx,
    "List all motor vehicle violations for which you were convicted or forfeited bond during the past 3 years (other than parking violations). Include DUI/DWI, reckless driving, speeding, following too closely, improper lane change, etc.",
    MARGIN_LEFT,
    y,
    CONTENT_WIDTH,
    FONT_TINY
  )
  
  // Traffic table header
  y -= 10
  const traffCols = [
    { text: "Date", width: 70 },
    { text: "Violation", width: 180 },
    { text: "Location (City, State)", width: 130 },
    { text: "Vehicle Type", width: 80 },
    { text: "Penalty", width: 70 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: NAVY,
  })
  
  x = MARGIN_LEFT
  traffCols.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 12,
      size: FONT_TINY,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // Traffic rows (5 entries)
  for (let i = 1; i <= 5; i++) {
    y -= 22
    x = MARGIN_LEFT
    
    const dateField = ctx.form.createTextField(`traffic${i}_date`)
    dateField.addToPage(page, { x: x, y: y - 2, width: 68, height: 16, backgroundColor: FIELD_BG })
    dateField.setFontSize(8)
    x += 70
    
    const violField = ctx.form.createTextField(`traffic${i}_violation`)
    violField.addToPage(page, { x: x, y: y - 2, width: 178, height: 16, backgroundColor: FIELD_BG })
    violField.setFontSize(8)
    x += 180
    
    const locField = ctx.form.createTextField(`traffic${i}_location`)
    locField.addToPage(page, { x: x, y: y - 2, width: 128, height: 16, backgroundColor: FIELD_BG })
    locField.setFontSize(8)
    x += 130
    
    const typeField = ctx.form.createTextField(`traffic${i}_vehicle_type`)
    typeField.addToPage(page, { x: x, y: y - 2, width: 78, height: 16, backgroundColor: FIELD_BG })
    typeField.setFontSize(8)
    x += 80
    
    const penaltyField = ctx.form.createTextField(`traffic${i}_penalty`)
    penaltyField.addToPage(page, { x: x, y: y - 2, width: 68, height: 16, backgroundColor: FIELD_BG })
    penaltyField.setFontSize(8)
  }
  
  // "No violations" checkbox
  y -= 25
  drawCheckbox(page, ctx, "no_violations", "I have had NO traffic convictions in the past 3 years", MARGIN_LEFT, y)
  
  // Certification
  y -= 30
  drawText(page, ctx, "I certify that the above information is true and complete to the best of my knowledge.", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 25
  drawText(page, ctx, "Applicant Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 105, y: y - 2 },
    end: { x: 350, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("acc_viol_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 105, y: y - 2, width: 245, height: 18, borderWidth: 0 })
  sigField.setFontSize(12)
  
  drawText(page, ctx, "Date:", 370, y)
  const signDateField = ctx.form.createTextField("acc_viol_date")
  signDateField.addToPage(page, { x: 400, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  signDateField.setFontSize(10)
  
  return [page]
}

