/**
 * Thind Transport DOT Application PDF Generator
 * Generates a complete 25-page fillable PDF from scratch
 * Now supports pre-filling with form data
 */

import { createPDFContext, addPage, drawPageNumber, PDFContext } from './utils'
import type { DriverApplicationFormData } from '@/types/driver-application-form'

// Page builders
import { buildDQChecklistPage } from './pages/dq-checklist'
import { buildApplicantInfoPage } from './pages/applicant-info'
import { buildEmploymentHistoryPages } from './pages/employment-history'
import { buildAccidentsViolationsPage } from './pages/accidents-violations'
import { buildCDLInfoPage } from './pages/cdl-info'
import { buildDrivingExperiencePage } from './pages/driving-experience'
import { buildTrainingStatesPage } from './pages/training-states'
import { buildCertificationPage } from './pages/certification'
import { buildAuthorizationPages } from './pages/authorizations'
import { buildEmployerInquiryPages } from './pages/employer-inquiry'
import { buildAnnualReviewPages } from './pages/annual-review'
import { buildRoadTestPage } from './pages/road-test'
import { buildMedicalCertPages } from './pages/medical-cert'
import { buildInternalProcessPage } from './pages/internal-process'

/**
 * Pre-fill form fields with provided data
 */
function prefillFormFields(ctx: PDFContext, data: DriverApplicationFormData) {
  const form = ctx.form
  
  // Helper to safely set text field
  const setTextField = (fieldName: string, value: string | undefined) => {
    if (!value) return
    try {
      const field = form.getTextField(fieldName)
      if (field) {
        field.setText(value)
      }
    } catch (e) {
      // Field may not exist, ignore
    }
  }
  
  // Helper to safely set checkbox
  const setCheckbox = (fieldName: string, checked: boolean | undefined) => {
    if (checked === undefined) return
    try {
      const field = form.getCheckBox(fieldName)
      if (field && checked) {
        field.check()
      }
    } catch (e) {
      // Field may not exist, ignore
    }
  }
  
  // Application date
  setTextField('app_date', data.app_date || new Date().toLocaleDateString())
  
  // Personal Information
  if (data.personal) {
    setTextField('applicant_name', data.personal.applicant_name)
    setTextField('phone', data.personal.phone)
    setTextField('emergency_phone', data.personal.emergency_phone)
    setTextField('dob', data.personal.dob)
    setTextField('age', data.personal.age)
    setTextField('ssn', data.personal.ssn)
    setTextField('email', data.personal.email)
    setTextField('physical_exam_exp', data.personal.physical_exam_exp)
    setTextField('med_card_state', data.personal.med_card_state)
    
    // Position checkboxes
    setCheckbox('pos_contract_driver', data.personal.pos_contract_driver)
    setCheckbox('pos_contractors_driver', data.personal.pos_contractors_driver)
    setCheckbox('pos_company_driver', data.personal.pos_company_driver)
    
    // Legal status
    setCheckbox('legal_work_yes', data.personal.legal_work_yes)
    setCheckbox('legal_work_no', data.personal.legal_work_no)
    setCheckbox('age_21_yes', data.personal.age_21_yes)
    setCheckbox('age_21_no', data.personal.age_21_no)
    setCheckbox('english_yes', data.personal.english_yes)
    setCheckbox('english_no', data.personal.english_no)
  }
  
  // Address History
  if (data.address) {
    setTextField('addr1_street', data.address.addr1_street)
    setTextField('addr1_from', data.address.addr1_from)
    setTextField('addr1_to', data.address.addr1_to)
    setTextField('addr2_street', data.address.addr2_street)
    setTextField('addr2_from', data.address.addr2_from)
    setTextField('addr2_to', data.address.addr2_to)
    setTextField('addr3_street', data.address.addr3_street)
    setTextField('addr3_from', data.address.addr3_from)
    setTextField('addr3_to', data.address.addr3_to)
    
    setCheckbox('worked_before_yes', data.address.worked_before_yes)
    setCheckbox('worked_before_no', data.address.worked_before_no)
    setTextField('worked_before_from', data.address.worked_before_from)
    setTextField('worked_before_to', data.address.worked_before_to)
    setTextField('worked_before_reason', data.address.worked_before_reason)
  }
  
  // Employment History
  if (data.employment?.employers) {
    data.employment.employers.forEach((emp, i) => {
      const idx = i + 1
      setTextField(`emp${idx}_from`, emp.from)
      setTextField(`emp${idx}_to`, emp.to)
      setTextField(`emp${idx}_name`, emp.name)
      setTextField(`emp${idx}_address`, emp.address)
      setTextField(`emp${idx}_phone`, emp.phone)
      setTextField(`emp${idx}_position`, emp.position)
      setTextField(`emp${idx}_salary`, emp.salary)
      setTextField(`emp${idx}_supervisor`, emp.supervisor)
      setTextField(`emp${idx}_reason`, emp.reason)
      setCheckbox(`emp${idx}_fmcsr_yes`, emp.fmcsr_yes)
      setCheckbox(`emp${idx}_fmcsr_no`, emp.fmcsr_no)
      setCheckbox(`emp${idx}_drug_yes`, emp.drug_yes)
      setCheckbox(`emp${idx}_drug_no`, emp.drug_no)
    })
    setTextField('employment_gaps', data.employment.employment_gaps)
  }
  
  // Accidents
  if (data.accidents) {
    setCheckbox('no_accidents', data.accidents.no_accidents)
    data.accidents.accidents?.forEach((acc, i) => {
      const idx = i + 1
      setTextField(`acc${idx}_date`, acc.date)
      setTextField(`acc${idx}_nature`, acc.nature)
      setTextField(`acc${idx}_location`, acc.location)
      setTextField(`acc${idx}_fatalities`, acc.fatalities)
      setTextField(`acc${idx}_injuries`, acc.injuries)
      setTextField(`acc${idx}_hazmat`, acc.hazmat)
    })
  }
  
  // Traffic Violations
  if (data.traffic) {
    setCheckbox('no_violations', data.traffic.no_violations)
    data.traffic.violations?.forEach((viol, i) => {
      const idx = i + 1
      setTextField(`traffic${idx}_date`, viol.date)
      setTextField(`traffic${idx}_violation`, viol.violation)
      setTextField(`traffic${idx}_location`, viol.location)
      setTextField(`traffic${idx}_vehicle_type`, viol.vehicle_type)
      setTextField(`traffic${idx}_penalty`, viol.penalty)
    })
  }
  
  // CDL Information
  if (data.cdl) {
    data.cdl.licenses?.forEach((lic, i) => {
      const idx = i + 1
      setTextField(`lic${idx}_state`, lic.state)
      setTextField(`lic${idx}_number`, lic.number)
      setTextField(`lic${idx}_class`, lic.class)
      setTextField(`lic${idx}_endorsements`, lic.endorsements)
      setTextField(`lic${idx}_restrictions`, lic.restrictions)
      setTextField(`lic${idx}_exp`, lic.exp)
    })
    
    // Questions
    setCheckbox('denied_yes', data.cdl.denied_yes)
    setCheckbox('denied_no', data.cdl.denied_no)
    setCheckbox('suspended_yes', data.cdl.suspended_yes)
    setCheckbox('suspended_no', data.cdl.suspended_no)
    setCheckbox('felony_yes', data.cdl.felony_yes)
    setCheckbox('felony_no', data.cdl.felony_no)
    setCheckbox('dui_yes', data.cdl.dui_yes)
    setCheckbox('dui_no', data.cdl.dui_no)
    setCheckbox('failed_drug_yes', data.cdl.failed_drug_yes)
    setCheckbox('failed_drug_no', data.cdl.failed_drug_no)
    setTextField('abc_explanation', data.cdl.abc_explanation)
    
    // Medical
    setCheckbox('physical_condition_yes', data.cdl.physical_condition_yes)
    setCheckbox('physical_condition_no', data.cdl.physical_condition_no)
    setCheckbox('medications_yes', data.cdl.medications_yes)
    setCheckbox('medications_no', data.cdl.medications_no)
    setTextField('medical_explanation', data.cdl.medical_explanation)
  }
  
  // Driving Experience
  if (data.experience) {
    const expTypes = ['straight', 'semi', 'doubles', 'triples', 'bus', 'other1']
    expTypes.forEach(type => {
      setTextField(`exp_${type}_type`, (data.experience as any)[`exp_${type}_type`])
      setTextField(`exp_${type}_from`, (data.experience as any)[`exp_${type}_from`])
      setTextField(`exp_${type}_to`, (data.experience as any)[`exp_${type}_to`])
      setTextField(`exp_${type}_miles`, (data.experience as any)[`exp_${type}_miles`])
    })
    
    setTextField('states_operated', data.experience.states_operated)
    
    // Skills
    const skills = ['hazmat', 'tanker', 'doubles', 'passenger', 'oversized', 
                   'refrigerated', 'flatbed', 'forklift', 'chains', 'canada', 
                   'mexico', 'twic']
    skills.forEach(skill => {
      setCheckbox(`skill_${skill}`, (data.experience as any)[`skill_${skill}`])
    })
    setTextField('other_skills', data.experience.other_skills)
  }
  
  // Training
  if (data.training) {
    data.training.training?.forEach((t, i) => {
      const idx = i + 1
      setTextField(`training${idx}_name`, t.name)
      setTextField(`training${idx}_date`, t.date)
      setTextField(`training${idx}_cert`, t.cert)
    })
    
    setTextField('safe_driving_awards', data.training.safe_driving_awards)
    setTextField('other_qualifications', data.training.other_qualifications)
    
    // Military
    setCheckbox('military_yes', data.training.military_yes)
    setCheckbox('military_no', data.training.military_no)
    setTextField('military_branch', data.training.military_branch)
    setTextField('military_from', data.training.military_from)
    setTextField('military_to', data.training.military_to)
    setTextField('military_rank', data.training.military_rank)
    setTextField('military_driving_exp', data.training.military_driving_exp)
    
    // References
    for (let i = 1; i <= 3; i++) {
      setTextField(`ref${i}_name`, (data.training as any)[`ref${i}_name`])
      setTextField(`ref${i}_phone`, (data.training as any)[`ref${i}_phone`])
      setTextField(`ref${i}_relationship`, (data.training as any)[`ref${i}_relationship`])
    }
  }
  
  // Certification
  if (data.certification) {
    setCheckbox('do_not_contact_employer', data.certification.do_not_contact_current)
    setTextField('main_signature', data.certification.main_signature)
    setTextField('main_sign_date', data.certification.main_sign_date)
    setTextField('main_printed_name', data.certification.main_printed_name)
    setTextField('acc_viol_signature', data.certification.acc_viol_signature)
    setTextField('acc_viol_date', data.certification.acc_viol_date)
    setTextField('cdl_signature', data.certification.cdl_signature)
    setTextField('cdl_date', data.certification.cdl_date)
  }
}

