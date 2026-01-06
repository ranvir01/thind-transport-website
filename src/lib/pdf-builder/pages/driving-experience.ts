/**
 * Page 7: Driving Experience
 * Equipment types, miles, and dates
 * FIXED: Better field sizes and layout
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
  GRAY,
  FIELD_BG,
  NAVY,
  WHITE,
} from '../utils'

export function buildDrivingExperiencePage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "DRIVING EXPERIENCE")
  
  // Driving Experience Section
  y -= 8
  y = drawSectionHeader(page, ctx, "DRIVING EXPERIENCE - Per FMCSR 391.21", y)
  
  // Experience table header
  y -= 10
  const expCols = [
    { text: "Equipment Type", width: 120 },
    { text: "Type of Equipment", width: 160 },
    { text: "From", width: 70 },
    { text: "To", width: 70 },
    { text: "Approx. Miles", width: 90 },
  ]
  
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 20,
    width: CONTENT_WIDTH,
    height: 22,
    color: NAVY,
  })
  
  let x = MARGIN_LEFT
  expCols.forEach(col => {
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
  
  // Equipment types with fields
  const equipmentTypes = [
    { id: "straight", label: "Straight Truck" },
    { id: "semi", label: "Tractor-Semitrailer" },
    { id: "doubles", label: "Tractor - Two Trailers" },
    { id: "triples", label: "Tractor - Three Trailers" },
    { id: "bus", label: "Bus" },
    { id: "other1", label: "Other:" },
  ]
  
  for (const equip of equipmentTypes) {
    y -= 28
    x = MARGIN_LEFT
    
    // Equipment type label
    drawText(page, ctx, equip.label, x + 3, y + 3, { size: FONT_LABEL })
    x += 120
    
    // Type of equipment
    const typeField = ctx.form.createTextField(`exp_${equip.id}_type`)
    typeField.addToPage(page, { x: x, y: y - 2, width: 158, height: 22, backgroundColor: FIELD_BG })
    typeField.setFontSize(10)
    x += 160
    
    // From date
    const fromField = ctx.form.createTextField(`exp_${equip.id}_from`)
    fromField.addToPage(page, { x: x, y: y - 2, width: 68, height: 22, backgroundColor: FIELD_BG })
    fromField.setFontSize(10)
    x += 70
    
    // To date
    const toField = ctx.form.createTextField(`exp_${equip.id}_to`)
    toField.addToPage(page, { x: x, y: y - 2, width: 68, height: 22, backgroundColor: FIELD_BG })
    toField.setFontSize(10)
    x += 70
    
    // Approx miles
    const milesField = ctx.form.createTextField(`exp_${equip.id}_miles`)
    milesField.addToPage(page, { x: x, y: y - 2, width: 88, height: 22, backgroundColor: FIELD_BG })
    milesField.setFontSize(10)
  }
  
  // States operated in
  y -= 40
  y = drawSectionHeader(page, ctx, "STATES OPERATED IN (Past 5 Years)", y)
  
  y -= 10
  drawText(page, ctx, "List all states in which you have operated a commercial motor vehicle:", MARGIN_LEFT, y, { size: FONT_LABEL })
  
  y -= 15
  const statesField = ctx.form.createTextField("states_operated")
  statesField.enableMultiline()
  statesField.addToPage(page, { x: MARGIN_LEFT, y: y - 45, width: CONTENT_WIDTH, height: 50, backgroundColor: FIELD_BG })
  statesField.setFontSize(11)
  
  // Special Skills
  y -= 75
  y = drawSectionHeader(page, ctx, "SPECIAL EQUIPMENT / SKILLS", y)
  
  y -= 15
  drawText(page, ctx, "Check all that apply:", MARGIN_LEFT, y, { size: FONT_LABEL })
  
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
    const xPos = MARGIN_LEFT + (col * 175)
    const yPos = y - (row * 22)
    drawCheckbox(page, ctx, `skill_${skill.id}`, skill.label, xPos, yPos)
    col++
    if (col >= 3) {
      col = 0
      row++
    }
  }
  
  y -= (Math.ceil(skills.length / 3) * 22) + 25
  
  // Other equipment experience
  drawText(page, ctx, "Other special equipment/skills:", MARGIN_LEFT, y, { size: FONT_LABEL })
  const otherSkillsField = ctx.form.createTextField("other_skills")
  otherSkillsField.addToPage(page, { x: MARGIN_LEFT + 175, y: y - 4, width: 335, height: 20, backgroundColor: FIELD_BG })
  otherSkillsField.setFontSize(10)
  
  return [page]
}
