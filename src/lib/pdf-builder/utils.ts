/**
 * PDF Builder Utilities
 * Reusable helpers for creating consistent PDF layouts
 */

import { PDFDocument, PDFPage, PDFForm, PDFFont, rgb, StandardFonts, Color, PDFTextField, PDFCheckBox } from 'pdf-lib'

// Constants
export const PAGE_WIDTH = 612 // Letter size width in points (8.5")
export const PAGE_HEIGHT = 792 // Letter size height in points (11")
export const MARGIN_LEFT = 50
export const MARGIN_RIGHT = 50
export const MARGIN_TOP = 50
export const MARGIN_BOTTOM = 50
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

// Colors
export const NAVY = rgb(0.118, 0.227, 0.373) // #1e3a5f
export const BLACK = rgb(0, 0, 0)
export const GRAY = rgb(0.4, 0.4, 0.4)
export const LIGHT_GRAY = rgb(0.95, 0.95, 0.95)
export const WHITE = rgb(1, 1, 1)
export const FIELD_BG = rgb(1, 1, 0.95) // Light yellow for form fields

// Font sizes
export const FONT_TITLE = 16
export const FONT_SUBTITLE = 14
export const FONT_SECTION = 12
export const FONT_LABEL = 10
export const FONT_SMALL = 9
export const FONT_TINY = 8

// Line heights
export const LINE_HEIGHT = 14
export const FIELD_HEIGHT = 16
export const CHECKBOX_SIZE = 12

// Types
export interface PDFContext {
  doc: PDFDocument
  form: PDFForm
  font: PDFFont
  fontBold: PDFFont
}

/**
 * Initialize PDF document with fonts
 */
export async function createPDFContext(): Promise<PDFContext> {
  const doc = await PDFDocument.create()
  const form = doc.getForm()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  
  return { doc, form, font, fontBold }
}

/**
 * Add a new page to the document
 */
export function addPage(ctx: PDFContext): PDFPage {
  return ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
}

/**
 * Draw company header with Thind Transport branding
 */
export function drawCompanyHeader(page: PDFPage, ctx: PDFContext, subtitle?: string): number {
  let y = PAGE_HEIGHT - MARGIN_TOP
  
  // Company name
  page.drawText("THIND TRANSPORT LLC", {
    x: PAGE_WIDTH / 2 - 90,
    y: y,
    size: FONT_TITLE,
    font: ctx.fontBold,
    color: NAVY,
  })
  y -= 20
  
  // Subtitle if provided
  if (subtitle) {
    page.drawText(subtitle, {
      x: PAGE_WIDTH / 2 - ctx.font.widthOfTextAtSize(subtitle, FONT_SUBTITLE) / 2,
      y: y,
      size: FONT_SUBTITLE,
      font: ctx.fontBold,
      color: BLACK,
    })
    y -= 25
  }
  
  // Horizontal line
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y },
    thickness: 1,
    color: NAVY,
  })
  y -= 15
  
  return y
}

/**
 * Draw a section header
 */
export function drawSectionHeader(page: PDFPage, ctx: PDFContext, text: string, y: number): number {
  // Background box
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: 18,
    color: NAVY,
  })
  
  // Text
  page.drawText(text.toUpperCase(), {
    x: MARGIN_LEFT + 5,
    y: y,
    size: FONT_SECTION,
    font: ctx.fontBold,
    color: WHITE,
  })
  
  return y - 25
}

/**
 * Draw a labeled text field
 */
export function drawTextField(
  page: PDFPage,
  ctx: PDFContext,
  fieldName: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number = FIELD_HEIGHT,
  required: boolean = false
): PDFTextField {
  // Label
  const labelText = required ? `${label}*:` : `${label}:`
  page.drawText(labelText, {
    x: x,
    y: y + 2,
    size: FONT_LABEL,
    font: ctx.font,
    color: BLACK,
  })
  
  const labelWidth = ctx.font.widthOfTextAtSize(labelText, FONT_LABEL) + 5
  const fieldX = x + labelWidth
  const fieldWidth = width - labelWidth
  
  // Create text field
  const field = ctx.form.createTextField(fieldName)
  field.addToPage(page, {
    x: fieldX,
    y: y - 2,
    width: fieldWidth,
    height: height,
    borderWidth: 1,
    backgroundColor: FIELD_BG,
  })
  field.setFontSize(FONT_LABEL)
  
  return field
}

/**
 * Draw a text field with label above
 */
export function drawTextFieldVertical(
  page: PDFPage,
  ctx: PDFContext,
  fieldName: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number = FIELD_HEIGHT,
  required: boolean = false
): PDFTextField {
  // Label above
  const labelText = required ? `${label}*` : label
  page.drawText(labelText, {
    x: x,
    y: y + height + 3,
    size: FONT_SMALL,
    font: ctx.font,
    color: GRAY,
  })
  
  // Create text field
  const field = ctx.form.createTextField(fieldName)
  field.addToPage(page, {
    x: x,
    y: y,
    width: width,
    height: height,
    borderWidth: 1,
    backgroundColor: FIELD_BG,
  })
  field.setFontSize(FONT_LABEL)
  
  return field
}

