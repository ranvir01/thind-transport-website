/**
 * Page 25: Internal Process Record
 * Company internal use - hiring decision documentation
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawText,
  drawCheckbox,
  drawHorizontalLine,
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

export function buildInternalProcessPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "INTERNAL PROCESS RECORD")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "FOR OFFICE USE ONLY - DO NOT GIVE TO APPLICANT", y)
  
  // Applicant info
  y -= 10
  drawText(page, ctx, "Applicant Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("int_applicant_name")
  nameField.addToPage(page, { x: 140, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Application Date:", 420, y)
  const appDateField = ctx.form.createTextField("int_app_date")
  appDateField.addToPage(page, { x: 520, y: y - 4, width: 70, height: 18, backgroundColor: FIELD_BG })
  appDateField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Position:", MARGIN_LEFT, y)
  const posField = ctx.form.createTextField("int_position")
  posField.addToPage(page, { x: 105, y: y - 4, width: 150, height: 16, backgroundColor: FIELD_BG })
  posField.setFontSize(10)
  
  drawText(page, ctx, "Recruiter/Interviewer:", 280, y)
  const recruiterField = ctx.form.createTextField("int_recruiter")
  recruiterField.addToPage(page, { x: 405, y: y - 4, width: 150, height: 16, backgroundColor: FIELD_BG })
  recruiterField.setFontSize(10)
  
  // Pre-employment verification checklist
  y -= 35
  y = drawSectionHeader(page, ctx, "PRE-EMPLOYMENT VERIFICATION CHECKLIST", y)
  
  const checkItems = [
    { id: "ver_app", label: "Application reviewed and complete" },
    { id: "ver_mvr", label: "MVR obtained and acceptable" },
    { id: "ver_emp", label: "Previous employer verification completed" },
    { id: "ver_cdl", label: "CDL verified with state" },
    { id: "ver_med", label: "Medical certificate current and valid" },
    { id: "ver_clear", label: "Clearinghouse query completed" },
    { id: "ver_drug", label: "Pre-employment drug test completed" },
    { id: "ver_bg", label: "Background check completed" },
    { id: "ver_road", label: "Road test completed (or certificate on file)" },
    { id: "ver_ref", label: "References checked" },
  ]
  
  y -= 5
  let col = 0
  for (const item of checkItems) {
    const xPos = col === 0 ? MARGIN_LEFT : MARGIN_LEFT + 270
    drawCheckbox(page, ctx, item.id, item.label, xPos, y)
    col++
    if (col >= 2) {
      col = 0
      y -= 18
    }
  }
  if (col !== 0) y -= 18
  
  // Interview notes
  y -= 15
  y = drawSectionHeader(page, ctx, "INTERVIEW NOTES", y)
  
  y -= 10
  const notesField = ctx.form.createTextField("int_notes")
  notesField.enableMultiline()
  notesField.addToPage(page, { x: MARGIN_LEFT, y: y - 60, width: CONTENT_WIDTH, height: 65, backgroundColor: FIELD_BG })
  notesField.setFontSize(9)
  
  // Hiring decision
  y -= 90
  y = drawSectionHeader(page, ctx, "HIRING DECISION", y)
  
  y -= 10
  drawCheckbox(page, ctx, "int_hired", "HIRED", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "int_rejected", "NOT HIRED", MARGIN_LEFT + 120, y)
  drawCheckbox(page, ctx, "int_pending", "PENDING", MARGIN_LEFT + 250, y)
  
  y -= 25
  drawText(page, ctx, "If not hired, reason:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const rejectField = ctx.form.createTextField("int_reject_reason")
  rejectField.addToPage(page, { x: 155, y: y - 4, width: 355, height: 16, backgroundColor: FIELD_BG })
  rejectField.setFontSize(9)
  
  // Employment details
  y -= 35
  y = drawSectionHeader(page, ctx, "EMPLOYMENT DETAILS (If Hired)", y)
  
  y -= 10
  drawText(page, ctx, "Start Date:", MARGIN_LEFT, y)
  const startDateField = ctx.form.createTextField("int_start_date")
  startDateField.addToPage(page, { x: 120, y: y - 4, width: 90, height: 16, backgroundColor: FIELD_BG })
  startDateField.setFontSize(10)
  
  drawText(page, ctx, "Department:", 240, y)
  const deptField = ctx.form.createTextField("int_department")
  deptField.addToPage(page, { x: 315, y: y - 4, width: 140, height: 16, backgroundColor: FIELD_BG })
  deptField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Pay Rate:", MARGIN_LEFT, y)
  const payField = ctx.form.createTextField("int_pay_rate")
  payField.addToPage(page, { x: 110, y: y - 4, width: 100, height: 16, backgroundColor: FIELD_BG })
  payField.setFontSize(10)
  
  drawText(page, ctx, "Pay Type:", 240, y, { size: FONT_SMALL, color: GRAY })
  drawCheckbox(page, ctx, "int_pay_mile", "Per Mile", 290, y - 2)
  drawCheckbox(page, ctx, "int_pay_hour", "Hourly", 370, y - 2)
  drawCheckbox(page, ctx, "int_pay_percent", "Percentage", 440, y - 2)
  
  y -= 22
  drawText(page, ctx, "Equipment Assigned:", MARGIN_LEFT, y)
  const equipField = ctx.form.createTextField("int_equipment")
  equipField.addToPage(page, { x: 160, y: y - 4, width: 350, height: 16, backgroundColor: FIELD_BG })
  equipField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Route/Territory:", MARGIN_LEFT, y)
  const routeField = ctx.form.createTextField("int_route")
  routeField.addToPage(page, { x: 135, y: y - 4, width: 375, height: 16, backgroundColor: FIELD_BG })
  routeField.setFontSize(10)
  
  // Signatures
  y -= 35
  drawHorizontalLine(page, y + 5)
  
  y -= 5
  drawText(page, ctx, "Approved By:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 120, y: y - 2 },
    end: { x: 300, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  
  drawText(page, ctx, "Title:", 320, y)
  const titleField = ctx.form.createTextField("int_approver_title")
  titleField.addToPage(page, { x: 350, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  titleField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 110, y: y - 2 },
    end: { x: 300, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  
  drawText(page, ctx, "Date:", 320, y)
  const signDateField = ctx.form.createTextField("int_sign_date")
  signDateField.addToPage(page, { x: 355, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  signDateField.setFontSize(10)
  
  // Footer
  y -= 35
  drawText(page, ctx, "CONFIDENTIAL - This document contains internal hiring information and should be kept in the driver's personnel file.", MARGIN_LEFT, y, { size: FONT_TINY, color: GRAY })
  
  return [page]
}

