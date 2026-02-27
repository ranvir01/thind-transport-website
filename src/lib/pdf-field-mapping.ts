/**
 * PDF Field Mapping Configuration
 * 
 * This file defines the coordinates for placing text on the flat PDF template.
 * Coordinates are in PDF points (72 points = 1 inch), measured from bottom-left.
 * Standard Letter size: 612 x 792 points
 * 
 * IMPORTANT: These coordinates need to be calibrated to match the actual PDF layout.
 * After initial implementation, fine-tune by generating test PDFs and adjusting values.
 */

import type { DriverApplicationData } from '@/types/driver-application'

export interface FieldPlacement {
  page: number          // 0-indexed page number
  x: number            // X coordinate from left
  y: number            // Y coordinate from bottom
  fontSize?: number    // Font size (default 10)
  maxWidth?: number    // Max width for text wrapping
  isCheckbox?: boolean // If true, draw a check mark instead of text
}

export interface FieldMapping {
  [key: string]: FieldPlacement
}

// Page dimensions for reference (from PDF analysis)
export const PAGE_DIMENSIONS = {
  width: 612,
  height: 792
}

// Helper to calculate Y from top (more intuitive)
const fromTop = (y: number) => PAGE_DIMENSIONS.height - y

/**
 * Field placements for the Thind Transport Application PDF
 * Page 0 = Cover/Checklist (internal use - skip)
 * Page 1 = Applicant Information
 * Pages 2-3 = Employment History
 * Page 4 = Accident/Violation Record
 * Page 5 = CDL/License Info
 * Page 6 = Driving Experience
 * Page 7 = States/Training
 * Pages 8-21 = PSP Authorization
 * Pages 22-24 = Road Test/Internal
 */
