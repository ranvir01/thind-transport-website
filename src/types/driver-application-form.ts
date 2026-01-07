/**
 * TypeScript types for the Driver Application Form
 * Matches all fields in the generated PDF
 */

// Personal Information
export interface PersonalInfo {
  applicant_name: string
  phone: string
  emergency_phone: string
  dob: string
  age?: string
  ssn: string
  email: string
  physical_exam_exp: string
  med_card_state?: string
  
  // Position applied for
  pos_contract_driver?: boolean
  pos_contractors_driver?: boolean
  pos_company_driver?: boolean
  
  // Legal status
  legal_work_yes?: boolean
  legal_work_no?: boolean
  age_21_yes?: boolean
  age_21_no?: boolean
  english_yes?: boolean
  english_no?: boolean
}

// Address History
export interface AddressEntry {
  street: string
  from: string
  to: string
}

export interface AddressHistory {
  addr1_street: string
  addr1_from: string
  addr1_to: string
  addr2_street?: string
  addr2_from?: string
  addr2_to?: string
  addr3_street?: string
  addr3_from?: string
  addr3_to?: string
  
  // Worked before
  worked_before_yes?: boolean
  worked_before_no?: boolean
  worked_before_from?: string
  worked_before_to?: string
  worked_before_reason?: string
}

// Education
export interface Education {
  edu_grade_1?: boolean
  edu_grade_2?: boolean
  edu_grade_3?: boolean
  edu_grade_4?: boolean
  edu_grade_5?: boolean
  edu_grade_6?: boolean
  edu_grade_7?: boolean
  edu_grade_8?: boolean
  edu_grade_9?: boolean
  edu_grade_10?: boolean
  edu_grade_11?: boolean
  edu_grade_12?: boolean
  edu_college_1?: boolean
  edu_college_2?: boolean
  edu_college_3?: boolean
  edu_college_4?: boolean
  edu_postgrad_1?: boolean
  edu_postgrad_2?: boolean
  edu_postgrad_3?: boolean
  edu_postgrad_4?: boolean
}

// Employment Record
export interface EmployerEntry {
  from: string
  to: string
  name: string
  address: string
  phone: string
  position: string
  salary?: string
  supervisor?: string
  reason: string
  fmcsr_yes?: boolean
  fmcsr_no?: boolean
  drug_yes?: boolean
  drug_no?: boolean
}

export interface EmploymentHistory {
  employers: EmployerEntry[]
  employment_gaps?: string
}

// Accident Record
export interface AccidentEntry {
  date: string
  nature: string
  location: string
  fatalities: string
  injuries: string
  hazmat: string
}

export interface AccidentHistory {
  accidents: AccidentEntry[]
  no_accidents?: boolean
}

// Traffic Violations
export interface TrafficEntry {
  date: string
  violation: string
  location: string
  vehicle_type: string
  penalty: string
}

export interface TrafficHistory {
  violations: TrafficEntry[]
  no_violations?: boolean
}

// CDL/License Information
export interface LicenseEntry {
  state: string
  number: string
  class: string
  endorsements: string
  restrictions: string
  exp: string
}

export interface CDLInfo {
  licenses: LicenseEntry[]
  
  // Questions
  denied_yes?: boolean
  denied_no?: boolean
  suspended_yes?: boolean
  suspended_no?: boolean
  felony_yes?: boolean
  felony_no?: boolean
  dui_yes?: boolean
  dui_no?: boolean
  failed_drug_yes?: boolean
  failed_drug_no?: boolean
  abc_explanation?: string
  
  // Medical
  physical_condition_yes?: boolean
  physical_condition_no?: boolean
  medications_yes?: boolean
  medications_no?: boolean
  medical_explanation?: string
}

// Driving Experience
export interface ExperienceEntry {
  type: string
  from: string
  to: string
  miles: string
}

export interface DrivingExperience {
  exp_straight_type?: string
  exp_straight_from?: string
  exp_straight_to?: string
  exp_straight_miles?: string
  
  exp_semi_type?: string
  exp_semi_from?: string
  exp_semi_to?: string
  exp_semi_miles?: string
  
  exp_doubles_type?: string
  exp_doubles_from?: string
  exp_doubles_to?: string
  exp_doubles_miles?: string
  
