/**
 * DOT Driver Application Types
 * Matches the format from Thind Transport Application.pdf
 */

export interface EmploymentHistoryEntry {
  fromDate: string // MM/YY format
  toDate: string // MM/YY format
  employerName: string
  position: string
  address: string
  phone: string
  reasonForLeaving: string
  subjectToFMCSR: boolean
  safetyFunctioning: boolean
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
  type: string
  endorsements: string
  expirationDate: string
}

export interface DrivingExperience {
  classOfEquipment: string
  typeOfEquipment: string
  dateFrom: string
  dateTo: string
  approximateMiles: string
}

export interface DriverApplicationData {
  // Step 1: Personal Information
  personalInfo: {
    firstName: string
    lastName: string
    dateOfBirth: string
    age: string
    socialSecurityNumber: string
    phone: string
    emergencyPhone: string
    physicalExamExpiration: string
    currentAddress: {
      street: string
      city: string
      state: string
      zip: string
      from: string
      to: string
    }
    previousAddresses: Array<{
      street: string
      city: string
      state: string
      zip: string
      from: string
      to: string
    }>
    workedForCompanyBefore?: string
    previousWorkDates?: {
      from: string
      to: string
    }
    reasonForLeaving?: string
    educationLevel: string
  }

  // Step 2: Employment History
  employmentHistory: {
    entries: EmploymentHistoryEntry[]
  }

  // Step 3: Driving Record
  drivingRecord: {
    cdlLicenses: LicenseInfo[]
    deniedLicense: boolean
    deniedLicenseExplanation?: string
    suspendedLicense: boolean
    suspendedLicenseExplanation?: string
    felonyConviction: boolean
    felonyConvictionExplanation?: string
    accidents: AccidentRecord[]
    violations: TrafficViolation[]
  }

  // Step 4: Experience & Qualifications
  experienceQualifications: {
    drivingExperience: DrivingExperience[]
    statesOperated: string[]
    specialCourses: string
    safetyAwards: string
    otherTraining: string
    specialEquipment: string
  }

  // Step 5: PSP Authorization
  pspAuthorization: {
    acknowledgeDisclosure: boolean
    authorizeBackgroundCheck: boolean
    understandDataQs: boolean
    understandCrashDisplay: boolean
    understandInspectionDisplay: boolean
    signatureDate: string
    fullName: string
  }

  // Metadata
  submittedAt?: Date
  driverId: string
}