export const FIELD_PLACEMENTS: FieldMapping = {
  // === PAGE 1: Applicant Information ===
  // Position checkboxes (top of form)
  'positionContractDriver': { page: 1, x: 180, y: fromTop(95), isCheckbox: true },
  'positionContractorsDriver': { page: 1, x: 320, y: fromTop(95), isCheckbox: true },
  
  // Application date
  'applicationDate': { page: 1, x: 480, y: fromTop(95), fontSize: 9 },
  
  // Personal info section
  'lastName': { page: 1, x: 100, y: fromTop(140), fontSize: 10, maxWidth: 150 },
  'firstName': { page: 1, x: 280, y: fromTop(140), fontSize: 10, maxWidth: 150 },
  'middleName': { page: 1, x: 450, y: fromTop(140), fontSize: 10, maxWidth: 100 },
  
  'dateOfBirth': { page: 1, x: 100, y: fromTop(170), fontSize: 10 },
  'age': { page: 1, x: 220, y: fromTop(170), fontSize: 10 },
  'ssn': { page: 1, x: 330, y: fromTop(170), fontSize: 10 },
  
  'phone': { page: 1, x: 100, y: fromTop(200), fontSize: 10 },
  'emergencyPhone': { page: 1, x: 300, y: fromTop(200), fontSize: 10 },
  
  'physicalExamExpiration': { page: 1, x: 480, y: fromTop(200), fontSize: 9 },
  
  // Current Address
  'currentAddress.street': { page: 1, x: 100, y: fromTop(240), fontSize: 9, maxWidth: 400 },
  'currentAddress.city': { page: 1, x: 100, y: fromTop(265), fontSize: 9, maxWidth: 150 },
  'currentAddress.state': { page: 1, x: 280, y: fromTop(265), fontSize: 9 },
  'currentAddress.zip': { page: 1, x: 350, y: fromTop(265), fontSize: 9 },
  'currentAddress.from': { page: 1, x: 430, y: fromTop(265), fontSize: 9 },
  'currentAddress.to': { page: 1, x: 510, y: fromTop(265), fontSize: 9 },
  
  // Previous Address 1
  'previousAddress1.street': { page: 1, x: 100, y: fromTop(300), fontSize: 9, maxWidth: 400 },
  'previousAddress1.city': { page: 1, x: 100, y: fromTop(320), fontSize: 9, maxWidth: 150 },
  'previousAddress1.state': { page: 1, x: 280, y: fromTop(320), fontSize: 9 },
  'previousAddress1.zip': { page: 1, x: 350, y: fromTop(320), fontSize: 9 },
  'previousAddress1.from': { page: 1, x: 430, y: fromTop(320), fontSize: 9 },
  'previousAddress1.to': { page: 1, x: 510, y: fromTop(320), fontSize: 9 },
  
  // Previous Address 2
  'previousAddress2.street': { page: 1, x: 100, y: fromTop(355), fontSize: 9, maxWidth: 400 },
  'previousAddress2.city': { page: 1, x: 100, y: fromTop(375), fontSize: 9, maxWidth: 150 },
  'previousAddress2.state': { page: 1, x: 280, y: fromTop(375), fontSize: 9 },
  'previousAddress2.zip': { page: 1, x: 350, y: fromTop(375), fontSize: 9 },
  'previousAddress2.from': { page: 1, x: 430, y: fromTop(375), fontSize: 9 },
  'previousAddress2.to': { page: 1, x: 510, y: fromTop(375), fontSize: 9 },
  
  // Previous Address 3
  'previousAddress3.street': { page: 1, x: 100, y: fromTop(410), fontSize: 9, maxWidth: 400 },
  'previousAddress3.city': { page: 1, x: 100, y: fromTop(430), fontSize: 9, maxWidth: 150 },
  'previousAddress3.state': { page: 1, x: 280, y: fromTop(430), fontSize: 9 },
  'previousAddress3.zip': { page: 1, x: 350, y: fromTop(430), fontSize: 9 },
  'previousAddress3.from': { page: 1, x: 430, y: fromTop(430), fontSize: 9 },
  'previousAddress3.to': { page: 1, x: 510, y: fromTop(430), fontSize: 9 },
  
  // Worked for company before
  'workedForCompanyBefore.yes': { page: 1, x: 250, y: fromTop(470), isCheckbox: true },
  'workedForCompanyBefore.no': { page: 1, x: 320, y: fromTop(470), isCheckbox: true },
  'previousWorkDates.from': { page: 1, x: 400, y: fromTop(470), fontSize: 9 },
  'previousWorkDates.to': { page: 1, x: 480, y: fromTop(470), fontSize: 9 },
  'reasonForLeaving': { page: 1, x: 100, y: fromTop(500), fontSize: 9, maxWidth: 450 },
  
  // Education (circles for grade levels)
  'education.gradeSchool': { page: 1, x: 200, y: fromTop(550), fontSize: 9 },
  'education.college': { page: 1, x: 350, y: fromTop(550), fontSize: 9 },
  'education.postGraduate': { page: 1, x: 480, y: fromTop(550), fontSize: 9 },
  
  // === PAGE 2: Employment History - Entry 1 ===
  'employment1.dates': { page: 2, x: 50, y: fromTop(100), fontSize: 9 },
  'employment1.employer': { page: 2, x: 50, y: fromTop(125), fontSize: 9, maxWidth: 200 },
  'employment1.address': { page: 2, x: 50, y: fromTop(150), fontSize: 8, maxWidth: 250 },
  'employment1.phone': { page: 2, x: 310, y: fromTop(150), fontSize: 9 },
  'employment1.position': { page: 2, x: 50, y: fromTop(175), fontSize: 9, maxWidth: 150 },
  'employment1.reasonLeaving': { page: 2, x: 200, y: fromTop(175), fontSize: 8, maxWidth: 200 },
  'employment1.fmcsr.yes': { page: 2, x: 420, y: fromTop(175), isCheckbox: true },
  'employment1.fmcsr.no': { page: 2, x: 470, y: fromTop(175), isCheckbox: true },
  'employment1.safety.yes': { page: 2, x: 520, y: fromTop(175), isCheckbox: true },
  'employment1.safety.no': { page: 2, x: 560, y: fromTop(175), isCheckbox: true },
  
  // Employment Entry 2
  'employment2.dates': { page: 2, x: 50, y: fromTop(220), fontSize: 9 },
  'employment2.employer': { page: 2, x: 50, y: fromTop(245), fontSize: 9, maxWidth: 200 },
  'employment2.address': { page: 2, x: 50, y: fromTop(270), fontSize: 8, maxWidth: 250 },
  'employment2.phone': { page: 2, x: 310, y: fromTop(270), fontSize: 9 },
  'employment2.position': { page: 2, x: 50, y: fromTop(295), fontSize: 9, maxWidth: 150 },
  'employment2.reasonLeaving': { page: 2, x: 200, y: fromTop(295), fontSize: 8, maxWidth: 200 },
  'employment2.fmcsr.yes': { page: 2, x: 420, y: fromTop(295), isCheckbox: true },
  'employment2.fmcsr.no': { page: 2, x: 470, y: fromTop(295), isCheckbox: true },
  'employment2.safety.yes': { page: 2, x: 520, y: fromTop(295), isCheckbox: true },
  'employment2.safety.no': { page: 2, x: 560, y: fromTop(295), isCheckbox: true },
  
  // Employment Entry 3
  'employment3.dates': { page: 2, x: 50, y: fromTop(340), fontSize: 9 },
  'employment3.employer': { page: 2, x: 50, y: fromTop(365), fontSize: 9, maxWidth: 200 },
  'employment3.address': { page: 2, x: 50, y: fromTop(390), fontSize: 8, maxWidth: 250 },
  'employment3.phone': { page: 2, x: 310, y: fromTop(390), fontSize: 9 },
  'employment3.position': { page: 2, x: 50, y: fromTop(415), fontSize: 9, maxWidth: 150 },
  'employment3.reasonLeaving': { page: 2, x: 200, y: fromTop(415), fontSize: 8, maxWidth: 200 },
  'employment3.fmcsr.yes': { page: 2, x: 420, y: fromTop(415), isCheckbox: true },
  'employment3.fmcsr.no': { page: 2, x: 470, y: fromTop(415), isCheckbox: true },
  'employment3.safety.yes': { page: 2, x: 520, y: fromTop(415), isCheckbox: true },
  'employment3.safety.no': { page: 2, x: 560, y: fromTop(415), isCheckbox: true },
  
  // === PAGE 3: More Employment History ===
  'employment4.dates': { page: 3, x: 50, y: fromTop(100), fontSize: 9 },
  'employment4.employer': { page: 3, x: 50, y: fromTop(125), fontSize: 9, maxWidth: 200 },
  'employment4.address': { page: 3, x: 50, y: fromTop(150), fontSize: 8, maxWidth: 250 },
  'employment4.phone': { page: 3, x: 310, y: fromTop(150), fontSize: 9 },
  'employment4.position': { page: 3, x: 50, y: fromTop(175), fontSize: 9, maxWidth: 150 },
  'employment4.reasonLeaving': { page: 3, x: 200, y: fromTop(175), fontSize: 8, maxWidth: 200 },
  
  // === PAGE 4: Accident Record ===
  'accident1.date': { page: 4, x: 50, y: fromTop(150), fontSize: 9 },
  'accident1.location': { page: 4, x: 120, y: fromTop(150), fontSize: 8, maxWidth: 120 },
  'accident1.details': { page: 4, x: 250, y: fromTop(150), fontSize: 8, maxWidth: 200 },
  'accident1.fatalities': { page: 4, x: 460, y: fromTop(150), fontSize: 9 },
  'accident1.injuries': { page: 4, x: 520, y: fromTop(150), fontSize: 9 },
  
  'accident2.date': { page: 4, x: 50, y: fromTop(175), fontSize: 9 },
  'accident2.location': { page: 4, x: 120, y: fromTop(175), fontSize: 8, maxWidth: 120 },
  'accident2.details': { page: 4, x: 250, y: fromTop(175), fontSize: 8, maxWidth: 200 },
  'accident2.fatalities': { page: 4, x: 460, y: fromTop(175), fontSize: 9 },
  'accident2.injuries': { page: 4, x: 520, y: fromTop(175), fontSize: 9 },
  
  'accident3.date': { page: 4, x: 50, y: fromTop(200), fontSize: 9 },
  'accident3.location': { page: 4, x: 120, y: fromTop(200), fontSize: 8, maxWidth: 120 },
  'accident3.details': { page: 4, x: 250, y: fromTop(200), fontSize: 8, maxWidth: 200 },
  'accident3.fatalities': { page: 4, x: 460, y: fromTop(200), fontSize: 9 },
  'accident3.injuries': { page: 4, x: 520, y: fromTop(200), fontSize: 9 },
  
  // Traffic Violations
  'violation1.date': { page: 4, x: 50, y: fromTop(300), fontSize: 9 },
  'violation1.location': { page: 4, x: 120, y: fromTop(300), fontSize: 8, maxWidth: 120 },
  'violation1.charge': { page: 4, x: 250, y: fromTop(300), fontSize: 8, maxWidth: 180 },
  'violation1.penalty': { page: 4, x: 450, y: fromTop(300), fontSize: 8, maxWidth: 100 },
  
  'violation2.date': { page: 4, x: 50, y: fromTop(325), fontSize: 9 },
  'violation2.location': { page: 4, x: 120, y: fromTop(325), fontSize: 8, maxWidth: 120 },
  'violation2.charge': { page: 4, x: 250, y: fromTop(325), fontSize: 8, maxWidth: 180 },
  'violation2.penalty': { page: 4, x: 450, y: fromTop(325), fontSize: 8, maxWidth: 100 },
  
  // === PAGE 5: CDL License Info ===
  'cdl1.number': { page: 5, x: 80, y: fromTop(130), fontSize: 10 },
  'cdl1.state': { page: 5, x: 250, y: fromTop(130), fontSize: 10 },
  'cdl1.type': { page: 5, x: 330, y: fromTop(130), fontSize: 10 },
  'cdl1.endorsements': { page: 5, x: 430, y: fromTop(130), fontSize: 10 },
  'cdl1.expiration': { page: 5, x: 520, y: fromTop(130), fontSize: 9 },
  
  // License History Questions
  'deniedLicense.yes': { page: 5, x: 450, y: fromTop(200), isCheckbox: true },
  'deniedLicense.no': { page: 5, x: 510, y: fromTop(200), isCheckbox: true },
  'deniedLicense.explanation': { page: 5, x: 80, y: fromTop(220), fontSize: 8, maxWidth: 450 },
  
  'suspendedLicense.yes': { page: 5, x: 450, y: fromTop(260), isCheckbox: true },
  'suspendedLicense.no': { page: 5, x: 510, y: fromTop(260), isCheckbox: true },
  'suspendedLicense.explanation': { page: 5, x: 80, y: fromTop(280), fontSize: 8, maxWidth: 450 },
  
  'felonyConviction.yes': { page: 5, x: 450, y: fromTop(320), isCheckbox: true },
  'felonyConviction.no': { page: 5, x: 510, y: fromTop(320), isCheckbox: true },
  'felonyConviction.explanation': { page: 5, x: 80, y: fromTop(340), fontSize: 8, maxWidth: 450 },
  
  // === PAGE 6: Driving Experience ===
  'experience1.class': { page: 6, x: 50, y: fromTop(130), fontSize: 9, maxWidth: 120 },
  'experience1.type': { page: 6, x: 180, y: fromTop(130), fontSize: 9, maxWidth: 100 },
  'experience1.from': { page: 6, x: 290, y: fromTop(130), fontSize: 9 },
  'experience1.to': { page: 6, x: 360, y: fromTop(130), fontSize: 9 },
  'experience1.miles': { page: 6, x: 440, y: fromTop(130), fontSize: 9 },
  
  'experience2.class': { page: 6, x: 50, y: fromTop(155), fontSize: 9, maxWidth: 120 },
  'experience2.type': { page: 6, x: 180, y: fromTop(155), fontSize: 9, maxWidth: 100 },
  'experience2.from': { page: 6, x: 290, y: fromTop(155), fontSize: 9 },
  'experience2.to': { page: 6, x: 360, y: fromTop(155), fontSize: 9 },
  'experience2.miles': { page: 6, x: 440, y: fromTop(155), fontSize: 9 },
  
  'experience3.class': { page: 6, x: 50, y: fromTop(180), fontSize: 9, maxWidth: 120 },
  'experience3.type': { page: 6, x: 180, y: fromTop(180), fontSize: 9, maxWidth: 100 },
  'experience3.from': { page: 6, x: 290, y: fromTop(180), fontSize: 9 },
  'experience3.to': { page: 6, x: 360, y: fromTop(180), fontSize: 9 },
  'experience3.miles': { page: 6, x: 440, y: fromTop(180), fontSize: 9 },
  
  // === PAGE 7: States and Training ===
  'statesOperated': { page: 7, x: 80, y: fromTop(130), fontSize: 9, maxWidth: 450 },
  'specialCourses': { page: 7, x: 80, y: fromTop(200), fontSize: 8, maxWidth: 450 },
  'safetyAwards': { page: 7, x: 80, y: fromTop(280), fontSize: 8, maxWidth: 450 },
  'otherTraining': { page: 7, x: 80, y: fromTop(360), fontSize: 8, maxWidth: 450 },
  'specialEquipment': { page: 7, x: 80, y: fromTop(440), fontSize: 8, maxWidth: 450 },
  
  // === SIGNATURE PAGES ===
  // PSP Authorization Signature (typically on page 8 or 9)
  'psp.signature': { page: 8, x: 100, y: fromTop(650), fontSize: 12 },
  'psp.signatureDate': { page: 8, x: 400, y: fromTop(650), fontSize: 10 },
  
  // Final Certification Signature (typically on last disclosure page)
  'certification.signature': { page: 21, x: 100, y: fromTop(650), fontSize: 12 },
  'certification.date': { page: 21, x: 400, y: fromTop(650), fontSize: 10 },
}