  exp_triples_type?: string
  exp_triples_from?: string
  exp_triples_to?: string
  exp_triples_miles?: string
  
  exp_bus_type?: string
  exp_bus_from?: string
  exp_bus_to?: string
  exp_bus_miles?: string
  
  exp_other1_type?: string
  exp_other1_from?: string
  exp_other1_to?: string
  exp_other1_miles?: string
  
  states_operated?: string
  
  // Skills
  skill_hazmat?: boolean
  skill_tanker?: boolean
  skill_doubles?: boolean
  skill_passenger?: boolean
  skill_oversized?: boolean
  skill_refrigerated?: boolean
  skill_flatbed?: boolean
  skill_forklift?: boolean
  skill_chains?: boolean
  skill_canada?: boolean
  skill_mexico?: boolean
  skill_twic?: boolean
  other_skills?: string
}

// Training
export interface TrainingEntry {
  name: string
  date: string
  cert: string
}

export interface Training {
  training: TrainingEntry[]
  safe_driving_awards?: string
  other_qualifications?: string
  special_equipment?: string
  
  // Military
  military_yes?: boolean
  military_no?: boolean
  military_branch?: string
  military_from?: string
  military_to?: string
  military_rank?: string
  military_driving_exp?: string
  
  // References
  ref1_name?: string
  ref1_phone?: string
  ref1_relationship?: string
  ref2_name?: string
  ref2_phone?: string
  ref2_relationship?: string
  ref3_name?: string
  ref3_phone?: string
  ref3_relationship?: string
}

// Certification/Acknowledgment
export interface Certification {
  do_not_contact_current?: boolean
  e_signature_consent?: boolean
  main_signature?: string
  main_sign_date?: string
  main_printed_name?: string
  
  // E-Signature metadata (for legal compliance)
  signature_ip?: string
  signature_timestamp?: string
  signature_user_agent?: string
  
  // Accident/Violation page signature
  acc_viol_signature?: string
  acc_viol_date?: string
  
  // CDL page signature
  cdl_signature?: string
  cdl_date?: string
}

// Complete Form Data
export interface DriverApplicationFormData {
  // Metadata
  app_date?: string
  currentStep?: number
  lastSaved?: string
  
  // All sections
  personal: PersonalInfo
  address: AddressHistory
  education: Education
  employment: EmploymentHistory
  accidents: AccidentHistory
  traffic: TrafficHistory
  cdl: CDLInfo
  experience: DrivingExperience
  training: Training
  certification: Certification
}

// Default empty form
export const emptyFormData: DriverApplicationFormData = {
  app_date: new Date().toLocaleDateString(),
  currentStep: 1,
  personal: {
    applicant_name: '',
    phone: '',
    emergency_phone: '',
    dob: '',
    ssn: '',
    email: '',
    physical_exam_exp: '',
  },
  address: {
    addr1_street: '',
    addr1_from: '',
    addr1_to: '',
  },
  education: {},
  employment: {
    employers: [],
  },
  accidents: {
    accidents: [],
  },
  traffic: {
    violations: [],
  },
  cdl: {
    licenses: [],
  },
  experience: {},
  training: {
    training: [],
  },
  certification: {},
}

// Validation helpers
export function isStepComplete(step: number, data: DriverApplicationFormData): boolean {
  switch (step) {
    case 1: // Personal Info
      return !!(
        data.personal.applicant_name &&
        data.personal.phone &&
        data.personal.dob &&
        data.personal.ssn &&
        data.personal.email &&
        data.personal.physical_exam_exp
      )
    case 2: // Address
      return !!(data.address.addr1_street && data.address.addr1_from)
    case 3: // Employment
      return data.employment.employers.length > 0
    case 4: // Accidents/Violations
      return !!(data.accidents.no_accidents || data.accidents.accidents.length > 0)
    case 5: // CDL
      return data.cdl.licenses.length > 0
    case 6: // Experience
      return true // Optional
    case 7: // Training
      return true // Optional
    case 8: // Certification
      return !!(data.certification.main_signature)
    default:
      return true
  }
}

// Local storage key
export const FORM_STORAGE_KEY = 'thind_driver_application_v2'