/**
 * Generate the complete DOT Driver Application PDF
 * @param formData Optional form data to pre-fill the PDF
 * @returns A Blob of the PDF
 */
export async function generateDOTApplicationPDF(formData?: DriverApplicationFormData): Promise<Blob> {
  // Initialize PDF context
  const ctx = await createPDFContext()
  
  // Track all pages for numbering
  const allPages: ReturnType<typeof addPage>[] = []
  
  // Build all pages
  // Page 1: DQ Checklist
  allPages.push(...buildDQChecklistPage(ctx))
  
  // Page 2: Applicant Information
  allPages.push(...buildApplicantInfoPage(ctx))
  
  // Pages 3-4: Employment History
  allPages.push(...buildEmploymentHistoryPages(ctx))
  
  // Page 5: Accidents & Violations
  allPages.push(...buildAccidentsViolationsPage(ctx))
  
  // Page 6: CDL Information
  allPages.push(...buildCDLInfoPage(ctx))
  
  // Page 7: Driving Experience
  allPages.push(...buildDrivingExperiencePage(ctx))
  
  // Page 8: Training & States
  allPages.push(...buildTrainingStatesPage(ctx))
  
  // Page 9: Certification & Acknowledgement
  allPages.push(...buildCertificationPage(ctx))
  
  // Pages 10-13: Authorization Forms
  allPages.push(...buildAuthorizationPages(ctx))
  
  // Pages 14-19: Previous Employer Inquiry Forms
  allPages.push(...buildEmployerInquiryPages(ctx))
  
  // Pages 20-21: Annual Review
  allPages.push(...buildAnnualReviewPages(ctx))
  
  // Page 22: Road Test
  allPages.push(...buildRoadTestPage(ctx))
  
  // Pages 23-24: Medical Certification
  allPages.push(...buildMedicalCertPages(ctx))
  
  // Page 25: Internal Process
  allPages.push(...buildInternalProcessPage(ctx))
  
  // Add page numbers to all pages
  const totalPages = allPages.length
  allPages.forEach((page, index) => {
    drawPageNumber(page, ctx, index + 1, totalPages)
  })
  
  // Pre-fill with form data if provided
  if (formData) {
    prefillFormFields(ctx, formData)
  }
  
  // Update field appearances to reflect filled values
  ctx.form.updateFieldAppearances(ctx.font)
  
  // Save and return as Blob
  const pdfBytes = await ctx.doc.save()
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer
  
  return new Blob([arrayBuffer], { type: 'application/pdf' })
}