/**
 * Extract form data into field values for PDF placement
 */
export function mapFormDataToFields(formData: DriverApplicationData): Record<string, string | boolean> {
  const fields: Record<string, string | boolean> = {}
  
  // Position
  fields['positionContractDriver'] = formData.positionApplyingFor === 'contract_driver' || formData.positionApplyingFor === 'both'
  fields['positionContractorsDriver'] = formData.positionApplyingFor === 'contractors_driver' || formData.positionApplyingFor === 'both'
  
  // Application date
  fields['applicationDate'] = formData.applicationDate || new Date().toLocaleDateString()
  
  // Personal info
  if (formData.personalInfo) {
    fields['lastName'] = formData.personalInfo.lastName || ''
    fields['firstName'] = formData.personalInfo.firstName || ''
    fields['middleName'] = formData.personalInfo.middleName || ''
    fields['dateOfBirth'] = formData.personalInfo.dateOfBirth || ''
    fields['age'] = formData.personalInfo.age || ''
    fields['ssn'] = formData.personalInfo.socialSecurityNumber || ''
    fields['phone'] = formData.personalInfo.phone || ''
    fields['emergencyPhone'] = formData.personalInfo.emergencyPhone || ''
    fields['physicalExamExpiration'] = formData.personalInfo.physicalExamExpiration || ''
    
    // Current address
    if (formData.personalInfo.currentAddress) {
      fields['currentAddress.street'] = formData.personalInfo.currentAddress.street || ''
      fields['currentAddress.city'] = formData.personalInfo.currentAddress.city || ''
      fields['currentAddress.state'] = formData.personalInfo.currentAddress.state || ''
      fields['currentAddress.zip'] = formData.personalInfo.currentAddress.zip || ''
      fields['currentAddress.from'] = formData.personalInfo.currentAddress.from || ''
      fields['currentAddress.to'] = formData.personalInfo.currentAddress.to || ''
    }
    
    // Previous addresses
    const prevAddresses = formData.personalInfo.previousAddresses || []
    for (let i = 0; i < 3; i++) {
      const addr = prevAddresses[i]
      const prefix = `previousAddress${i + 1}`
      if (addr) {
        fields[`${prefix}.street`] = addr.street || ''
        fields[`${prefix}.city`] = addr.city || ''
        fields[`${prefix}.state`] = addr.state || ''
        fields[`${prefix}.zip`] = addr.zip || ''
        fields[`${prefix}.from`] = addr.from || ''
        fields[`${prefix}.to`] = addr.to || ''
      }
    }
    
    // Worked for company before
    fields['workedForCompanyBefore.yes'] = formData.personalInfo.workedForCompanyBefore === 'true'
    fields['workedForCompanyBefore.no'] = formData.personalInfo.workedForCompanyBefore !== 'true'
    
    if (formData.personalInfo.previousWorkDates) {
      fields['previousWorkDates.from'] = formData.personalInfo.previousWorkDates.from || ''
      fields['previousWorkDates.to'] = formData.personalInfo.previousWorkDates.to || ''
    }
    fields['reasonForLeaving'] = formData.personalInfo.reasonForLeaving || ''
    
    // Education
    const edu = (formData.personalInfo as any)?.education
    if (edu) {
      fields['education.gradeSchool'] = String(edu.gradeSchool || 12)
      fields['education.college'] = String(edu.college || 0)
      fields['education.postGraduate'] = String(edu.postGraduate || 0)
    }
  }
  
  // Employment history
  const entries = formData.employmentHistory?.entries || []
  for (let i = 0; i < entries.length && i < 5; i++) {
    const entry = entries[i]
    const prefix = `employment${i + 1}`
    fields[`${prefix}.dates`] = `${entry.fromDate} - ${entry.toDate}`
    fields[`${prefix}.employer`] = entry.employerName || ''
    fields[`${prefix}.address`] = entry.address || ''
    fields[`${prefix}.phone`] = entry.phone || ''
    fields[`${prefix}.position`] = entry.position || ''
    fields[`${prefix}.reasonLeaving`] = entry.reasonForLeaving || ''
    fields[`${prefix}.fmcsr.yes`] = entry.subjectToFMCSR === true
    fields[`${prefix}.fmcsr.no`] = entry.subjectToFMCSR !== true
    fields[`${prefix}.safety.yes`] = entry.safetyFunctioning === true
    fields[`${prefix}.safety.no`] = entry.safetyFunctioning !== true
  }
  
  // Accidents
  const accidents = formData.drivingRecord?.accidents || []
  for (let i = 0; i < accidents.length && i < 3; i++) {
    const acc = accidents[i]
    const prefix = `accident${i + 1}`
    fields[`${prefix}.date`] = acc.date || ''
    fields[`${prefix}.location`] = acc.location || ''
    fields[`${prefix}.details`] = acc.details || ''
    fields[`${prefix}.fatalities`] = acc.fatalities || '0'
    fields[`${prefix}.injuries`] = acc.injuries || '0'
  }
  
  // Violations
  const violations = formData.drivingRecord?.violations || []
  for (let i = 0; i < violations.length && i < 3; i++) {
    const viol = violations[i]
    const prefix = `violation${i + 1}`
    fields[`${prefix}.date`] = viol.date || ''
    fields[`${prefix}.location`] = viol.location || ''
    fields[`${prefix}.charge`] = viol.charge || ''
    fields[`${prefix}.penalty`] = viol.penalty || ''
  }
  
  // CDL License
  const licenses = formData.drivingRecord?.cdlLicenses || []
  if (licenses[0]) {
    fields['cdl1.number'] = licenses[0].licenseNumber || ''
    fields['cdl1.state'] = licenses[0].state || ''
    fields['cdl1.type'] = licenses[0].type || ''
    fields['cdl1.endorsements'] = licenses[0].endorsements || ''
    fields['cdl1.expiration'] = licenses[0].expirationDate || ''
  }
  
  // License history
  fields['deniedLicense.yes'] = formData.drivingRecord?.deniedLicense === true
  fields['deniedLicense.no'] = formData.drivingRecord?.deniedLicense !== true
  fields['deniedLicense.explanation'] = formData.drivingRecord?.deniedLicenseExplanation || ''
  
  fields['suspendedLicense.yes'] = formData.drivingRecord?.suspendedLicense === true
  fields['suspendedLicense.no'] = formData.drivingRecord?.suspendedLicense !== true
  fields['suspendedLicense.explanation'] = formData.drivingRecord?.suspendedLicenseExplanation || ''
  
  fields['felonyConviction.yes'] = formData.drivingRecord?.felonyConviction === true
  fields['felonyConviction.no'] = formData.drivingRecord?.felonyConviction !== true
  fields['felonyConviction.explanation'] = formData.drivingRecord?.felonyConvictionExplanation || ''
  
  // Experience
  const experiences = formData.experienceQualifications?.drivingExperience || []
  for (let i = 0; i < experiences.length && i < 4; i++) {
    const exp = experiences[i]
    const prefix = `experience${i + 1}`
    fields[`${prefix}.class`] = exp.classOfEquipment || ''
    fields[`${prefix}.type`] = exp.typeOfEquipment || ''
    fields[`${prefix}.from`] = exp.dateFrom || ''
    fields[`${prefix}.to`] = exp.dateTo || ''
    fields[`${prefix}.miles`] = exp.approximateMiles || ''
  }
  
  // States and training
  fields['statesOperated'] = (formData.experienceQualifications?.statesOperated || []).join(', ')
  fields['specialCourses'] = formData.experienceQualifications?.specialCourses || ''
  fields['safetyAwards'] = formData.experienceQualifications?.safetyAwards || ''
  fields['otherTraining'] = formData.experienceQualifications?.otherTraining || ''
  fields['specialEquipment'] = formData.experienceQualifications?.specialEquipment || ''
  
  // Signatures
  fields['psp.signature'] = formData.pspAuthorization?.fullName || ''
  fields['psp.signatureDate'] = formData.pspAuthorization?.signatureDate || ''
  fields['certification.signature'] = formData.pspAuthorization?.fullName || ''
  fields['certification.date'] = formData.pspAuthorization?.signatureDate || ''
  
  return fields
}