/**
 * Draw a checkbox with label
 */
export function drawCheckbox(
  page: PDFPage,
  ctx: PDFContext,
  fieldName: string,
  label: string,
  x: number,
  y: number,
  labelPosition: 'left' | 'right' = 'right'
): PDFCheckBox {
  const checkbox = ctx.form.createCheckBox(fieldName)
  
  if (labelPosition === 'right') {
    checkbox.addToPage(page, {
      x: x,
      y: y,
      width: CHECKBOX_SIZE,
      height: CHECKBOX_SIZE,
      borderWidth: 1,
      backgroundColor: WHITE,
    })
    
    page.drawText(label, {
      x: x + CHECKBOX_SIZE + 4,
      y: y + 2,
      size: FONT_LABEL,
      font: ctx.font,
      color: BLACK,
    })
  } else {
    page.drawText(label, {
      x: x,
      y: y + 2,
      size: FONT_LABEL,
      font: ctx.font,
      color: BLACK,
    })
    
    const labelWidth = ctx.font.widthOfTextAtSize(label, FONT_LABEL) + 5
    checkbox.addToPage(page, {
      x: x + labelWidth,
      y: y,
      width: CHECKBOX_SIZE,
      height: CHECKBOX_SIZE,
      borderWidth: 1,
      backgroundColor: WHITE,
    })
  }
  
  return checkbox
}

/**
 * Draw a Yes/No checkbox group
 */
export function drawYesNoCheckboxes(
  page: PDFPage,
  ctx: PDFContext,
  fieldBaseName: string,
  label: string,
  x: number,
  y: number
): { yes: PDFCheckBox; no: PDFCheckBox } {
  page.drawText(label, {
    x: x,
    y: y + 2,
    size: FONT_LABEL,
    font: ctx.font,
    color: BLACK,
  })
  
  const labelWidth = ctx.font.widthOfTextAtSize(label, FONT_LABEL) + 10
  
  // Yes checkbox
  const yes = ctx.form.createCheckBox(`${fieldBaseName}_yes`)
  yes.addToPage(page, {
    x: x + labelWidth,
    y: y,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderWidth: 1,
    backgroundColor: WHITE,
  })
  page.drawText("Yes", {
    x: x + labelWidth + CHECKBOX_SIZE + 3,
    y: y + 2,
    size: FONT_LABEL,
    font: ctx.font,
    color: BLACK,
  })
  
  // No checkbox
  const no = ctx.form.createCheckBox(`${fieldBaseName}_no`)
  no.addToPage(page, {
    x: x + labelWidth + 50,
    y: y,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderWidth: 1,
    backgroundColor: WHITE,
  })
  page.drawText("No", {
    x: x + labelWidth + 50 + CHECKBOX_SIZE + 3,
    y: y + 2,
    size: FONT_LABEL,
    font: ctx.font,
    color: BLACK,
  })
  
  return { yes, no }
}

/**
 * Draw a table header row
 */
export function drawTableHeader(
  page: PDFPage,
  ctx: PDFContext,
  columns: { text: string; width: number }[],
  x: number,
  y: number,
  rowHeight: number = 20
): number {
  // Background
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)
  page.drawRectangle({
    x: x,
    y: y - rowHeight + 4,
    width: totalWidth,
    height: rowHeight,
    color: NAVY,
  })
  
  // Column headers
  let currentX = x
  columns.forEach((col, index) => {
    page.drawText(col.text, {
      x: currentX + 3,
      y: y - rowHeight + 8,
      size: FONT_SMALL,
      font: ctx.fontBold,
      color: WHITE,
    })
    
    // Vertical line (except last)
    if (index < columns.length - 1) {
      page.drawLine({
        start: { x: currentX + col.width, y: y + 4 },
        end: { x: currentX + col.width, y: y - rowHeight + 4 },
        thickness: 0.5,
        color: WHITE,
      })
    }
    
    currentX += col.width
  })
  
  return y - rowHeight
}

/**
 * Draw a table row with fields
 */
export function drawTableRowWithFields(
  page: PDFPage,
  ctx: PDFContext,
  fieldPrefix: string,
  columns: { fieldName: string; width: number }[],
  x: number,
  y: number,
  rowHeight: number = FIELD_HEIGHT
): number {
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)
  
  // Border
  page.drawRectangle({
    x: x,
    y: y - rowHeight,
    width: totalWidth,
    height: rowHeight,
    borderWidth: 0.5,
    borderColor: GRAY,
    color: WHITE,
  })
  
  // Fields
  let currentX = x
  columns.forEach((col, index) => {
    const field = ctx.form.createTextField(`${fieldPrefix}_${col.fieldName}`)
    field.addToPage(page, {
      x: currentX + 1,
      y: y - rowHeight + 1,
      width: col.width - 2,
      height: rowHeight - 2,
      borderWidth: 0,
      backgroundColor: FIELD_BG,
    })
    field.setFontSize(FONT_SMALL)
    
    // Vertical line (except last)
    if (index < columns.length - 1) {
      page.drawLine({
        start: { x: currentX + col.width, y: y },
        end: { x: currentX + col.width, y: y - rowHeight },
        thickness: 0.5,
        color: GRAY,
      })
    }
    
    currentX += col.width
  })
  
  return y - rowHeight
}

