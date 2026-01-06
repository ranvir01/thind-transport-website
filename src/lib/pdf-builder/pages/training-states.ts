/**
 * Page 8: Training & Special Courses
 * Training courses, safe driving awards, special qualifications
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

export function buildTrainingStatesPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "TRAINING & QUALIFICATIONS")
  
  // Special Training Section
  y -= 5
  y = drawSectionHeader(page, ctx, "SPECIAL COURSES / TRAINING", y)
  
  // Training table header
  y -= 5
  const trainCols = [
    { text: "Course/Training Name", width: 250 },
    { text: "Date Completed", width: 100 },
    { text: "Certificate # (if applicable)", width: 160 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  trainCols.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 12,
      size: FONT_SMALL,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // Training rows (6 entries)
  for (let i = 1; i <= 6; i++) {
    y -= 22
    x = MARGIN_LEFT
    
    const nameField = ctx.form.createTextField(`training${i}_name`)
    nameField.addToPage(page, { x: x, y: y - 2, width: 248, height: 16, backgroundColor: FIELD_BG })
    nameField.setFontSize(9)
    x += 250
    
    const dateField = ctx.form.createTextField(`training${i}_date`)
    dateField.addToPage(page, { x: x, y: y - 2, width: 98, height: 16, backgroundColor: FIELD_BG })
    dateField.setFontSize(9)
    x += 100
    
    const certField = ctx.form.createTextField(`training${i}_cert`)
    certField.addToPage(page, { x: x, y: y - 2, width: 158, height: 16, backgroundColor: FIELD_BG })
    certField.setFontSize(9)
  }
  
  // Safe Driving Awards
  y -= 35
  y = drawSectionHeader(page, ctx, "SAFE DRIVING AWARDS / RECOGNITIONS", y)
  
  y -= 5
  drawText(page, ctx, "List any safe driving awards or recognitions you have received:", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 20
  const awardsField = ctx.form.createTextField("safe_driving_awards")
  awardsField.enableMultiline()
  awardsField.addToPage(page, { x: MARGIN_LEFT, y: y - 50, width: CONTENT_WIDTH, height: 55, backgroundColor: FIELD_BG })
  awardsField.setFontSize(10)
  
  // Other Qualifications
  y -= 80
  y = drawSectionHeader(page, ctx, "OTHER QUALIFICATIONS", y)
  
  y -= 10
  drawText(page, ctx, "List any other experience, training, or qualifications relevant to driving:", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 20
  const otherQualField = ctx.form.createTextField("other_qualifications")
  otherQualField.enableMultiline()
  otherQualField.addToPage(page, { x: MARGIN_LEFT, y: y - 50, width: CONTENT_WIDTH, height: 55, backgroundColor: FIELD_BG })
  otherQualField.setFontSize(10)
  
  // Military Experience
  y -= 80
  y = drawSectionHeader(page, ctx, "MILITARY EXPERIENCE (Optional)", y)
  
  y -= 10
  drawText(page, ctx, "Have you served in the U.S. Armed Forces?", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "military_yes", "Yes", 260, y - 2)
  drawCheckbox(page, ctx, "military_no", "No", 310, y - 2)
  
  y -= 22
  drawText(page, ctx, "Branch:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const branchField = ctx.form.createTextField("military_branch")
  branchField.addToPage(page, { x: MARGIN_LEFT + 45, y: y - 4, width: 100, height: 16, backgroundColor: FIELD_BG })
  branchField.setFontSize(9)
  
  drawText(page, ctx, "From:", 200, y, { size: FONT_SMALL, color: GRAY })
  const milFromField = ctx.form.createTextField("military_from")
  milFromField.addToPage(page, { x: 235, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  milFromField.setFontSize(9)
  
  drawText(page, ctx, "To:", 310, y, { size: FONT_SMALL, color: GRAY })
  const milToField = ctx.form.createTextField("military_to")
  milToField.addToPage(page, { x: 330, y: y - 4, width: 60, height: 16, backgroundColor: FIELD_BG })
  milToField.setFontSize(9)
  
  drawText(page, ctx, "Rank:", 410, y, { size: FONT_SMALL, color: GRAY })
  const rankField = ctx.form.createTextField("military_rank")
  rankField.addToPage(page, { x: 445, y: y - 4, width: 70, height: 16, backgroundColor: FIELD_BG })
  rankField.setFontSize(9)
  
  y -= 25
  drawText(page, ctx, "Military driving experience:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const milExpField = ctx.form.createTextField("military_driving_exp")
  milExpField.addToPage(page, { x: MARGIN_LEFT + 140, y: y - 4, width: 370, height: 16, backgroundColor: FIELD_BG })
  milExpField.setFontSize(9)
  
  // References
  y -= 40
  y = drawSectionHeader(page, ctx, "PERSONAL REFERENCES (Not Former Employers)", y)
  
  y -= 5
  drawText(page, ctx, "List 3 personal references who can speak to your character and work ethic:", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  for (let i = 1; i <= 3; i++) {
    y -= 22
    drawText(page, ctx, `${i}.`, MARGIN_LEFT, y)
    
    drawText(page, ctx, "Name:", MARGIN_LEFT + 15, y, { size: FONT_SMALL, color: GRAY })
    const refNameField = ctx.form.createTextField(`ref${i}_name`)
    refNameField.addToPage(page, { x: MARGIN_LEFT + 50, y: y - 4, width: 140, height: 16, backgroundColor: FIELD_BG })
    refNameField.setFontSize(9)
    
    drawText(page, ctx, "Phone:", 250, y, { size: FONT_SMALL, color: GRAY })
    const refPhoneField = ctx.form.createTextField(`ref${i}_phone`)
    refPhoneField.addToPage(page, { x: 290, y: y - 4, width: 100, height: 16, backgroundColor: FIELD_BG })
    refPhoneField.setFontSize(9)
    
    drawText(page, ctx, "Relationship:", 405, y, { size: FONT_SMALL, color: GRAY })
    const refRelField = ctx.form.createTextField(`ref${i}_relationship`)
    refRelField.addToPage(page, { x: 470, y: y - 4, width: 90, height: 16, backgroundColor: FIELD_BG })
    refRelField.setFontSize(9)
  }
  
  return [page]
}

