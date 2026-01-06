/**
 * Page 22: Road Test Certificate
 * DOT-required road test evaluation form
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

export function buildRoadTestPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "ROAD TEST CERTIFICATE")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "DRIVER INFORMATION - 49 CFR 391.31", y)
  
  // Driver info
  y -= 10
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("road_driver_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Date of Birth:", 410, y)
  const dobField = ctx.form.createTextField("road_dob")
  dobField.addToPage(page, { x: 490, y: y - 4, width: 70, height: 18, backgroundColor: FIELD_BG })
  dobField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "SSN (last 4):", MARGIN_LEFT, y)
  const ssnField = ctx.form.createTextField("road_ssn4")
  ssnField.addToPage(page, { x: 105, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  ssnField.setFontSize(10)
  
  drawText(page, ctx, "CDL Number:", 190, y)
  const cdlField = ctx.form.createTextField("road_cdl")
  cdlField.addToPage(page, { x: 265, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  cdlField.setFontSize(10)
  
  drawText(page, ctx, "State:", 400, y)
  const stateField = ctx.form.createTextField("road_cdl_state")
  stateField.addToPage(page, { x: 435, y: y - 4, width: 45, height: 16, backgroundColor: FIELD_BG })
  stateField.setFontSize(10)
  
  drawText(page, ctx, "Exp:", 495, y)
  const expField = ctx.form.createTextField("road_cdl_exp")
  expField.addToPage(page, { x: 520, y: y - 4, width: 55, height: 16, backgroundColor: FIELD_BG })
  expField.setFontSize(9)
  
  // Equipment info
  y -= 30
  y = drawSectionHeader(page, ctx, "EQUIPMENT USED FOR TEST", y)
  
  y -= 10
  drawText(page, ctx, "Type of Power Unit:", MARGIN_LEFT, y)
  const powerField = ctx.form.createTextField("road_power_unit")
  powerField.addToPage(page, { x: 160, y: y - 4, width: 150, height: 16, backgroundColor: FIELD_BG })
  powerField.setFontSize(10)
  
  drawText(page, ctx, "Type of Trailer(s):", 330, y)
  const trailerField = ctx.form.createTextField("road_trailer")
  trailerField.addToPage(page, { x: 430, y: y - 4, width: 130, height: 16, backgroundColor: FIELD_BG })
  trailerField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Bus:", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "road_bus_yes", "Yes", 80, y - 2)
  drawCheckbox(page, ctx, "road_bus_no", "No", 130, y - 2)
  
  drawText(page, ctx, "If Bus, Type:", 190, y, { size: FONT_SMALL, color: GRAY })
  const busTypeField = ctx.form.createTextField("road_bus_type")
  busTypeField.addToPage(page, { x: 260, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  busTypeField.setFontSize(10)
  
  // Road Test Evaluation
  y -= 35
  y = drawSectionHeader(page, ctx, "ROAD TEST EVALUATION", y)
  
  const evalItems = [
    { id: "pretrip", label: "Pre-Trip Inspection" },
    { id: "coupling", label: "Coupling and Uncoupling (if applicable)" },
    { id: "controls", label: "Placing Equipment in Operation / Use of Controls" },
    { id: "backing", label: "Backing and Parking" },
    { id: "traffic", label: "Driving in Traffic" },
    { id: "turning", label: "Turning (Right/Left/U-Turns)" },
    { id: "braking", label: "Braking and Slowing" },
    { id: "highway", label: "Highway Driving" },
    { id: "passing", label: "Passing and Lane Changes" },
    { id: "signals", label: "Use of Signals and Mirrors" },
  ]
  
  // Table header
  y -= 5
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 14,
    width: CONTENT_WIDTH,
    height: 16,
    color: NAVY,
  })
  
  page.drawText("Skill Area", { x: MARGIN_LEFT + 5, y: y - 10, size: FONT_SMALL, font: ctx.fontBold, color: WHITE })
  page.drawText("Satisfactory", { x: MARGIN_LEFT + 280, y: y - 10, size: FONT_SMALL, font: ctx.fontBold, color: WHITE })
  page.drawText("Unsatisfactory", { x: MARGIN_LEFT + 370, y: y - 10, size: FONT_SMALL, font: ctx.fontBold, color: WHITE })
  page.drawText("N/A", { x: MARGIN_LEFT + 470, y: y - 10, size: FONT_SMALL, font: ctx.fontBold, color: WHITE })
  
  for (const item of evalItems) {
    y -= 18
    drawText(page, ctx, item.label, MARGIN_LEFT + 5, y, { size: FONT_SMALL })
    drawCheckbox(page, ctx, `road_${item.id}_sat`, "", MARGIN_LEFT + 300, y - 2)
    drawCheckbox(page, ctx, `road_${item.id}_unsat`, "", MARGIN_LEFT + 400, y - 2)
    drawCheckbox(page, ctx, `road_${item.id}_na`, "", MARGIN_LEFT + 475, y - 2)
  }
  
  // Comments
  y -= 25
  drawText(page, ctx, "Comments/Notes:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const commentsField = ctx.form.createTextField("road_comments")
  commentsField.enableMultiline()
  commentsField.addToPage(page, { x: MARGIN_LEFT, y: y - 40, width: CONTENT_WIDTH, height: 40, backgroundColor: FIELD_BG })
  commentsField.setFontSize(9)
  
  // Certification
  y -= 65
  y = drawSectionHeader(page, ctx, "CERTIFICATION", y)
  
  y -= 10
  drawCheckbox(page, ctx, "road_passed", "PASSED - Driver has demonstrated skill in the above areas.", MARGIN_LEFT, y)
  
  y -= 18
  drawCheckbox(page, ctx, "road_failed", "NOT PASSED - Additional training required before re-test.", MARGIN_LEFT, y)
  
  // Examiner signature
  y -= 30
  drawText(page, ctx, "Examiner Name:", MARGIN_LEFT, y)
  const examNameField = ctx.form.createTextField("road_examiner_name")
  examNameField.addToPage(page, { x: 135, y: y - 4, width: 180, height: 16, backgroundColor: FIELD_BG })
  examNameField.setFontSize(10)
  
  drawText(page, ctx, "Title:", 340, y)
  const examTitleField = ctx.form.createTextField("road_examiner_title")
  examTitleField.addToPage(page, { x: 370, y: y - 4, width: 140, height: 16, backgroundColor: FIELD_BG })
  examTitleField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Examiner Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 145, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  
  drawText(page, ctx, "Date:", 400, y)
  const examDateField = ctx.form.createTextField("road_date")
  examDateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  examDateField.setFontSize(10)
  
  return [page]
}

