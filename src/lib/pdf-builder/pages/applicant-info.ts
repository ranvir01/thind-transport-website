/**
 * Page 2: Applicant Information
 * Personal details, contact info, addresses, education
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawCheckbox,
  drawYesNoCheckboxes,
  drawText,
  drawHorizontalLine,
  drawTextFieldVertical,
  drawTableHeader,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  PAGE_WIDTH,
  MARGIN_RIGHT,
  FONT_LABEL,
  FONT_SMALL,
  FONT_TINY,
  GRAY,
  BLACK,
  FIELD_BG,
  FIELD_HEIGHT,
} from '../utils'

export function buildApplicantInfoPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "DRIVER APPLICATION FOR EMPLOYMENT")
  
  // Date field top right
  y += 15
  drawText(page, ctx, "Date:", 450, y)
  const dateField = ctx.form.createTextField("app_date")
  dateField.addToPage(page, { x: 480, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  dateField.setFontSize(10)
  
  // Position applied for
  y -= 30
  y = drawSectionHeader(page, ctx, "POSITION APPLIED FOR", y)
  
  y -= 5
  drawCheckbox(page, ctx, "pos_contract_driver", "Contract Driver", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "pos_contractors_driver", "Contractor's Driver", MARGIN_LEFT + 150, y)
  drawCheckbox(page, ctx, "pos_company_driver", "Company Driver", MARGIN_LEFT + 320, y)
  
  // Personal Information
  y -= 25
  y = drawSectionHeader(page, ctx, "PERSONAL INFORMATION", y)
  
  // Row 1: Name and Phone
  y -= 5
  drawTextFieldVertical(page, ctx, "applicant_name", "Full Legal Name (Last, First, Middle)", MARGIN_LEFT, y - 20, 280, FIELD_HEIGHT, true)
  drawTextFieldVertical(page, ctx, "phone", "Phone Number", 350, y - 20, 120, FIELD_HEIGHT, true)
  drawTextFieldVertical(page, ctx, "emergency_phone", "Emergency Phone", 480, y - 20, 80, FIELD_HEIGHT, true)
  
  // Row 2: DOB, Age, SSN
  y -= 55
  drawTextFieldVertical(page, ctx, "dob", "Date of Birth", MARGIN_LEFT, y - 20, 100, FIELD_HEIGHT, true)
  drawTextFieldVertical(page, ctx, "age", "Age", 160, y - 20, 50, FIELD_HEIGHT)
  drawTextFieldVertical(page, ctx, "ssn", "Social Security Number", 220, y - 20, 140, FIELD_HEIGHT, true)
  drawTextFieldVertical(page, ctx, "email", "Email Address", 370, y - 20, 190, FIELD_HEIGHT, true)
  
  // Row 3: Physical Exam
  y -= 55
  drawTextFieldVertical(page, ctx, "physical_exam_exp", "DOT Physical Exam Expiration Date", MARGIN_LEFT, y - 20, 180, FIELD_HEIGHT, true)
  drawTextFieldVertical(page, ctx, "med_card_state", "Medical Card State", 250, y - 20, 100, FIELD_HEIGHT)
  
  // Address History
  y -= 50
  y = drawSectionHeader(page, ctx, "ADDRESS HISTORY (Past 3 Years) - List All Addresses", y)
  
  // Address table header
  y -= 5
  const addrCols = [
    { text: "Street Address, City, State, ZIP", width: 300 },
    { text: "From (Mo/Yr)", width: 80 },
    { text: "To (Mo/Yr)", width: 80 },
  ]
  
  // Header row
  let x = MARGIN_LEFT
  addrCols.forEach(col => {
    drawText(page, ctx, col.text, x + 2, y, { size: FONT_SMALL, color: GRAY })
    x += col.width
  })
  
  // Address rows (3)
  for (let i = 1; i <= 3; i++) {
    y -= 22
    const addrField = ctx.form.createTextField(`addr${i}_street`)
    addrField.addToPage(page, { x: MARGIN_LEFT, y: y - 2, width: 295, height: 18, backgroundColor: FIELD_BG })
    addrField.setFontSize(9)
    
    const fromField = ctx.form.createTextField(`addr${i}_from`)
    fromField.addToPage(page, { x: MARGIN_LEFT + 300, y: y - 2, width: 75, height: 18, backgroundColor: FIELD_BG })
    fromField.setFontSize(9)
    
    const toField = ctx.form.createTextField(`addr${i}_to`)
    toField.addToPage(page, { x: MARGIN_LEFT + 380, y: y - 2, width: 75, height: 18, backgroundColor: FIELD_BG })
    toField.setFontSize(9)
    
    // Label
    drawText(page, ctx, `${i}.`, MARGIN_LEFT - 15, y + 2, { size: FONT_SMALL })
  }
  
  // Worked for company before
  y -= 35
  drawText(page, ctx, "Have you ever worked for this company before?", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "worked_before_yes", "Yes", 280, y - 2)
  drawCheckbox(page, ctx, "worked_before_no", "No", 330, y - 2)
  
  y -= 22
  drawText(page, ctx, "If yes:", MARGIN_LEFT, y)
  drawTextFieldVertical(page, ctx, "worked_before_from", "From", 90, y - 15, 70, FIELD_HEIGHT)
  drawTextFieldVertical(page, ctx, "worked_before_to", "To", 170, y - 15, 70, FIELD_HEIGHT)
  drawTextFieldVertical(page, ctx, "worked_before_reason", "Reason for Leaving", 250, y - 15, 210, FIELD_HEIGHT)
  
  // Education
  y -= 50
  y = drawSectionHeader(page, ctx, "EDUCATION (Circle Highest Grade Completed)", y)
  
  y -= 5
  drawText(page, ctx, "Grade School:", MARGIN_LEFT, y)
  for (let i = 1; i <= 8; i++) {
    drawCheckbox(page, ctx, `edu_grade_${i}`, `${i}`, MARGIN_LEFT + 80 + (i - 1) * 25, y - 2)
  }
  
  y -= 20
  drawText(page, ctx, "High School:", MARGIN_LEFT, y)
  for (let i = 9; i <= 12; i++) {
    drawCheckbox(page, ctx, `edu_grade_${i}`, `${i}`, MARGIN_LEFT + 80 + (i - 9) * 25, y - 2)
  }
  
  drawText(page, ctx, "College:", MARGIN_LEFT + 200, y)
  for (let i = 1; i <= 4; i++) {
    drawCheckbox(page, ctx, `edu_college_${i}`, `${i}`, MARGIN_LEFT + 255 + (i - 1) * 25, y - 2)
  }
  
  drawText(page, ctx, "Post Graduate:", MARGIN_LEFT + 380, y)
  for (let i = 1; i <= 4; i++) {
    drawCheckbox(page, ctx, `edu_postgrad_${i}`, `${i}`, MARGIN_LEFT + 455 + (i - 1) * 25, y - 2)
  }
  
  // Legal questions
  y -= 35
  y = drawSectionHeader(page, ctx, "LEGAL STATUS", y)
  
  y -= 5
  drawText(page, ctx, "Are you legally authorized to work in the United States?", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "legal_work_yes", "Yes", 320, y - 2)
  drawCheckbox(page, ctx, "legal_work_no", "No", 370, y - 2)
  
  y -= 22
  drawText(page, ctx, "Are you at least 21 years of age?", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "age_21_yes", "Yes", 220, y - 2)
  drawCheckbox(page, ctx, "age_21_no", "No", 270, y - 2)
  
  y -= 22
  drawText(page, ctx, "Can you read and speak English per FMCSR 391.11?", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "english_yes", "Yes", 300, y - 2)
  drawCheckbox(page, ctx, "english_no", "No", 350, y - 2)
  
  // Footer note
  y -= 30
  drawText(page, ctx, "* Required fields must be completed before application can be processed.", MARGIN_LEFT, y, { size: FONT_TINY, color: GRAY })
  
  return [page]
}

