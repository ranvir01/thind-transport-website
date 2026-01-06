/**
 * Pages 3-4: Employment History
 * 10 years of employment record with FMCSR questions
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
  FIELD_HEIGHT,
} from '../utils'

function drawEmployerBlock(
  page: PDFPage,
  ctx: PDFContext,
  num: number,
  startY: number
): number {
  let y = startY
  
  // Employer number header
  drawText(page, ctx, `EMPLOYER ${num}`, MARGIN_LEFT, y, { bold: true })
  y -= 18
  
  // Row 1: Dates and Company Name
  drawText(page, ctx, "From:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const fromField = ctx.form.createTextField(`emp${num}_from`)
  fromField.addToPage(page, { x: MARGIN_LEFT + 30, y: y - 4, width: 60, height: 14, backgroundColor: FIELD_BG })
  fromField.setFontSize(9)
  
  drawText(page, ctx, "To:", MARGIN_LEFT + 100, y, { size: FONT_SMALL, color: GRAY })
  const toField = ctx.form.createTextField(`emp${num}_to`)
  toField.addToPage(page, { x: MARGIN_LEFT + 115, y: y - 4, width: 60, height: 14, backgroundColor: FIELD_BG })
  toField.setFontSize(9)
  
  drawText(page, ctx, "Company Name:", MARGIN_LEFT + 185, y, { size: FONT_SMALL, color: GRAY })
  const nameField = ctx.form.createTextField(`emp${num}_name`)
  nameField.addToPage(page, { x: MARGIN_LEFT + 270, y: y - 4, width: 240, height: 14, backgroundColor: FIELD_BG })
  nameField.setFontSize(9)
  
  // Row 2: Address and Phone
  y -= 20
  drawText(page, ctx, "Address:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const addrField = ctx.form.createTextField(`emp${num}_address`)
  addrField.addToPage(page, { x: MARGIN_LEFT + 45, y: y - 4, width: 280, height: 14, backgroundColor: FIELD_BG })
  addrField.setFontSize(9)
  
  drawText(page, ctx, "Phone:", MARGIN_LEFT + 340, y, { size: FONT_SMALL, color: GRAY })
  const phoneField = ctx.form.createTextField(`emp${num}_phone`)
  phoneField.addToPage(page, { x: MARGIN_LEFT + 375, y: y - 4, width: 135, height: 14, backgroundColor: FIELD_BG })
  phoneField.setFontSize(9)
  
  // Row 3: Position and Salary
  y -= 20
  drawText(page, ctx, "Position Held:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const posField = ctx.form.createTextField(`emp${num}_position`)
  posField.addToPage(page, { x: MARGIN_LEFT + 65, y: y - 4, width: 150, height: 14, backgroundColor: FIELD_BG })
  posField.setFontSize(9)
  
  drawText(page, ctx, "Salary/Wage:", MARGIN_LEFT + 230, y, { size: FONT_SMALL, color: GRAY })
  const salaryField = ctx.form.createTextField(`emp${num}_salary`)
  salaryField.addToPage(page, { x: MARGIN_LEFT + 295, y: y - 4, width: 80, height: 14, backgroundColor: FIELD_BG })
  salaryField.setFontSize(9)
  
  drawText(page, ctx, "Supervisor:", MARGIN_LEFT + 390, y, { size: FONT_SMALL, color: GRAY })
  const supField = ctx.form.createTextField(`emp${num}_supervisor`)
  supField.addToPage(page, { x: MARGIN_LEFT + 445, y: y - 4, width: 65, height: 14, backgroundColor: FIELD_BG })
  supField.setFontSize(9)
  
  // Row 4: Reason for leaving
  y -= 20
  drawText(page, ctx, "Reason for Leaving:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const reasonField = ctx.form.createTextField(`emp${num}_reason`)
  reasonField.addToPage(page, { x: MARGIN_LEFT + 95, y: y - 4, width: 415, height: 14, backgroundColor: FIELD_BG })
  reasonField.setFontSize(9)
  
  // Row 5: FMCSR questions
  y -= 20
  drawText(page, ctx, "Was this position subject to FMCSR (49 CFR Part 391)?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `emp${num}_fmcsr_yes`, "Yes", MARGIN_LEFT + 280, y - 2)
  drawCheckbox(page, ctx, `emp${num}_fmcsr_no`, "No", MARGIN_LEFT + 320, y - 2)
  
  y -= 18
  drawText(page, ctx, "Was this position subject to DOT drug & alcohol testing (49 CFR Part 40)?", MARGIN_LEFT, y, { size: FONT_SMALL })
  drawCheckbox(page, ctx, `emp${num}_drug_yes`, "Yes", MARGIN_LEFT + 350, y - 2)
  drawCheckbox(page, ctx, `emp${num}_drug_no`, "No", MARGIN_LEFT + 390, y - 2)
  
  // Separator line
  y -= 10
  drawHorizontalLine(page, y)
  
  return y - 10
}

export function buildEmploymentHistoryPages(ctx: PDFContext): PDFPage[] {
  const pages: PDFPage[] = []
  
  // Page 3: Employers 1-5
  const page1 = addPage(ctx)
  pages.push(page1)
  
  let y = drawCompanyHeader(page1, ctx, "EMPLOYMENT HISTORY")
  
  // Instructions
  y -= 5
  y = drawInstructions(
    page1,
    ctx,
    "List all employment for the past 10 years (commercial motor vehicle experience) or past 3 years (all other employment). You MUST account for all time periods including unemployment, self-employment, military service, and education. Use additional sheets if necessary.",
    MARGIN_LEFT,
    y,
    CONTENT_WIDTH,
    FONT_TINY
  )
  
  y -= 10
  y = drawSectionHeader(page1, ctx, "EMPLOYMENT RECORD (Required per FMCSR 391.21)", y)
  
  // Employers 1-4 on page 1
  for (let i = 1; i <= 4; i++) {
    y = drawEmployerBlock(page1, ctx, i, y)
  }
  
  // Page 4: Employers 5-8 and gaps
  const page2 = addPage(ctx)
  pages.push(page2)
  
  y = drawCompanyHeader(page2, ctx, "EMPLOYMENT HISTORY (Continued)")
  
  y -= 10
  y = drawSectionHeader(page2, ctx, "EMPLOYMENT RECORD (Continued)", y)
  
  // Employers 5-8 on page 2
  for (let i = 5; i <= 8; i++) {
    y = drawEmployerBlock(page2, ctx, i, y)
  }
  
  // Gaps in employment
  y -= 10
  y = drawSectionHeader(page2, ctx, "GAPS IN EMPLOYMENT", y)
  
  y -= 5
  drawText(page2, ctx, "List and explain any gaps in employment (unemployment, illness, incarceration, etc.):", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 20
  const gapsField = ctx.form.createTextField("employment_gaps")
  gapsField.enableMultiline()
  gapsField.addToPage(page2, { x: MARGIN_LEFT, y: y - 50, width: CONTENT_WIDTH, height: 55, backgroundColor: FIELD_BG })
  gapsField.setFontSize(9)
  
  return pages
}

