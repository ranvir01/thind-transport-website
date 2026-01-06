/**
 * Pages 10-13: Authorization Forms
 * Background check, PSP, drug test consents, FCRA disclosures
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawText,
  drawInstructions,
  drawCheckbox,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  FONT_LABEL,
  FONT_SMALL,
  FONT_TINY,
  GRAY,
  BLACK,
  FIELD_BG,
} from '../utils'

// Page 10: Background Check Authorization
function buildBackgroundCheckPage(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "BACKGROUND CHECK AUTHORIZATION")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "AUTHORIZATION FOR BACKGROUND INVESTIGATION", y)
  
  const bgText = `
I hereby authorize Thind Transport LLC and its designated agents and representatives to conduct a comprehensive background investigation on me as part of my application for employment. This investigation may include, but is not limited to:

• Criminal record checks at the local, state, and federal level
• Motor vehicle records (MVR) from all states where I have held a driver's license
• Verification of education, employment history, and professional licenses
• Credit history (where permitted by law and relevant to the position)
• Reference checks from former employers, supervisors, and personal references
• Drug and alcohol testing history per DOT regulations
• Social media and public records searches

I understand that this authorization is valid for the duration of my employment or application period, and that information obtained may be used in making hiring decisions.

I release Thind Transport LLC, its agents, and all persons and entities providing information, from any liability arising from this investigation or the use of information obtained.

I understand that I have the right to request a copy of any background report obtained and to dispute any inaccurate information.
`.trim()

  y -= 10
  y = drawInstructions(page, ctx, bgText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Applicant info
  y -= 25
  drawText(page, ctx, "Full Legal Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("bg_name")
  nameField.addToPage(page, { x: 145, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "SSN:", 410, y)
  const ssnField = ctx.form.createTextField("bg_ssn")
  ssnField.addToPage(page, { x: 440, y: y - 4, width: 120, height: 18, backgroundColor: FIELD_BG })
  ssnField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "Date of Birth:", MARGIN_LEFT, y)
  const dobField = ctx.form.createTextField("bg_dob")
  dobField.addToPage(page, { x: 120, y: y - 4, width: 100, height: 18, backgroundColor: FIELD_BG })
  dobField.setFontSize(10)
  
  drawText(page, ctx, "Driver's License #:", 240, y)
  const dlField = ctx.form.createTextField("bg_dl")
  dlField.addToPage(page, { x: 340, y: y - 4, width: 120, height: 18, backgroundColor: FIELD_BG })
  dlField.setFontSize(10)
  
  drawText(page, ctx, "State:", 480, y)
  const stateField = ctx.form.createTextField("bg_dl_state")
  stateField.addToPage(page, { x: 510, y: y - 4, width: 50, height: 18, backgroundColor: FIELD_BG })
  stateField.setFontSize(10)
  
  // Signature
  y -= 40
  drawText(page, ctx, "Applicant Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 115, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("bg_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 115, y: y - 2, width: 265, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 400, y)
  const dateField = ctx.form.createTextField("bg_date")
  dateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(11)
  
  return page
}

// Page 11: PSP Authorization
function buildPSPAuthorizationPage(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "PSP AUTHORIZATION")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "PRE-EMPLOYMENT SCREENING PROGRAM (PSP) DISCLOSURE & AUTHORIZATION", y)
  
  const pspText = `
DISCLOSURE REGARDING BACKGROUND INVESTIGATION

In accordance with the FMCSA regulations (49 CFR Part 391), Thind Transport LLC ("Prospective Employer") is required to access the Pre-Employment Screening Program (PSP) online database maintained by the Federal Motor Carrier Safety Administration (FMCSA) as part of the driver investigation process.

The PSP system is designed to assist prospective employers in determining whether to hire a driver by providing access to information regarding:
• The driver's crash history for the past 5 years
• The driver's roadside inspection history for the past 3 years

The prospective employer must obtain your written or electronic consent prior to accessing your PSP record. If the employer uses information from the PSP report to make an adverse employment decision (deny employment, terminate employment, etc.), it must notify you that the PSP report was obtained and provide you with a copy of the PSP report.

You may obtain a copy of your own PSP record by visiting www.psp.fmcsa.dot.gov.

AUTHORIZATION

I authorize Thind Transport LLC to access my PSP record from FMCSA in connection with my application for employment. I understand that:

• My crash and inspection information may be made available to Thind Transport LLC
• This information may be used by Thind Transport LLC in making hiring decisions
• I have the right to review my PSP record, and to have errors corrected

I hereby authorize release of my PSP record to Thind Transport LLC.
`.trim()

  y -= 10
  y = drawInstructions(page, ctx, pspText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Applicant info
  y -= 25
  drawText(page, ctx, "Printed Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("psp_name")
  nameField.addToPage(page, { x: 140, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Date:", 420, y)
  const dateField = ctx.form.createTextField("psp_date")
  dateField.addToPage(page, { x: 450, y: y - 4, width: 100, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(10)
  
  // Signature
  y -= 30
  drawText(page, ctx, "Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 65, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("psp_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 65, y: y - 2, width: 315, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  return page
}

// Page 12: Drug & Alcohol Clearinghouse Consent
function buildClearinghousePage(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "DRUG & ALCOHOL CLEARINGHOUSE CONSENT")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "FMCSA DRUG & ALCOHOL CLEARINGHOUSE - CONSENT FOR LIMITED QUERIES", y)
  
  const clearingText = `
GENERAL CONSENT FOR LIMITED QUERIES OF THE FMCSA DRUG AND ALCOHOL CLEARINGHOUSE

In accordance with 49 CFR Part 382, I authorize Thind Transport LLC to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse to determine whether drug or alcohol violation information about me exists in the Clearinghouse.

I understand that:

1. This general consent authorizes Thind Transport LLC to conduct limited queries of the Clearinghouse for the duration of my employment or until I revoke my consent.

2. A "limited query" only reveals whether there is information about me in the Clearinghouse; it does not reveal the specific violation information.

3. If the limited query indicates that information about me exists in the Clearinghouse, I must provide electronic consent through the Clearinghouse website (https://clearinghouse.fmcsa.dot.gov) before Thind Transport LLC can conduct a full query and view the detailed results.

4. I have the right to review my own information in the Clearinghouse at any time.

5. I may revoke this consent at any time by notifying Thind Transport LLC in writing. However, if I refuse to provide consent for a limited query or a full query (if required), Thind Transport LLC must remove me from safety-sensitive functions.

I hereby provide my consent for Thind Transport LLC to perform limited queries of the FMCSA Drug and Alcohol Clearinghouse during my employment.
`.trim()

  y -= 10
  y = drawInstructions(page, ctx, clearingText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Driver info
  y -= 25
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("clear_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 200, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "CDL Number:", 350, y)
  const cdlField = ctx.form.createTextField("clear_cdl")
  cdlField.addToPage(page, { x: 425, y: y - 4, width: 130, height: 18, backgroundColor: FIELD_BG })
  cdlField.setFontSize(10)
  
  y -= 25
  drawText(page, ctx, "CDL State:", MARGIN_LEFT, y)
  const stateField = ctx.form.createTextField("clear_state")
  stateField.addToPage(page, { x: 115, y: y - 4, width: 50, height: 18, backgroundColor: FIELD_BG })
  stateField.setFontSize(10)
  
  drawText(page, ctx, "Date of Birth:", 200, y)
  const dobField = ctx.form.createTextField("clear_dob")
  dobField.addToPage(page, { x: 280, y: y - 4, width: 100, height: 18, backgroundColor: FIELD_BG })
  dobField.setFontSize(10)
  
  // Signature
  y -= 35
  drawText(page, ctx, "Driver Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 100, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("clear_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 100, y: y - 2, width: 280, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 400, y)
  const dateField = ctx.form.createTextField("clear_date")
  dateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(11)
  
  return page
}

// Page 13: FCRA Disclosure
function buildFCRAPage(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "FCRA DISCLOSURE & AUTHORIZATION")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "FAIR CREDIT REPORTING ACT (FCRA) - DISCLOSURE & AUTHORIZATION", y)
  
  const fcraText = `
DISCLOSURE REGARDING CONSUMER REPORTS

In connection with your application for employment, Thind Transport LLC ("Company") may obtain one or more consumer reports or investigative consumer reports about you from a consumer reporting agency. This disclosure is being provided to you in accordance with the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

A "consumer report" is a report containing information about your character, general reputation, personal characteristics, and mode of living. An "investigative consumer report" includes information obtained through personal interviews with individuals who may have knowledge about you.

Under the FCRA, you have certain rights:

1. Before any adverse action is taken based in whole or in part on a consumer report, you will be provided with a copy of the report and a description of your rights under the FCRA.

2. You have the right to dispute the accuracy or completeness of any information in a consumer report.

3. Upon request, the consumer reporting agency will provide you with information about the nature and scope of any investigative consumer report.

AUTHORIZATION

By signing below, I acknowledge that I have read and understand this disclosure. I authorize Thind Transport LLC and its designated agents to obtain consumer reports and/or investigative consumer reports about me for employment purposes.

I understand that this authorization shall remain in effect throughout my application process and, if hired, throughout my employment, unless I revoke it in writing.

I authorize any person, company, or agency contacted by the consumer reporting agency to fully provide any information about me.

I release Thind Transport LLC, its agents, and all persons and entities providing information from any liability arising from the investigation or use of this information.
`.trim()

  y -= 10
  y = drawInstructions(page, ctx, fcraText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Applicant info
  y -= 20
  drawText(page, ctx, "Printed Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("fcra_name")
  nameField.addToPage(page, { x: 140, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Date:", 420, y)
  const dateField = ctx.form.createTextField("fcra_date")
  dateField.addToPage(page, { x: 450, y: y - 4, width: 100, height: 18, backgroundColor: FIELD_BG })
  dateField.setFontSize(10)
  
  // Signature
  y -= 30
  drawText(page, ctx, "Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: MARGIN_LEFT + 65, y: y - 2 },
    end: { x: 400, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("fcra_signature")
  sigField.addToPage(page, { x: MARGIN_LEFT + 65, y: y - 2, width: 335, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  return page
}

export function buildAuthorizationPages(ctx: PDFContext): PDFPage[] {
  return [
    buildBackgroundCheckPage(ctx),
    buildPSPAuthorizationPage(ctx),
    buildClearinghousePage(ctx),
    buildFCRAPage(ctx),
  ]
}

