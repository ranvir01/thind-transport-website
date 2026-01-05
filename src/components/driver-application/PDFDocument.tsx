"use client"

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { DriverApplicationData } from '@/types/driver-application'

// Helper to draw checkboxes
const drawCheckbox = async (
  page: any,
  x: number,
  y: number,
  checked: boolean,
  font: any,
  size: number = 10
) => {
  const boxSize = size
  page.drawRectangle({
    x,
    y: y - boxSize + 2,
    width: boxSize,
    height: boxSize,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  })
  if (checked) {
    page.drawText('X', {
      x: x + 2,
      y: y - boxSize + 4,
      size: size - 2,
      font,
      color: rgb(0, 0, 0),
    })
  }
}

// Helper to draw text with label
const drawLabelValue = (
  page: any,
  x: number,
  y: number,
  label: string,
  value: string,
  font: any,
  boldFont: any,
  labelSize: number = 9,
  valueSize: number = 10
) => {
  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  const labelWidth = boldFont.widthOfTextAtSize(label, labelSize)
  page.drawText(value || '', {
    x: x + labelWidth + 2,
    y,
    size: valueSize,
    font,
    color: rgb(0, 0, 0),
  })
}

// Helper to draw a horizontal line
const drawLine = (page: any, x1: number, y: number, x2: number, thickness: number = 1) => {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness,
    color: rgb(0, 0, 0),
  })
}

// Helper to draw section header
const drawSectionHeader = (
  page: any,
  y: number,
  title: string,
  font: any,
  pageWidth: number,
  margin: number
) => {
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: pageWidth - margin * 2,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText(title, {
    x: margin + 5,
    y: y - 12,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  })
  return y - 25
}

