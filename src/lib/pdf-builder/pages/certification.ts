/**
 * Page 9: Applicant Certification
 * Driver acknowledgement and main application signature
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawText,
  drawInstructions,
  drawSignatureLine,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  FONT_LABEL,
  FONT_SMALL,
  FONT_TINY,
  GRAY,
  BLACK,
  FIELD_BG,
} from '../utils'

export function buildCertificationPage(ctx: PDFContext): PDFPage[] {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "APPLICANT CERTIFICATION")
  
  // Important notice
  y -= 5
  y = drawSectionHeader(page, ctx, "TO BE READ AND SIGNED BY APPLICANT", y)
  
  // Certification text
  const certificationText = `
I certify that the information I have provided in this application is true and complete to the best of my knowledge. I understand that any false statements, omissions, or misrepresentations may disqualify me from consideration for employment or, if already employed, may result in immediate termination.

I authorize Thind Transport LLC to make any investigation of my personal, employment, financial, or medical history and authorize any former employer, person, firm, corporation, or government agency to give Thind Transport LLC any information they may have regarding me.

I understand that Thind Transport LLC may obtain information from the FMCSA Drug and Alcohol Clearinghouse concerning my drug and alcohol history as required by 49 CFR Part 382.

I understand that a pre-employment drug screen will be required before beginning work and that I will be subject to random drug and alcohol testing as required by 49 CFR Part 382.

I understand that this application is not a contract of employment. If I am hired, my employment will be "at will," meaning that either I or Thind Transport LLC may terminate the employment relationship at any time, with or without cause.

I agree to submit to and pass a road test prior to operation of commercial motor vehicles for Thind Transport LLC.

I understand that information I provide regarding my current employer may be used, and I authorize Thind Transport LLC to contact my current employer AFTER a conditional offer of employment is made, unless I indicate otherwise below.

I authorize Thind Transport LLC to access my Pre-Employment Screening Program (PSP) record from FMCSA for the purpose of reviewing my driving record as part of the hiring process.

I understand and agree that, in the event of my employment, this application and any other documents relating to my employment may become part of my permanent personnel file.
`.trim()

  y -= 10
  y = drawInstructions(page, ctx, certificationText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Do not contact current employer checkbox
  y -= 20
  drawText(page, ctx, "□  Please DO NOT contact my current employer until a conditional offer of employment is made.", MARGIN_LEFT, y, { size: FONT_SMALL })
  const dncCheckbox = ctx.form.createCheckBox("do_not_contact_current")
  dncCheckbox.addToPage(page, { x: MARGIN_LEFT, y: y - 2, width: 12, height: 12 })
  
  // Signature section
  y -= 40
  y = drawSectionHeader(page, ctx, "APPLICANT SIGNATURE", y)
  
  y -= 20
  drawText(page, ctx, "By signing below, I certify that I have read and understand the above statements and that all information provided in this application is true and complete.", MARGIN_LEFT, y, { size: FONT_SMALL })
  
  y -= 35
  // Signature line
  drawText(page, ctx, "Applicant Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 110, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("main_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 110, y: y - 2, width: 270, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 400, y)
  const dateField = ctx.form.createTextField("main_sign_date")
  dateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(11)
  
  y -= 35
  // Printed name
  drawText(page, ctx, "Print Name:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 70, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const printNameField = ctx.form.createTextField("main_printed_name")
  printNameField.addToPage(page, { x: MARGIN_LEFT + 70, y: y - 2, width: 310, height: 20, borderWidth: 0 })
  printNameField.setFontSize(12)
  
  // Footer
  y -= 50
  drawText(page, ctx, "This application complies with FMCSR 391.21 requirements.", MARGIN_LEFT + 100, y, { size: FONT_TINY, color: GRAY })
  
  return [page]
}

