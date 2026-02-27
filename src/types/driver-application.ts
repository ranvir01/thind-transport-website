/**
 * DOT Driver Application Types
 * Matches the format from Thind Transport Application.pdf
 */

// Address with date range
export interface AddressEntry {
  street: string
  city: string
  state: string
  zip: string
  from: string // MM/YYYY format
  to: string // MM/YYYY or "Present"
}

export interface EmploymentHistoryEntry {
  fromDate: string // MM/YY format
  toDate: string // MM/YY format or "Present"
  employerName: string
  position: string
  address: string
  phone: string
  reasonForLeaving: string
  subjectToFMCSR: boolean
  safetyFunctioning: boolean
  // For unemployment or self-employment periods
  isUnemployment?: boolean
  isSelfEmployment?: boolean
}

export interface AccidentRecord {
  date: string
  location: string
  details: string
  fatalities: string
  injuries: string
}

export interface TrafficViolation {
  date: string
  location: string
  charge: string
  penalty: string
}

export interface LicenseInfo {
  licenseNumber: string
  state: string
  type: string // Class A, B, C
  endorsements: string
  expirationDate: string
}

export interface DrivingExperience {
  classOfEquipment: string // Straight Truck, Tractor and Semi-Trailer, Tractor - Two Trailer, Other
  typeOfEquipment: string // Van, Tank, Flatbed, etc.
  dateFrom: string
  dateTo: string
  approximateMiles: string
}

export interface EducationHistory {
  gradeSchool: number // 1-12
  college: number // 0-4
  postGraduate: number // 0-4
}

export interface DriverApplicationData {
  // Application metadata
  applicationDate: string
  positionApplyingFor: 'contract_driver' | 'contractors_driver' | 'both'

  // Step 1: Personal Information
  personalInfo: {
    firstName: string
    middleName?: string // Optional middle name
    lastName: string
    dateOfBirth: string
    age: string
    socialSecurityNumber: string
    phone: string
    emergencyPhone: string
    physicalExamExpiration: string
    
    // Current and previous addresses (last 3 years required)
    currentAddress: AddressEntry
    previousAddresses: AddressEntry[]
    
    // Previous employment with this company
    workedForCompanyBefore: 'true' | 'false' // Required answer
    previousWorkDates?: {
      from: string
      to: string
    }
    reasonForLeaving?: string
    
    // Education - matches PDF format
    education: EducationHistory
    
    // Legacy field for backwards compatibility
    educationLevel?: string
  }

  // Step 2: Employment History (last 3 years + 10 years commercial driving)
  employmentHistory: {
    entries: EmploymentHistoryEntry[]
  }

  // Step 3: Driving Record
  drivingRecord: {
    // CDL licenses
    cdlLicenses: LicenseInfo[]
    
    // License history questions
    deniedLicense: boolean
    deniedLicenseExplanation?: string
    suspendedLicense: boolean
    suspendedLicenseExplanation?: string
    felonyConviction: boolean
    felonyConvictionExplanation?: string
    
    // Accident record (past 3 years)
    accidents: AccidentRecord[]
    
    // Traffic convictions (past 3 years, other than parking)
    violations: TrafficViolation[]
  }

  // Step 4: Experience & Qualifications
  experienceQualifications: {
    // Driving experience by equipment type
    drivingExperience: DrivingExperience[]
    
    // States operated in (past 5 years)
    statesOperated: string[]
    
    // Training and qualifications
    specialCourses: string
    safetyAwards: string
    otherTraining: string
    specialEquipment: string
  }

  // Step 5: PSP Authorization & Certifications
  pspAuthorization: {
    // PSP disclosure acknowledgments
    acknowledgeDisclosure: boolean
    authorizeBackgroundCheck: boolean
    understandDataQs: boolean
    understandCrashDisplay: boolean
    understandInspectionDisplay: boolean
    
    // ADA Notice acknowledgment
    acknowledgeADANotice: boolean
    
    // Certification that information is true and complete
    certifyInformationTrue: boolean
    authorizeInvestigation: boolean
    
    // Signature
    signatureDate: string
    fullName: string
  }

  // Metadata
  submittedAt?: Date
  driverId: string
}
