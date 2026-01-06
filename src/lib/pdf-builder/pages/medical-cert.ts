/**
 * Pages 23-24: Medical Certification
 * DOT medical requirements and certification
 */

import { PDFPage } from 'pdf-lib'
import {
  PDFContext,
  addPage,
  drawCompanyHeader,
  drawSectionHeader,
  drawText,
  drawCheckbox,
  drawInstructions,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  FONT_LABEL,
  FONT_SMALL,
  FONT_TINY,
  GRAY,
  BLACK,
  FIELD_BG,
} from '../utils'

// Page 23: Medical Examiner's Certificate Information
function buildMedicalInfoPage(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "MEDICAL EXAMINER'S CERTIFICATE")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "DRIVER MEDICAL CERTIFICATION - 49 CFR 391.41-391.49", y)
  
  const introText = `All drivers must have a current, valid Medical Examiner's Certificate (MEC) to operate a commercial motor vehicle in interstate commerce. The medical examination must be performed by a medical examiner listed on the National Registry of Certified Medical Examiners (NRCME).`
  
  y -= 5
  y = drawInstructions(page, ctx, introText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Driver info
  y -= 20
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("med_driver_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 250, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  drawText(page, ctx, "Date of Birth:", 410, y)
  const dobField = ctx.form.createTextField("med_dob")
  dobField.addToPage(page, { x: 490, y: y - 4, width: 70, height: 18, backgroundColor: FIELD_BG })
  dobField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "CDL Number:", MARGIN_LEFT, y)
  const cdlField = ctx.form.createTextField("med_cdl")
  cdlField.addToPage(page, { x: 120, y: y - 4, width: 130, height: 16, backgroundColor: FIELD_BG })
  cdlField.setFontSize(10)
  
  drawText(page, ctx, "State:", 270, y)
  const stateField = ctx.form.createTextField("med_cdl_state")
  stateField.addToPage(page, { x: 305, y: y - 4, width: 50, height: 16, backgroundColor: FIELD_BG })
  stateField.setFontSize(10)
  
  // Medical Card Information
  y -= 35
  y = drawSectionHeader(page, ctx, "MEDICAL EXAMINER'S CERTIFICATE INFORMATION", y)
  
  y -= 10
  drawText(page, ctx, "Medical Examiner's Name:", MARGIN_LEFT, y)
  const examNameField = ctx.form.createTextField("med_examiner_name")
  examNameField.addToPage(page, { x: 185, y: y - 4, width: 325, height: 16, backgroundColor: FIELD_BG })
  examNameField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "NRCME Number:", MARGIN_LEFT, y)
  const nrcmeField = ctx.form.createTextField("med_nrcme")
  nrcmeField.addToPage(page, { x: 135, y: y - 4, width: 140, height: 16, backgroundColor: FIELD_BG })
  nrcmeField.setFontSize(10)
  
  drawText(page, ctx, "Phone:", 300, y)
  const phoneField = ctx.form.createTextField("med_examiner_phone")
  phoneField.addToPage(page, { x: 340, y: y - 4, width: 120, height: 16, backgroundColor: FIELD_BG })
  phoneField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Address:", MARGIN_LEFT, y)
  const addrField = ctx.form.createTextField("med_examiner_address")
  addrField.addToPage(page, { x: 105, y: y - 4, width: 405, height: 16, backgroundColor: FIELD_BG })
  addrField.setFontSize(10)
  
  y -= 22
  drawText(page, ctx, "Exam Date:", MARGIN_LEFT, y)
  const examDateField = ctx.form.createTextField("med_exam_date")
  examDateField.addToPage(page, { x: 115, y: y - 4, width: 90, height: 16, backgroundColor: FIELD_BG })
  examDateField.setFontSize(10)
  
  drawText(page, ctx, "Expiration Date:", 230, y)
  const expDateField = ctx.form.createTextField("med_exp_date")
  expDateField.addToPage(page, { x: 325, y: y - 4, width: 90, height: 16, backgroundColor: FIELD_BG })
  expDateField.setFontSize(10)
  
  // Certificate type
  y -= 30
  drawText(page, ctx, "Determination/Certificate Type:", MARGIN_LEFT, y, { bold: true })
  
  y -= 20
  drawCheckbox(page, ctx, "med_cert_a", "Meets standards in 49 CFR 391.41; qualified to drive", MARGIN_LEFT, y)
  
  y -= 18
  drawCheckbox(page, ctx, "med_cert_b", "Meets standards, but periodic monitoring required", MARGIN_LEFT, y)
  
  y -= 18
  drawCheckbox(page, ctx, "med_cert_c", "Medically unqualified to drive commercial motor vehicle", MARGIN_LEFT, y)
  
  y -= 18
  drawCheckbox(page, ctx, "med_cert_d", "Determination pending (needs additional tests)", MARGIN_LEFT, y)
  
  // Restrictions/Waivers
  y -= 30
  y = drawSectionHeader(page, ctx, "RESTRICTIONS / WAIVERS / EXEMPTIONS", y)
  
  y -= 10
  drawCheckbox(page, ctx, "med_restrict_none", "No restrictions or waivers", MARGIN_LEFT, y)
  
  y -= 18
  drawCheckbox(page, ctx, "med_restrict_glasses", "Corrective lenses required", MARGIN_LEFT, y)
  drawCheckbox(page, ctx, "med_restrict_hearing", "Hearing aid required", 250, y)
  
  y -= 18
  drawCheckbox(page, ctx, "med_restrict_accomp", "Accompanied by waiver/exemption documentation", MARGIN_LEFT, y)
  
  y -= 18
  drawCheckbox(page, ctx, "med_restrict_skill", "Skill Performance Evaluation Certificate", MARGIN_LEFT, y)
  
  y -= 22
  drawText(page, ctx, "Other Restrictions:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  const otherField = ctx.form.createTextField("med_other_restrict")
  otherField.addToPage(page, { x: 145, y: y - 4, width: 365, height: 16, backgroundColor: FIELD_BG })
  otherField.setFontSize(9)
  
  // Acknowledgment
  y -= 35
  y = drawSectionHeader(page, ctx, "DRIVER ACKNOWLEDGMENT", y)
  
  y -= 10
  const ackText = `I certify that I have provided a copy of my Medical Examiner's Certificate to Thind Transport LLC. I understand that I am responsible for maintaining a valid medical certificate and notifying the company before my current certificate expires.`
  y = drawInstructions(page, ctx, ackText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  y -= 20
  drawText(page, ctx, "Driver Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 130, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("med_driver_signature")
  sigField.addToPage(page, { x: 130, y: y - 2, width: 250, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 400, y)
  const signDateField = ctx.form.createTextField("med_sign_date")
  signDateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  signDateField.setFontSize(10)
  
  // Company use
  y -= 40
  drawText(page, ctx, "Copy of MEC received by:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  page.drawLine({
    start: { x: 180, y: y - 2 },
    end: { x: 350, y: y - 2 },
    thickness: 0.5,
    color: GRAY,
  })
  
  drawText(page, ctx, "Date:", 380, y, { size: FONT_SMALL, color: GRAY })
  const recDateField = ctx.form.createTextField("med_received_date")
  recDateField.addToPage(page, { x: 410, y: y - 4, width: 80, height: 14, backgroundColor: FIELD_BG })
  recDateField.setFontSize(9)
  
  return page
}

// Page 24: Medical Self-Certification
function buildMedicalSelfCertPage(ctx: PDFContext): PDFPage {
  const page = addPage(ctx)
  let y = drawCompanyHeader(page, ctx, "DRIVER'S STATEMENT OF PHYSICAL FITNESS")
  
  y -= 5
  y = drawSectionHeader(page, ctx, "SELF-CERTIFICATION OF PHYSICAL CONDITION", y)
  
  const introText = `This statement must be completed by the driver and kept in the driver qualification file.`
  
  y -= 5
  y = drawInstructions(page, ctx, introText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  // Driver info
  y -= 15
  drawText(page, ctx, "Driver Name:", MARGIN_LEFT, y)
  const nameField = ctx.form.createTextField("phys_driver_name")
  nameField.addToPage(page, { x: 130, y: y - 4, width: 380, height: 18, backgroundColor: FIELD_BG })
  nameField.setFontSize(10)
  
  // Medical questions
  y -= 35
  y = drawSectionHeader(page, ctx, "HEALTH QUESTIONS", y)
  
  const questions = [
    { id: "q1", text: "1. Do you have any loss of, or impairment of, a hand, finger, arm, foot, leg, or other limb?" },
    { id: "q2", text: "2. Do you have an established medical history or clinical diagnosis of diabetes requiring insulin?" },
    { id: "q3", text: "3. Do you have a current clinical diagnosis of myocardial infarction, angina, or other heart disease?" },
    { id: "q4", text: "4. Do you have a history of or currently have high blood pressure likely to affect safe driving?" },
    { id: "q5", text: "5. Do you have a history of or currently have epilepsy, seizures, or any other condition affecting consciousness?" },
    { id: "q6", text: "6. Do you have a history of or currently have a mental, nervous, psychiatric disorder affecting driving?" },
    { id: "q7", text: "7. Do you have impaired vision that cannot be corrected to meet DOT standards?" },
    { id: "q8", text: "8. Do you have impaired hearing that cannot meet DOT standards with or without a hearing aid?" },
    { id: "q9", text: "9. Do you use any medication that may impair your ability to safely operate a commercial vehicle?" },
    { id: "q10", text: "10. Do you have any other condition that may affect your ability to safely operate a CMV?" },
  ]
  
  y -= 10
  for (const q of questions) {
    drawText(page, ctx, q.text, MARGIN_LEFT, y, { size: FONT_SMALL })
    drawCheckbox(page, ctx, `phys_${q.id}_yes`, "Yes", MARGIN_LEFT + 440, y - 2)
    drawCheckbox(page, ctx, `phys_${q.id}_no`, "No", MARGIN_LEFT + 490, y - 2)
    y -= 22
  }
  
  // Explanation
  y -= 10
  drawText(page, ctx, "If you answered YES to any question, please explain:", MARGIN_LEFT, y, { size: FONT_SMALL, color: GRAY })
  
  y -= 5
  const explainField = ctx.form.createTextField("phys_explanation")
  explainField.enableMultiline()
  explainField.addToPage(page, { x: MARGIN_LEFT, y: y - 50, width: CONTENT_WIDTH, height: 50, backgroundColor: FIELD_BG })
  explainField.setFontSize(9)
  
  // Certification
  y -= 75
  y = drawSectionHeader(page, ctx, "CERTIFICATION", y)
  
  y -= 10
  const certText = `I certify that the above answers are true and complete to the best of my knowledge. I understand that making false statements may result in denial of employment or immediate termination if already employed.`
  y = drawInstructions(page, ctx, certText, MARGIN_LEFT, y, CONTENT_WIDTH, FONT_SMALL)
  
  y -= 20
  drawText(page, ctx, "Driver Signature:", MARGIN_LEFT, y)
  page.drawLine({
    start: { x: 130, y: y - 2 },
    end: { x: 380, y: y - 2 },
    thickness: 1,
    color: BLACK,
  })
  const sigField = ctx.form.createTextField("phys_signature")
  sigField.addToPage(page, { x: 130, y: y - 2, width: 250, height: 22, borderWidth: 0 })
  sigField.setFontSize(14)
  
  drawText(page, ctx, "Date:", 400, y)
  const signDateField = ctx.form.createTextField("phys_sign_date")
  signDateField.addToPage(page, { x: 435, y: y - 4, width: 80, height: 16, backgroundColor: FIELD_BG })
  signDateField.setFontSize(10)
  
  return page
}

export function buildMedicalCertPages(ctx: PDFContext): PDFPage[] {
  return [
    buildMedicalInfoPage(ctx),
    buildMedicalSelfCertPage(ctx),
  ]
}