/**
 * Draw instructions/legal text
 */
export function drawInstructions(
  page: PDFPage,
  ctx: PDFContext,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number = FONT_SMALL
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y
  const lineHeight = fontSize + 3
  
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word
    const testWidth = ctx.font.widthOfTextAtSize(testLine, fontSize)
    
    if (testWidth > width && line) {
      page.drawText(line, {
        x: x,
        y: currentY,
        size: fontSize,
        font: ctx.font,
        color: GRAY,
      })
      currentY -= lineHeight
      line = word
    } else {
      line = testLine
    }
  }
  
  // Draw remaining text
  if (line) {
    page.drawText(line, {
      x: x,
      y: currentY,
      size: fontSize,
      font: ctx.font,
      color: GRAY,
    })
    currentY -= lineHeight
  }
  
  return currentY
}

/**
 * Draw a signature line with label
 */
export function drawSignatureLine(
  page: PDFPage,
  ctx: PDFContext,
  fieldName: string,
  label: string,
  x: number,
  y: number,
  width: number
): PDFTextField {
  // Line
  page.drawLine({
    start: { x: x, y: y },
    end: { x: x + width, y: y },
    thickness: 1,
    color: BLACK,
  })
  
  // Label below
  page.drawText(label, {
    x: x,
    y: y - 12,
    size: FONT_SMALL,
    font: ctx.font,
    color: GRAY,
  })
  
  // Invisible text field for signature
  const field = ctx.form.createTextField(fieldName)
  field.addToPage(page, {
    x: x,
    y: y + 2,
    width: width,
    height: 20,
    borderWidth: 0,
    backgroundColor: rgb(1, 1, 1), // Transparent-ish
  })
  field.setFontSize(FONT_SECTION)
  
  return field
}

/**
 * Draw a date field (short width)
 */
export function drawDateField(
  page: PDFPage,
  ctx: PDFContext,
  fieldName: string,
  label: string,
  x: number,
  y: number,
  width: number = 80
): PDFTextField {
  page.drawText(label + ":", {
    x: x,
    y: y + 2,
    size: FONT_LABEL,
    font: ctx.font,
    color: BLACK,
  })
  
  const labelWidth = ctx.font.widthOfTextAtSize(label + ":", FONT_LABEL) + 5
  
  const field = ctx.form.createTextField(fieldName)
  field.addToPage(page, {
    x: x + labelWidth,
    y: y - 2,
    width: width - labelWidth,
    height: FIELD_HEIGHT,
    borderWidth: 1,
    backgroundColor: FIELD_BG,
  })
  field.setFontSize(FONT_LABEL)
  
  return field
}

/**
 * Draw page number footer
 */
export function drawPageNumber(page: PDFPage, ctx: PDFContext, pageNum: number, totalPages: number): void {
  const text = `Page ${pageNum} of ${totalPages}`
  const textWidth = ctx.font.widthOfTextAtSize(text, FONT_SMALL)
  
  page.drawText(text, {
    x: PAGE_WIDTH / 2 - textWidth / 2,
    y: MARGIN_BOTTOM - 20,
    size: FONT_SMALL,
    font: ctx.font,
    color: GRAY,
  })
}

/**
 * Draw a horizontal line
 */
export function drawHorizontalLine(page: PDFPage, y: number, margin: number = MARGIN_LEFT): void {
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: PAGE_WIDTH - margin, y: y },
    thickness: 0.5,
    color: GRAY,
  })
}

/**
 * Draw plain text
 */
export function drawText(
  page: PDFPage,
  ctx: PDFContext,
  text: string,
  x: number,
  y: number,
  options?: {
    size?: number
    bold?: boolean
    color?: Color
  }
): void {
  page.drawText(text, {
    x: x,
    y: y,
    size: options?.size || FONT_LABEL,
    font: options?.bold ? ctx.fontBold : ctx.font,
    color: options?.color || BLACK,
  })
}

/**
 * Draw a multi-line text field (text area)
 */
export function drawTextArea(
  page: PDFPage,
  ctx: PDFContext,
  fieldName: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number
): PDFTextField {
  // Label above
  page.drawText(label, {
    x: x,
    y: y + height + 3,
    size: FONT_SMALL,
    font: ctx.font,
    color: GRAY,
  })
  
  const field = ctx.form.createTextField(fieldName)
  field.enableMultiline()
  field.addToPage(page, {
    x: x,
    y: y,
    width: width,
    height: height,
    borderWidth: 1,
    backgroundColor: FIELD_BG,
  })
  field.setFontSize(FONT_SMALL)
  
  return field
}

