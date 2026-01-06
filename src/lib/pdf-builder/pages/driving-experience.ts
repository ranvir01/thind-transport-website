/**
 * Page 7: Driving Experience
 * Equipment types, miles, and dates
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

export function buildDrivingExperiencePage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "DRIVING EXPERIENCE")
  
  // Driving Experience Section
  y -= 5
  y = drawSectionHeader(page, ctx, "DRIVING EXPERIENCE - Per FMCSR 391.21", y)
  
  // Experience table header
  y -= 5
  const expCols = [
    { text: "Equipment Type", width: 140 },
    { text: "Type of Equipment (Van, Tank, Flat, etc.)", width: 180 },
    { text: "From (Mo/Yr)", width: 70 },
    { text: "To (Mo/Yr)", width: 70 },
    { text: "Approx. Miles", width: 70 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  expCols.forEach(col => {
    page.drawText(col.text, {
      x: x + 2,
      y: y - 12,
      size: FONT_TINY,
      font: ctx.fontBold,
      color: WHITE,
    })
    x += col.width
  })
  
  // Equipment types with fields
  const equipmentTypes = [
    { id: "straight", label: "Straight Truck" },
    { id: "semi", label: "Tractor-Semitrailer" },
    { id: "doubles", label: "Tractor - Two Trailers" },
    { id: "triples", label: "Tractor - Three Trailers" },
    { id: "bus", label: "Bus" },
    { id: "other1", label: "Other (specify):" },
    { id: "other2", label: "Other (specify):" },
  ]
  
  for (const equip of equipmentTypes) {
    y -= 24
    x = MARGIN_LEFT
    
    // Equipment type label
    drawText(page, ctx, equip.label, x + 2, y + 2, { size: FONT_SMALL })
    x += 140
    
    // Type of equipment
    const typeField = ctx.form.createTextField(`exp_${equip.id}_type`)
    typeField.addToPage(page, { x: x, y: y - 2, width: 178, height: 18, backgroundColor: FIELD_BG })
    typeField.setFontSize(9)
    x += 180
    
    // From date
    const fromField = ctx.form.createTextField(`exp_${equip.id}_from`)
    fromField.addToPage(page, { x: x, y: y - 2, width: 68, height: 18, backgroundColor: FIELD_BG })
    fromField.setFontSize(9)
    x += 70
    
    // To date
    const toField = ctx.form.createTextField(`exp_${equip.id}_to`)
    toField.addToPage(page, { x: x, y: y - 2, width: 68, height: 18, backgroundColor: FIELD_BG })
    toField.setFontSize(9)
    x += 70
    
    // Approx miles
    const milesField = ctx.form.createTextField(`exp_${equip.id}_miles`)
    milesField.addToPage(page, { x: x, y: y - 2, width: 68, height: 18, backgroundColor: FIELD_BG })
    milesField.setFontSize(9)
  }
  
  // States operated in
  y -= 40
  y = drawSectionHeader(page, ctx, "STATES OPERATED IN (Past 5 Years)", y)
  
  y -= 5
  drawText(page, ctx, "List all states in which you have operated a commercial motor vehicle in the past 5 years:", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 20
  const statesField = ctx.form.createTextField("states_operated")
  statesField.enableMultiline()
  statesField.addToPage(page, { x: MARGIN_LEFT, y: y - 40, width: CONTENT_WIDTH, height: 45, backgroundColor: FIELD_BG })
  statesField.setFontSize(10)
  
  // Special Skills
  y -= 70
  y = drawSectionHeader(page, ctx, "SPECIAL EQUIPMENT / SKILLS", y)
  
  y -= 10
  drawText(page, ctx, "Check all that apply:", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 20
  const skills = [
    { id: "hazmat", label: "Hazmat Certified" },
    { id: "tanker", label: "Tanker Endorsed" },
    { id: "doubles", label: "Doubles/Triples" },
    { id: "passenger", label: "Passenger Transport" },
    { id: "oversized", label: "Oversized Loads" },
    { id: "refrigerated", label: "Refrigerated" },
    { id: "flatbed", label: "Flatbed/Tarping" },
    { id: "forklift", label: "Forklift" },
    { id: "chains", label: "Tire Chains" },
    { id: "canada", label: "Canada Experience" },
    { id: "mexico", label: "Mexico Experience" },
    { id: "twic", label: "TWIC Card" },
  ]
  
  let col = 0
  let row = 0
  for (const skill of skills) {
    const xPos = MARGIN_LEFT + (col * 170)
    const yPos = y - (row * 20)
    drawCheckbox(page, ctx, `skill_${skill.id}`, skill.label, xPos, yPos)
    col++
    if (col >= 3) {
      col = 0
      row++
    }
  }
  
  y -= (Math.ceil(skills.length / 3) * 20) + 20
  
  // Other equipment experience
  drawText(page, ctx, "Other special equipment/skills (describe):", MARGIN_LEFT, y, { size: FONT_SMALL })
  const otherSkillsField = ctx.form.createTextField("other_skills")
  otherSkillsField.addToPage(page, { x: MARGIN_LEFT + 210, y: y - 4, width: 300, height: 16, backgroundColor: FIELD_BG })
  otherSkillsField.setFontSize(9)
  
  return [page]
}