export async function generateApplicationPDF(formData: DriverApplicationData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const pageWidth = 612 // Letter size
  const pageHeight = 792
  const margin = 40
  const contentWidth = pageWidth - margin * 2

  // ===== PAGE 1: Cover/Checklist (Internal Use) =====
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // Header
  page.drawText('THIND TRANSPORT LLC', {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.8, 0.4, 0),
  })
  y -= 20
  page.drawText('DRIVER QUALIFICATION FILE CHECKLIST', {
    x: margin,
    y,
    size: 14,
    font: boldFont,
  })
  y -= 15
  page.drawText('(For Internal Use Only)', {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })
  y -= 30

  drawLine(page, margin, y, pageWidth - margin, 2)
  y -= 20

  page.drawText('Driver Name: ' + (formData.personalInfo?.firstName || '') + ' ' + (formData.personalInfo?.lastName || ''), {
    x: margin,
    y,
    size: 12,
    font: boldFont,
  })
  y -= 20

  page.drawText('Application Date: ' + (formData.applicationDate || new Date().toLocaleDateString()), {
    x: margin,
    y,
    size: 11,
    font,
  })
  y -= 30

  // Checklist items (blank for internal use)
  const checklistItems = [
    'Application for Employment (signed and dated)',
    'Copy of CDL (front and back)',
    'Copy of Medical Certificate',
    'Motor Vehicle Record (MVR)',
    'PSP Report Obtained',
    'Pre-Employment Drug Test Completed',
    'Previous Employer Verification (3 years)',
    'Road Test Certificate',
    'Driver Annual Review',
    'Clearinghouse Query Completed',
    'Safety Performance History (3 years)',
  ]

  page.drawText('Required Documents Checklist:', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
  })
  y -= 20

  for (const item of checklistItems) {
    await drawCheckbox(page, margin, y, false, font, 12)
    page.drawText(item, {
      x: margin + 20,
      y: y - 9,
      size: 10,
      font,
    })
    y -= 18
  }

  y -= 30
  page.drawText('Notes:', {
    x: margin,
    y,
    size: 10,
    font: boldFont,
  })
  y -= 5
  for (let i = 0; i < 5; i++) {
    y -= 20
    drawLine(page, margin, y, pageWidth - margin, 0.5)
  }

  // ===== PAGE 2: Applicant Information =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  // Header
  page.drawText('THIND TRANSPORT LLC', {
    x: pageWidth / 2 - 80,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.8, 0.4, 0),
  })
  y -= 18
  page.drawText('DRIVER APPLICATION FOR EMPLOYMENT', {
    x: pageWidth / 2 - 110,
    y,
    size: 12,
    font: boldFont,
  })
  y -= 14
  page.drawText('An Equal Opportunity Employer', {
    x: pageWidth / 2 - 65,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 25

  drawLine(page, margin, y, pageWidth - margin, 1)
  y -= 20

  // Position applying for
  page.drawText('Position Applying For:', {
    x: margin,
    y,
    size: 10,
    font: boldFont,
  })
  const positionY = y
  await drawCheckbox(page, margin + 120, positionY, formData.positionApplyingFor === 'contract_driver' || formData.positionApplyingFor === 'both', font)
  page.drawText('Contract Driver', { x: margin + 135, y: positionY - 8, size: 9, font })
  await drawCheckbox(page, margin + 230, positionY, formData.positionApplyingFor === 'contractors_driver' || formData.positionApplyingFor === 'both', font)
  page.drawText("Contractor's Driver", { x: margin + 245, y: positionY - 8, size: 9, font })
  y -= 25

  y = drawSectionHeader(page, y, 'PERSONAL INFORMATION', boldFont, pageWidth, margin)
  y -= 5

  // Personal info grid
  const col1 = margin
  const col2 = margin + contentWidth / 2

  drawLabelValue(page, col1, y, 'First Name: ', formData.personalInfo?.firstName || '', font, boldFont)
  drawLabelValue(page, col2, y, 'Last Name: ', formData.personalInfo?.lastName || '', font, boldFont)
  y -= 18

  drawLabelValue(page, col1, y, 'Date of Birth: ', formData.personalInfo?.dateOfBirth || '', font, boldFont)
  drawLabelValue(page, col2, y, 'Age: ', formData.personalInfo?.age || '', font, boldFont)
  y -= 18

  drawLabelValue(page, col1, y, 'SSN: ', formData.personalInfo?.socialSecurityNumber || '', font, boldFont)
  drawLabelValue(page, col2, y, 'Phone: ', formData.personalInfo?.phone || '', font, boldFont)
  y -= 18

  drawLabelValue(page, col1, y, 'Emergency Phone: ', formData.personalInfo?.emergencyPhone || '', font, boldFont)
  drawLabelValue(page, col2, y, 'Physical Exam Exp: ', formData.personalInfo?.physicalExamExpiration || '', font, boldFont)
  y -= 25

  // Current Address
  page.drawText('Current Address:', { x: margin, y, size: 10, font: boldFont })
  y -= 15
  const addr = formData.personalInfo?.currentAddress
  if (addr) {
    page.drawText(`${addr.street}`, { x: margin + 10, y, size: 9, font })
    y -= 13
    page.drawText(`${addr.city}, ${addr.state} ${addr.zip}`, { x: margin + 10, y, size: 9, font })
    y -= 13
    page.drawText(`From: ${addr.from}  To: ${addr.to}`, { x: margin + 10, y, size: 9, font })
    y -= 18
  }

  // Previous Addresses
  if (formData.personalInfo?.previousAddresses && formData.personalInfo.previousAddresses.length > 0) {
    page.drawText('Previous Addresses (Past 3 Years):', { x: margin, y, size: 10, font: boldFont })
    y -= 15
    for (const prevAddr of formData.personalInfo.previousAddresses) {
      page.drawText(`${prevAddr.street}, ${prevAddr.city}, ${prevAddr.state} ${prevAddr.zip}`, { x: margin + 10, y, size: 9, font })
      y -= 12
      page.drawText(`From: ${prevAddr.from}  To: ${prevAddr.to}`, { x: margin + 10, y, size: 9, font })
      y -= 15
    }
  }
  y -= 10

  // Education
  page.drawText('Education (Circle Highest Grade Completed):', { x: margin, y, size: 10, font: boldFont })
  y -= 15
  const edu = (formData.personalInfo as any)?.education
  page.drawText(`Grade School: ${edu?.gradeSchool || 12}   College: ${edu?.college || 0} years   Post Graduate: ${edu?.postGraduate || 0} years`, {
    x: margin + 10,
    y,
    size: 9,
    font,
  })
  y -= 20

  // Worked for company before
  page.drawText('Have you worked for this company before?', { x: margin, y, size: 10, font: boldFont })
  await drawCheckbox(page, margin + 230, y + 8, formData.personalInfo?.workedForCompanyBefore === 'true', font)
  page.drawText('Yes', { x: margin + 245, y, size: 9, font })
  await drawCheckbox(page, margin + 280, y + 8, formData.personalInfo?.workedForCompanyBefore !== 'true', font)
  page.drawText('No', { x: margin + 295, y, size: 9, font })

  // ===== PAGE 3: Employment History =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  page.drawText('THIND TRANSPORT LLC - DRIVER APPLICATION', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
  })
  page.drawText('Page 3', {
    x: pageWidth - margin - 40,
    y,
    size: 10,
    font,
  })
  y -= 25

  y = drawSectionHeader(page, y, 'EMPLOYMENT HISTORY (Past 3 Years + 10 Years Commercial Driving)', boldFont, pageWidth, margin)
  y -= 10

  const entries = formData.employmentHistory?.entries || []
  for (let i = 0; i < entries.length && y > 100; i++) {
    const entry = entries[i]
    
    // Entry header
    page.drawRectangle({
      x: margin,
      y: y - 12,
      width: contentWidth,
      height: 15,
      color: entry.isUnemployment ? rgb(1, 0.95, 0.8) : entry.isSelfEmployment ? rgb(0.9, 1, 0.9) : rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    })
    page.drawText(`${i + 1}. ${entry.isUnemployment ? 'UNEMPLOYMENT PERIOD' : entry.isSelfEmployment ? 'SELF-EMPLOYMENT' : entry.employerName}`, {
      x: margin + 5,
      y: y - 10,
      size: 10,
      font: boldFont,
    })
    y -= 20

    // Entry details
    drawLabelValue(page, margin + 10, y, 'From: ', entry.fromDate, font, boldFont)
    drawLabelValue(page, margin + 100, y, 'To: ', entry.toDate, font, boldFont)
    if (!entry.isUnemployment) {
      drawLabelValue(page, margin + 200, y, 'Phone: ', entry.phone, font, boldFont)
    }
    y -= 14

    if (!entry.isUnemployment) {
      drawLabelValue(page, margin + 10, y, 'Position: ', entry.position, font, boldFont)
      y -= 14
      drawLabelValue(page, margin + 10, y, 'Address: ', entry.address, font, boldFont)
      y -= 14
    }
    
    drawLabelValue(page, margin + 10, y, 'Reason for Leaving: ', entry.reasonForLeaving || 'N/A', font, boldFont)
    y -= 14

    if (!entry.isUnemployment) {
      await drawCheckbox(page, margin + 10, y + 8, entry.subjectToFMCSR || false, font)
      page.drawText('Subject to FMCSRs', { x: margin + 25, y, size: 8, font })
      await drawCheckbox(page, margin + 150, y + 8, entry.safetyFunctioning || false, font)
      page.drawText('Safety-sensitive function (DOT testing)', { x: margin + 165, y, size: 8, font })
      y -= 14
    }
    y -= 10
  }

  // ===== PAGE 4: Driving Record =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  page.drawText('THIND TRANSPORT LLC - DRIVER APPLICATION', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
  })
  page.drawText('Page 4', {
    x: pageWidth - margin - 40,
    y,
    size: 10,
    font,
  })
  y -= 25

  y = drawSectionHeader(page, y, 'CDL LICENSE INFORMATION', boldFont, pageWidth, margin)
  y -= 10

  const licenses = formData.drivingRecord?.cdlLicenses || []
  for (const license of licenses) {
    drawLabelValue(page, margin, y, 'License #: ', license.licenseNumber, font, boldFont)
    drawLabelValue(page, margin + 180, y, 'State: ', license.state, font, boldFont)
    drawLabelValue(page, margin + 280, y, 'Type: ', license.type, font, boldFont)
    y -= 15
    drawLabelValue(page, margin, y, 'Endorsements: ', license.endorsements || 'None', font, boldFont)
    drawLabelValue(page, margin + 200, y, 'Expiration: ', license.expirationDate, font, boldFont)
    y -= 20
  }

  y -= 10
  y = drawSectionHeader(page, y, 'LICENSE HISTORY', boldFont, pageWidth, margin)
  y -= 10

  const questions = [
    { label: 'Have you ever been denied a license?', value: formData.drivingRecord?.deniedLicense, explanation: formData.drivingRecord?.deniedLicenseExplanation },
    { label: 'Has any license been suspended or revoked?', value: formData.drivingRecord?.suspendedLicense, explanation: formData.drivingRecord?.suspendedLicenseExplanation },
    { label: 'Have you ever been convicted of a felony?', value: formData.drivingRecord?.felonyConviction, explanation: formData.drivingRecord?.felonyConvictionExplanation },
  ]

  for (const q of questions) {
    page.drawText(q.label, { x: margin, y, size: 9, font })
    await drawCheckbox(page, margin + 280, y + 8, q.value === true, font)
    page.drawText('Yes', { x: margin + 295, y, size: 9, font })
    await drawCheckbox(page, margin + 330, y + 8, q.value !== true, font)
    page.drawText('No', { x: margin + 345, y, size: 9, font })
    y -= 14
    if (q.value && q.explanation) {
      page.drawText(`Explanation: ${q.explanation}`, { x: margin + 20, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) })
      y -= 14
    }
  }

  y -= 10
  y = drawSectionHeader(page, y, 'ACCIDENT RECORD (Past 3 Years)', boldFont, pageWidth, margin)
  y -= 10

  const accidents = formData.drivingRecord?.accidents || []
  if (accidents.length === 0) {
    page.drawText('No accidents reported', { x: margin + 10, y, size: 9, font, color: rgb(0.4, 0.6, 0.4) })
    y -= 15
  } else {
    // Table header
    page.drawText('Date', { x: margin, y, size: 8, font: boldFont })
    page.drawText('Location', { x: margin + 70, y, size: 8, font: boldFont })
    page.drawText('Nature of Accident', { x: margin + 180, y, size: 8, font: boldFont })
    page.drawText('Fatalities', { x: margin + 370, y, size: 8, font: boldFont })
    page.drawText('Injuries', { x: margin + 430, y, size: 8, font: boldFont })
    y -= 12
    drawLine(page, margin, y, pageWidth - margin, 0.5)
    y -= 10

    for (const acc of accidents) {
      page.drawText(acc.date || '', { x: margin, y, size: 8, font })
      page.drawText(acc.location || '', { x: margin + 70, y, size: 8, font })
      page.drawText((acc.details || '').slice(0, 30), { x: margin + 180, y, size: 8, font })
      page.drawText(acc.fatalities || '0', { x: margin + 380, y, size: 8, font })
      page.drawText(acc.injuries || '0', { x: margin + 440, y, size: 8, font })
      y -= 12
    }
  }

  y -= 10
  y = drawSectionHeader(page, y, 'TRAFFIC CONVICTIONS (Past 3 Years)', boldFont, pageWidth, margin)
  y -= 10

  const violations = formData.drivingRecord?.violations || []
  if (violations.length === 0) {
    page.drawText('No traffic convictions reported', { x: margin + 10, y, size: 9, font, color: rgb(0.4, 0.6, 0.4) })
  } else {
    page.drawText('Date', { x: margin, y, size: 8, font: boldFont })
    page.drawText('Location', { x: margin + 70, y, size: 8, font: boldFont })
    page.drawText('Charge', { x: margin + 200, y, size: 8, font: boldFont })
    page.drawText('Penalty', { x: margin + 380, y, size: 8, font: boldFont })
    y -= 12
    drawLine(page, margin, y, pageWidth - margin, 0.5)
    y -= 10

    for (const viol of violations) {
      page.drawText(viol.date || '', { x: margin, y, size: 8, font })
      page.drawText(viol.location || '', { x: margin + 70, y, size: 8, font })
      page.drawText((viol.charge || '').slice(0, 25), { x: margin + 200, y, size: 8, font })
      page.drawText((viol.penalty || '').slice(0, 20), { x: margin + 380, y, size: 8, font })
      y -= 12
    }
  }

  // ===== PAGE 5: Experience & Qualifications =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  page.drawText('THIND TRANSPORT LLC - DRIVER APPLICATION', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
  })
  page.drawText('Page 5', {
    x: pageWidth - margin - 40,
    y,
    size: 10,
    font,
  })
  y -= 25

  y = drawSectionHeader(page, y, 'DRIVING EXPERIENCE', boldFont, pageWidth, margin)
  y -= 10

  // Table header
  page.drawText('Class of Equipment', { x: margin, y, size: 8, font: boldFont })
  page.drawText('Type', { x: margin + 140, y, size: 8, font: boldFont })
  page.drawText('From', { x: margin + 240, y, size: 8, font: boldFont })
  page.drawText('To', { x: margin + 300, y, size: 8, font: boldFont })
  page.drawText('Approx. Miles', { x: margin + 360, y, size: 8, font: boldFont })
  y -= 12
  drawLine(page, margin, y, pageWidth - margin, 0.5)
  y -= 10

  const experiences = formData.experienceQualifications?.drivingExperience || []
  for (const exp of experiences) {
    page.drawText(exp.classOfEquipment || '', { x: margin, y, size: 8, font })
    page.drawText(exp.typeOfEquipment || '', { x: margin + 140, y, size: 8, font })
    page.drawText(exp.dateFrom || '', { x: margin + 240, y, size: 8, font })
    page.drawText(exp.dateTo || '', { x: margin + 300, y, size: 8, font })
    page.drawText(exp.approximateMiles || '', { x: margin + 360, y, size: 8, font })
    y -= 14
  }

  y -= 15
  page.drawText('States Operated In (Past 5 Years):', { x: margin, y, size: 10, font: boldFont })
  y -= 15
  const states = formData.experienceQualifications?.statesOperated || []
  page.drawText(states.join(', ') || 'None specified', { x: margin + 10, y, size: 9, font })

  y -= 25
  y = drawSectionHeader(page, y, 'TRAINING & QUALIFICATIONS', boldFont, pageWidth, margin)
  y -= 10

  const trainingFields = [
    { label: 'Special Courses or Training:', value: formData.experienceQualifications?.specialCourses },
    { label: 'Safe Driving Awards:', value: formData.experienceQualifications?.safetyAwards },
    { label: 'Other Training/Courses:', value: formData.experienceQualifications?.otherTraining },
    { label: 'Special Equipment Experience:', value: formData.experienceQualifications?.specialEquipment },
  ]

  for (const field of trainingFields) {
    page.drawText(field.label, { x: margin, y, size: 9, font: boldFont })
    y -= 12
    page.drawText(field.value || 'None', { x: margin + 10, y, size: 8, font })
    y -= 18
  }

  // ===== PAGE 6: PSP Authorization =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  page.drawText('THIND TRANSPORT LLC - DRIVER APPLICATION', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
  })
  page.drawText('Page 6', {
    x: pageWidth - margin - 40,
    y,
    size: 10,
    font,
  })
  y -= 25

  y = drawSectionHeader(page, y, 'PRE-EMPLOYMENT SCREENING PROGRAM (PSP) AUTHORIZATION', boldFont, pageWidth, margin)
  y -= 15

  const pspText = `IMPORTANT NOTICE: In accordance with 49 CFR 391.23(d) and FMCSA's Pre-Employment Screening Program (PSP), Thind Transport LLC is required to inform you that:

• The prospective employer may access the PSP online service to check your DOT safety performance history.
• The PSP report will contain your crash and roadside inspection history for the past 5 and 3 years, respectively.
• You have the right to review your PSP report at www.psp.fmcsa.dot.gov.
• If you believe the information is inaccurate, you may submit a DataQs request at dataqs.fmcsa.dot.gov.`

  const lines = pspText.split('\n')
  for (const line of lines) {
    page.drawText(line, { x: margin, y, size: 8, font, maxWidth: contentWidth })
    y -= 12
  }

  y -= 15
  page.drawText('ACKNOWLEDGEMENTS:', { x: margin, y, size: 10, font: boldFont })
  y -= 18

  const acknowledgements = [
    { text: 'I acknowledge receipt of the FMCSA PSP Disclosure', checked: formData.pspAuthorization?.acknowledgeDisclosure },
    { text: 'I authorize Thind Transport LLC to access my PSP records', checked: formData.pspAuthorization?.authorizeBackgroundCheck },
    { text: 'I understand I may request data correction through DataQs', checked: formData.pspAuthorization?.understandDataQs },
    { text: 'I understand crash data will be displayed for past 5 years', checked: formData.pspAuthorization?.understandCrashDisplay },
    { text: 'I understand inspection data will be displayed for past 3 years', checked: formData.pspAuthorization?.understandInspectionDisplay },
    { text: 'I acknowledge the ADA Notice to Applicant', checked: formData.pspAuthorization?.acknowledgeADANotice },
    { text: 'I certify all information provided is true and complete', checked: formData.pspAuthorization?.certifyInformationTrue },
    { text: 'I authorize investigation of my background and records', checked: formData.pspAuthorization?.authorizeInvestigation },
  ]

  for (const ack of acknowledgements) {
    await drawCheckbox(page, margin, y + 8, ack.checked || false, font)
    page.drawText(ack.text, { x: margin + 18, y, size: 9, font })
    y -= 16
  }

  y -= 20
  y = drawSectionHeader(page, y, 'APPLICANT SIGNATURE', boldFont, pageWidth, margin)
  y -= 15

  page.drawText('I certify that all information provided in this application is true and complete to the best of my knowledge.', {
    x: margin,
    y,
    size: 9,
    font,
  })
  y -= 12
  page.drawText('I understand that false statements or omissions may disqualify me from employment or result in termination.', {
    x: margin,
    y,
    size: 9,
    font,
  })

  y -= 35
  page.drawText('Signature:', { x: margin, y, size: 10, font: boldFont })
  page.drawText(formData.pspAuthorization?.fullName || '', { x: margin + 70, y, size: 14, font, color: rgb(0, 0, 0.6) })
  drawLine(page, margin + 70, y - 3, margin + 300, 1)

  page.drawText('Date:', { x: margin + 350, y, size: 10, font: boldFont })
  page.drawText(formData.pspAuthorization?.signatureDate || '', { x: margin + 385, y, size: 10, font })
  drawLine(page, margin + 385, y - 3, pageWidth - margin, 1)

  // ===== PAGE 7: Road Test (Internal Use - Blank) =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  page.drawText('THIND TRANSPORT LLC', { x: margin, y, size: 14, font: boldFont, color: rgb(0.8, 0.4, 0) })
  y -= 20
  page.drawText('ROAD TEST EXAMINATION CERTIFICATE', { x: margin, y, size: 12, font: boldFont })
  y -= 15
  page.drawText('(For Internal Use Only - To be completed by examiner)', { x: margin, y, size: 10, font, color: rgb(0.5, 0.5, 0.5) })
  y -= 30

  drawLine(page, margin, y, pageWidth - margin, 1)
  y -= 20

  page.drawText('Driver Name: ' + (formData.personalInfo?.firstName || '') + ' ' + (formData.personalInfo?.lastName || ''), {
    x: margin,
    y,
    size: 11,
    font,
  })
  y -= 20

  const roadTestItems = [
    'Pre-trip Inspection',
    'Coupling/Uncoupling',
    'Placing Equipment in Operation',
    'Use of Vehicle Controls',
    'Backing and Parking',
    'Driving in Traffic',
    'Turning',
    'Passing',
    'Use of Signals',
    'Railroad Crossing',
    'Post-trip Inspection',
  ]

  for (const item of roadTestItems) {
    await drawCheckbox(page, margin, y + 8, false, font)
    page.drawText(item, { x: margin + 20, y, size: 10, font })
    page.drawText('Pass / Fail', { x: margin + 250, y, size: 9, font, color: rgb(0.6, 0.6, 0.6) })
    drawLine(page, margin + 300, y - 2, pageWidth - margin, 0.5)
    y -= 22
  }

  y -= 30
  page.drawText('Road Test Result:', { x: margin, y, size: 10, font: boldFont })
  await drawCheckbox(page, margin + 110, y + 8, false, font)
  page.drawText('PASS', { x: margin + 125, y, size: 10, font })
  await drawCheckbox(page, margin + 180, y + 8, false, font)
  page.drawText('FAIL', { x: margin + 195, y, size: 10, font })

  y -= 40
  page.drawText('Examiner Name: ___________________________', { x: margin, y, size: 10, font })
  y -= 25
  page.drawText('Examiner Signature: ________________________  Date: ______________', { x: margin, y, size: 10, font })

  // Return the PDF bytes
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

