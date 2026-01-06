/**
 * Page 1: DQ File Checklist
 * Internal HR tracking for driver qualification file requirements
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawCheckbox,
  drawTextField,
  drawDateField,
  drawText,
  drawHorizontalLine,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  FONT_LABEL,
  FONT_SMALL,
  GRAY,
} from '../utils'

export function buildDQChecklistPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "DRIVER QUALIFICATION FILE CHECKLIST")
  
  // Driver info section
  y -= 10
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("dq_driver_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 200, height: 16 })
  
  drawText(page, ctx, "Hire Date:", 350, y)
  const hireDateField = ctx.form.createTextField("dq_hire_date")
  hireDateField.addToPage(page, { x: 410, y: y - 4, width: 80, height: 16 })
  
  y -= 25
  drawText(page, ctx, "Address:", MARGIN_LEFT, y)
  const addressField = ctx.form.createTextField("dq_address")
  addressField.addToPage(page, { x: 100, y: y - 4, width: 300, height: 16 })
  
  drawText(page, ctx, "Phone:", 420, y)
  const phoneField = ctx.form.createTextField("dq_phone")
  phoneField.addToPage(page, { x: 460, y: y - 4, width: 100, height: 16 })
  
  y -= 25
  drawText(page, ctx, "DQ File Complete Date:", MARGIN_LEFT, y)
  const completeField = ctx.form.createTextField("dq_complete_date")
  completeField.addToPage(page, { x: 180, y: y - 4, width: 80, height: 16 })
  
  // Checklist header
  y -= 30
  y = drawSectionHeader(page, ctx, "PRE-EMPLOYMENT ITEMS (Required Before Hire)", y)
  
  // Checklist items - Pre-Employment
  const preEmploymentItems = [
    { id: "dq_app_received", label: "Application for Employment Received (§391.21)" },
    { id: "dq_inquiry_sent", label: "Previous Employer Inquiries Sent (§391.23)" },
    { id: "dq_mvr_ordered", label: "Motor Vehicle Record (MVR) Ordered (§391.23)" },
    { id: "dq_road_test", label: "Road Test Completed or Certificate (§391.31-33)" },
    { id: "dq_med_exam", label: "Medical Examiner's Certificate Verified (§391.41-49)" },
    { id: "dq_cdl_verified", label: "CDL Verified with State" },
    { id: "dq_drug_pre", label: "Pre-Employment Drug Test Completed (§382)" },
    { id: "dq_clearinghouse", label: "Drug & Alcohol Clearinghouse Query Completed" },
    { id: "dq_psp_review", label: "PSP Report Reviewed (Optional but Recommended)" },
  ]
  
  y -= 5
  for (const item of preEmploymentItems) {
    drawCheckbox(page, ctx, item.id, item.label, MARGIN_LEFT, y)
    
    // Date field for each
    const dateField = ctx.form.createTextField(`${item.id}_date`)
    dateField.addToPage(page, { x: 450, y: y - 2, width: 60, height: 14 })
    dateField.setFontSize(8)
    
    y -= 18
  }
  
  // Post-Employment section
  y -= 15
  y = drawSectionHeader(page, ctx, "POST-EMPLOYMENT ITEMS (Required After Hire)", y)
  
  const postEmploymentItems = [
    { id: "dq_inquiry_rcvd", label: "Previous Employer Responses Received (§391.23)" },
    { id: "dq_annual_mvr", label: "Annual MVR Review Completed (§391.25)" },
    { id: "dq_annual_cert", label: "Annual Driver Certification (§391.27)" },
    { id: "dq_med_card_exp", label: "Medical Card Expiration Tracked" },
    { id: "dq_drug_random", label: "Random Drug/Alcohol Testing Completed (§382)" },
    { id: "dq_hours_records", label: "Hours of Service Records Maintained (§395)" },
  ]
  
  y -= 5
  for (const item of postEmploymentItems) {
    drawCheckbox(page, ctx, item.id, item.label, MARGIN_LEFT, y)
    
    const dateField = ctx.form.createTextField(`${item.id}_date`)
    dateField.addToPage(page, { x: 450, y: y - 2, width: 60, height: 14 })
    dateField.setFontSize(8)
    
    y -= 18
  }
  
  // Training section
  y -= 15
  y = drawSectionHeader(page, ctx, "TRAINING & ORIENTATION", y)
  
  const trainingItems = [
    { id: "dq_orientation", label: "Company Orientation Completed" },
    { id: "dq_safety_training", label: "Safety Training Completed" },
    { id: "dq_hazmat", label: "Hazmat Training (if applicable)" },
    { id: "dq_eld_training", label: "ELD Training Completed" },
  ]
  
  y -= 5
  for (const item of trainingItems) {
    drawCheckbox(page, ctx, item.id, item.label, MARGIN_LEFT, y)
    
    const dateField = ctx.form.createTextField(`${item.id}_date`)
    dateField.addToPage(page, { x: 450, y: y - 2, width: 60, height: 14 })
    dateField.setFontSize(8)
    
    y -= 18
  }
  
  // Notes section
  y -= 15
  drawText(page, ctx, "Notes:", MARGIN_LEFT, y)
  y -= 5
  const notesField = ctx.form.createTextField("dq_notes")
  notesField.enableMultiline()
  notesField.addToPage(page, { x: MARGIN_LEFT, y: y - 60, width: CONTENT_WIDTH, height: 60 })
  
  // Footer note
  y -= 85
  drawText(page, ctx, "THIS PAGE FOR INTERNAL USE ONLY - NOT TO BE GIVEN TO APPLICANT", MARGIN_LEFT + 80, y, { size: FONT_SMALL, color: GRAY })
  
  return [page]
}

