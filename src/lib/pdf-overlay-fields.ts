/**
 * PDF Overlay Field Definitions
 * 
 * Each field has:
 * - id: Unique identifier for the field
 * - page: Page number (1-indexed)
 * - x, y: Position as percentage from top-left
 * - width, height: Size as percentage
 * - type: 'text' | 'checkbox' | 'date' | 'signature'
 * - label: Human-readable label for validation messages
 * - required: Whether the field is required
 * - format: Optional formatting hint
 * - placeholder: Placeholder text
 * - fontSize: Font size for PDF rendering
 */

export interface FieldDefinition {
  id: string
  page: number
  x: number      // % from left
  y: number      // % from top  
  width: number  // % width
  height?: number // % height (optional)
  type: 'text' | 'checkbox' | 'date' | 'signature'
  label?: string
  required?: boolean
  format?: 'phone' | 'ssn' | 'date' | 'zip' | 'state'
  placeholder?: string
  fontSize?: number
}

/**
 * All fillable fields for the Thind Transport DOT Application
 * 
 * Page Layout:
 * - Page 1: DQ Checklist (internal)
 * - Page 2: Applicant Information
 * - Pages 3-4: Employment History
 * - Page 5: Accident/Violation Record, CDL Info
 * - Page 6: Driving Experience
 * - Page 7: States/Training/Awards
 * - Pages 8-22: PSP Authorization & Disclosures
 * - Pages 23-24: Road Test (internal)
 * - Page 25: Process Record (internal)
 */

export const OVERLAY_FIELDS: FieldDefinition[] = [
  // ========================================
  // PAGE 2: APPLICANT INFORMATION
  // ========================================
  
  // Header - Company name and date (pre-filled)
  { id: 'applicationDate', page: 2, x: 82, y: 8.5, width: 15, type: 'date', label: 'Application Date', required: true, placeholder: 'MM/DD/YYYY', fontSize: 10 },
  
  // Position checkboxes
  { id: 'position_contract', page: 2, x: 23, y: 14, width: 3, type: 'checkbox', label: 'Contract Driver' },
  { id: 'position_contractors', page: 2, x: 41, y: 14, width: 3, type: 'checkbox', label: "Contractor's Driver" },
  
  // Applicant Information Section
  { id: 'lastName', page: 2, x: 10, y: 19.5, width: 22, type: 'text', label: 'Last Name', required: true, placeholder: 'Last Name', fontSize: 10 },
  { id: 'firstName', page: 2, x: 35, y: 19.5, width: 22, type: 'text', label: 'First Name', required: true, placeholder: 'First Name', fontSize: 10 },
  { id: 'middleName', page: 2, x: 60, y: 19.5, width: 15, type: 'text', label: 'Middle Name', placeholder: 'Middle', fontSize: 10 },
  
  { id: 'ssn', page: 2, x: 10, y: 24, width: 20, type: 'text', label: 'Social Security Number', required: true, format: 'ssn', placeholder: 'XXX-XX-XXXX', fontSize: 10 },
  
  { id: 'phone', page: 2, x: 10, y: 28, width: 18, type: 'text', label: 'Phone', required: true, format: 'phone', placeholder: '(XXX) XXX-XXXX', fontSize: 10 },
  { id: 'emergencyPhone', page: 2, x: 40, y: 28, width: 18, type: 'text', label: 'Emergency Phone', required: true, format: 'phone', placeholder: '(XXX) XXX-XXXX', fontSize: 10 },
  
  { id: 'age', page: 2, x: 70, y: 24, width: 8, type: 'text', label: 'Age', required: true, placeholder: 'Age', fontSize: 10 },
  { id: 'dateOfBirth', page: 2, x: 82, y: 24, width: 15, type: 'date', label: 'Date of Birth', required: true, placeholder: 'MM/DD/YYYY', fontSize: 10 },
  
  { id: 'physicalExamExp', page: 2, x: 70, y: 28, width: 25, type: 'date', label: 'Physical Exam Expiration', required: true, placeholder: 'MM/DD/YYYY', fontSize: 10 },
  
  // Current Address
  { id: 'currentAddress_street', page: 2, x: 10, y: 35, width: 50, type: 'text', label: 'Current Street Address', required: true, placeholder: 'Street Address', fontSize: 9 },
  { id: 'currentAddress_city', page: 2, x: 10, y: 39, width: 25, type: 'text', label: 'City', required: true, placeholder: 'City', fontSize: 9 },
  { id: 'currentAddress_state', page: 2, x: 37, y: 39, width: 8, type: 'text', label: 'State', required: true, format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'currentAddress_zip', page: 2, x: 47, y: 39, width: 12, type: 'text', label: 'ZIP', required: true, format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'currentAddress_from', page: 2, x: 62, y: 39, width: 12, type: 'text', label: 'From Date', required: true, placeholder: 'MM/YYYY', fontSize: 9 },
  { id: 'currentAddress_to', page: 2, x: 77, y: 39, width: 12, type: 'text', label: 'To Date', required: true, placeholder: 'Present', fontSize: 9 },
  
  // Previous Address 1
  { id: 'prevAddress1_street', page: 2, x: 10, y: 44, width: 50, type: 'text', label: 'Previous Address 1 - Street', placeholder: 'Street Address', fontSize: 9 },
  { id: 'prevAddress1_city', page: 2, x: 10, y: 48, width: 25, type: 'text', label: 'City', placeholder: 'City', fontSize: 9 },
  { id: 'prevAddress1_state', page: 2, x: 37, y: 48, width: 8, type: 'text', label: 'State', format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'prevAddress1_zip', page: 2, x: 47, y: 48, width: 12, type: 'text', label: 'ZIP', format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'prevAddress1_from', page: 2, x: 62, y: 48, width: 12, type: 'text', label: 'From', placeholder: 'MM/YYYY', fontSize: 9 },
  { id: 'prevAddress1_to', page: 2, x: 77, y: 48, width: 12, type: 'text', label: 'To', placeholder: 'MM/YYYY', fontSize: 9 },
  
  // Previous Address 2
  { id: 'prevAddress2_street', page: 2, x: 10, y: 52, width: 50, type: 'text', label: 'Previous Address 2 - Street', placeholder: 'Street Address', fontSize: 9 },
  { id: 'prevAddress2_city', page: 2, x: 10, y: 56, width: 25, type: 'text', label: 'City', placeholder: 'City', fontSize: 9 },
  { id: 'prevAddress2_state', page: 2, x: 37, y: 56, width: 8, type: 'text', label: 'State', format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'prevAddress2_zip', page: 2, x: 47, y: 56, width: 12, type: 'text', label: 'ZIP', format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'prevAddress2_from', page: 2, x: 62, y: 56, width: 12, type: 'text', label: 'From', placeholder: 'MM/YYYY', fontSize: 9 },
  { id: 'prevAddress2_to', page: 2, x: 77, y: 56, width: 12, type: 'text', label: 'To', placeholder: 'MM/YYYY', fontSize: 9 },
  
  // Previous Address 3
  { id: 'prevAddress3_street', page: 2, x: 10, y: 60, width: 50, type: 'text', label: 'Previous Address 3 - Street', placeholder: 'Street Address', fontSize: 9 },
  { id: 'prevAddress3_city', page: 2, x: 10, y: 64, width: 25, type: 'text', label: 'City', placeholder: 'City', fontSize: 9 },
  { id: 'prevAddress3_state', page: 2, x: 37, y: 64, width: 8, type: 'text', label: 'State', format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'prevAddress3_zip', page: 2, x: 47, y: 64, width: 12, type: 'text', label: 'ZIP', format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'prevAddress3_from', page: 2, x: 62, y: 64, width: 12, type: 'text', label: 'From', placeholder: 'MM/YYYY', fontSize: 9 },
  { id: 'prevAddress3_to', page: 2, x: 77, y: 64, width: 12, type: 'text', label: 'To', placeholder: 'MM/YYYY', fontSize: 9 },
  
  // Worked for company before
  { id: 'workedBefore_yes', page: 2, x: 50, y: 69, width: 3, type: 'checkbox', label: 'Worked for Company Before - Yes' },
  { id: 'workedBefore_no', page: 2, x: 60, y: 69, width: 3, type: 'checkbox', label: 'Worked for Company Before - No' },
  { id: 'workedBefore_from', page: 2, x: 70, y: 69, width: 12, type: 'text', label: 'Previous Employment From', placeholder: 'MM/YYYY', fontSize: 9 },
  { id: 'workedBefore_to', page: 2, x: 84, y: 69, width: 12, type: 'text', label: 'Previous Employment To', placeholder: 'MM/YYYY', fontSize: 9 },
  { id: 'reasonForLeaving', page: 2, x: 10, y: 73, width: 85, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving previous position', fontSize: 9 },
  
  // Education - Grade School checkboxes (1-12)
  { id: 'edu_grade_1', page: 2, x: 12, y: 82, width: 3, type: 'checkbox', label: 'Grade 1' },
  { id: 'edu_grade_2', page: 2, x: 16, y: 82, width: 3, type: 'checkbox', label: 'Grade 2' },
  { id: 'edu_grade_3', page: 2, x: 20, y: 82, width: 3, type: 'checkbox', label: 'Grade 3' },
  { id: 'edu_grade_4', page: 2, x: 24, y: 82, width: 3, type: 'checkbox', label: 'Grade 4' },
  { id: 'edu_grade_5', page: 2, x: 28, y: 82, width: 3, type: 'checkbox', label: 'Grade 5' },
  { id: 'edu_grade_6', page: 2, x: 32, y: 82, width: 3, type: 'checkbox', label: 'Grade 6' },
  { id: 'edu_grade_7', page: 2, x: 12, y: 86, width: 3, type: 'checkbox', label: 'Grade 7' },
  { id: 'edu_grade_8', page: 2, x: 16, y: 86, width: 3, type: 'checkbox', label: 'Grade 8' },
  { id: 'edu_grade_9', page: 2, x: 20, y: 86, width: 3, type: 'checkbox', label: 'Grade 9' },
  { id: 'edu_grade_10', page: 2, x: 24, y: 86, width: 3, type: 'checkbox', label: 'Grade 10' },
  { id: 'edu_grade_11', page: 2, x: 28, y: 86, width: 3, type: 'checkbox', label: 'Grade 11' },
  { id: 'edu_grade_12', page: 2, x: 32, y: 86, width: 3, type: 'checkbox', label: 'Grade 12', required: true },
  
  // Education - College (1-4)
  { id: 'edu_college_1', page: 2, x: 45, y: 82, width: 3, type: 'checkbox', label: 'College Year 1' },
  { id: 'edu_college_2', page: 2, x: 49, y: 82, width: 3, type: 'checkbox', label: 'College Year 2' },
  { id: 'edu_college_3', page: 2, x: 53, y: 82, width: 3, type: 'checkbox', label: 'College Year 3' },
  { id: 'edu_college_4', page: 2, x: 57, y: 82, width: 3, type: 'checkbox', label: 'College Year 4' },
  
  // Education - Post Graduate (1-4)
  { id: 'edu_postgrad_1', page: 2, x: 72, y: 82, width: 3, type: 'checkbox', label: 'Post Grad Year 1' },
  { id: 'edu_postgrad_2', page: 2, x: 76, y: 82, width: 3, type: 'checkbox', label: 'Post Grad Year 2' },
  { id: 'edu_postgrad_3', page: 2, x: 80, y: 82, width: 3, type: 'checkbox', label: 'Post Grad Year 3' },
  { id: 'edu_postgrad_4', page: 2, x: 84, y: 82, width: 3, type: 'checkbox', label: 'Post Grad Year 4' },
  
  // ========================================
  // PAGE 3: EMPLOYMENT HISTORY (Part 1)
  // ========================================
  
  // Employment Entry 1
  { id: 'emp1_from', page: 3, x: 8, y: 12, width: 10, type: 'text', label: 'Employment 1 - From', required: true, placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp1_to', page: 3, x: 20, y: 12, width: 10, type: 'text', label: 'Employment 1 - To', required: true, placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp1_employer', page: 3, x: 35, y: 12, width: 55, type: 'text', label: 'Employer Name', required: true, placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp1_position', page: 3, x: 8, y: 17, width: 25, type: 'text', label: 'Position Held', required: true, placeholder: 'Position', fontSize: 9 },
  { id: 'emp1_address', page: 3, x: 35, y: 17, width: 55, type: 'text', label: 'Address', required: true, placeholder: 'Address', fontSize: 9 },
  { id: 'emp1_reason', page: 3, x: 8, y: 22, width: 40, type: 'text', label: 'Reason for Leaving', required: true, placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp1_phone', page: 3, x: 55, y: 22, width: 25, type: 'text', label: 'Phone', required: true, format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp1_fmcsr_yes', page: 3, x: 82, y: 22, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp1_fmcsr_no', page: 3, x: 88, y: 22, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp1_safety_yes', page: 3, x: 82, y: 26, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp1_safety_no', page: 3, x: 88, y: 26, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // Employment Entry 2
  { id: 'emp2_from', page: 3, x: 8, y: 32, width: 10, type: 'text', label: 'Employment 2 - From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp2_to', page: 3, x: 20, y: 32, width: 10, type: 'text', label: 'Employment 2 - To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp2_employer', page: 3, x: 35, y: 32, width: 55, type: 'text', label: 'Employer Name', placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp2_position', page: 3, x: 8, y: 37, width: 25, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'emp2_address', page: 3, x: 35, y: 37, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp2_reason', page: 3, x: 8, y: 42, width: 40, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp2_phone', page: 3, x: 55, y: 42, width: 25, type: 'text', label: 'Phone', format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp2_fmcsr_yes', page: 3, x: 82, y: 42, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp2_fmcsr_no', page: 3, x: 88, y: 42, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp2_safety_yes', page: 3, x: 82, y: 46, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp2_safety_no', page: 3, x: 88, y: 46, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // Employment Entry 3
  { id: 'emp3_from', page: 3, x: 8, y: 52, width: 10, type: 'text', label: 'Employment 3 - From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp3_to', page: 3, x: 20, y: 52, width: 10, type: 'text', label: 'Employment 3 - To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp3_employer', page: 3, x: 35, y: 52, width: 55, type: 'text', label: 'Employer Name', placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp3_position', page: 3, x: 8, y: 57, width: 25, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'emp3_address', page: 3, x: 35, y: 57, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp3_reason', page: 3, x: 8, y: 62, width: 40, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp3_phone', page: 3, x: 55, y: 62, width: 25, type: 'text', label: 'Phone', format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp3_fmcsr_yes', page: 3, x: 82, y: 62, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp3_fmcsr_no', page: 3, x: 88, y: 62, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp3_safety_yes', page: 3, x: 82, y: 66, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp3_safety_no', page: 3, x: 88, y: 66, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // Employment Entry 4
  { id: 'emp4_from', page: 3, x: 8, y: 72, width: 10, type: 'text', label: 'Employment 4 - From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp4_to', page: 3, x: 20, y: 72, width: 10, type: 'text', label: 'Employment 4 - To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp4_employer', page: 3, x: 35, y: 72, width: 55, type: 'text', label: 'Employer Name', placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp4_position', page: 3, x: 8, y: 77, width: 25, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'emp4_address', page: 3, x: 35, y: 77, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp4_reason', page: 3, x: 8, y: 82, width: 40, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp4_phone', page: 3, x: 55, y: 82, width: 25, type: 'text', label: 'Phone', format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp4_fmcsr_yes', page: 3, x: 82, y: 82, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp4_fmcsr_no', page: 3, x: 88, y: 82, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp4_safety_yes', page: 3, x: 82, y: 86, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp4_safety_no', page: 3, x: 88, y: 86, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // ========================================
  // PAGE 4: EMPLOYMENT HISTORY (Part 2)
  // ========================================
  
  // Employment Entry 5
  { id: 'emp5_from', page: 4, x: 8, y: 12, width: 10, type: 'text', label: 'Employment 5 - From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp5_to', page: 4, x: 20, y: 12, width: 10, type: 'text', label: 'Employment 5 - To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp5_employer', page: 4, x: 35, y: 12, width: 55, type: 'text', label: 'Employer Name', placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp5_position', page: 4, x: 8, y: 17, width: 25, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'emp5_address', page: 4, x: 35, y: 17, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp5_reason', page: 4, x: 8, y: 22, width: 40, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp5_phone', page: 4, x: 55, y: 22, width: 25, type: 'text', label: 'Phone', format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp5_fmcsr_yes', page: 4, x: 82, y: 22, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp5_fmcsr_no', page: 4, x: 88, y: 22, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp5_safety_yes', page: 4, x: 82, y: 26, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp5_safety_no', page: 4, x: 88, y: 26, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // Employment Entry 6
  { id: 'emp6_from', page: 4, x: 8, y: 32, width: 10, type: 'text', label: 'Employment 6 - From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp6_to', page: 4, x: 20, y: 32, width: 10, type: 'text', label: 'Employment 6 - To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp6_employer', page: 4, x: 35, y: 32, width: 55, type: 'text', label: 'Employer Name', placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp6_position', page: 4, x: 8, y: 37, width: 25, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'emp6_address', page: 4, x: 35, y: 37, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp6_reason', page: 4, x: 8, y: 42, width: 40, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp6_phone', page: 4, x: 55, y: 42, width: 25, type: 'text', label: 'Phone', format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp6_fmcsr_yes', page: 4, x: 82, y: 42, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp6_fmcsr_no', page: 4, x: 88, y: 42, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp6_safety_yes', page: 4, x: 82, y: 46, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp6_safety_no', page: 4, x: 88, y: 46, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // Employment Entry 7
  { id: 'emp7_from', page: 4, x: 8, y: 52, width: 10, type: 'text', label: 'Employment 7 - From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp7_to', page: 4, x: 20, y: 52, width: 10, type: 'text', label: 'Employment 7 - To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'emp7_employer', page: 4, x: 35, y: 52, width: 55, type: 'text', label: 'Employer Name', placeholder: 'Employer Name', fontSize: 9 },
  { id: 'emp7_position', page: 4, x: 8, y: 57, width: 25, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'emp7_address', page: 4, x: 35, y: 57, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp7_reason', page: 4, x: 8, y: 62, width: 40, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'emp7_phone', page: 4, x: 55, y: 62, width: 25, type: 'text', label: 'Phone', format: 'phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp7_fmcsr_yes', page: 4, x: 82, y: 62, width: 3, type: 'checkbox', label: 'Subject to FMCSR - Yes' },
  { id: 'emp7_fmcsr_no', page: 4, x: 88, y: 62, width: 3, type: 'checkbox', label: 'Subject to FMCSR - No' },
  { id: 'emp7_safety_yes', page: 4, x: 82, y: 66, width: 3, type: 'checkbox', label: 'Safety Sensitive - Yes' },
  { id: 'emp7_safety_no', page: 4, x: 88, y: 66, width: 3, type: 'checkbox', label: 'Safety Sensitive - No' },
  
  // ========================================
  // PAGE 5: ACCIDENT RECORD, VIOLATIONS, CDL
  // ========================================
  
  // Accident Record (3 rows)
  { id: 'accident1_date', page: 5, x: 8, y: 14, width: 12, type: 'date', label: 'Accident 1 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'accident1_details', page: 5, x: 22, y: 14, width: 45, type: 'text', label: 'Accident 1 Details', placeholder: 'Nature of accident', fontSize: 9 },
  { id: 'accident1_fatalities', page: 5, x: 70, y: 14, width: 10, type: 'text', label: 'Fatalities', placeholder: '0', fontSize: 9 },
  { id: 'accident1_injuries', page: 5, x: 82, y: 14, width: 10, type: 'text', label: 'Injuries', placeholder: '0', fontSize: 9 },
  
  { id: 'accident2_date', page: 5, x: 8, y: 19, width: 12, type: 'date', label: 'Accident 2 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'accident2_details', page: 5, x: 22, y: 19, width: 45, type: 'text', label: 'Accident 2 Details', placeholder: 'Nature of accident', fontSize: 9 },
  { id: 'accident2_fatalities', page: 5, x: 70, y: 19, width: 10, type: 'text', label: 'Fatalities', placeholder: '0', fontSize: 9 },
  { id: 'accident2_injuries', page: 5, x: 82, y: 19, width: 10, type: 'text', label: 'Injuries', placeholder: '0', fontSize: 9 },
  
  { id: 'accident3_date', page: 5, x: 8, y: 24, width: 12, type: 'date', label: 'Accident 3 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'accident3_details', page: 5, x: 22, y: 24, width: 45, type: 'text', label: 'Accident 3 Details', placeholder: 'Nature of accident', fontSize: 9 },
  { id: 'accident3_fatalities', page: 5, x: 70, y: 24, width: 10, type: 'text', label: 'Fatalities', placeholder: '0', fontSize: 9 },
  { id: 'accident3_injuries', page: 5, x: 82, y: 24, width: 10, type: 'text', label: 'Injuries', placeholder: '0', fontSize: 9 },
  
  // Traffic Violations (4 rows)
  { id: 'violation1_location', page: 5, x: 8, y: 34, width: 20, type: 'text', label: 'Violation 1 Location', placeholder: 'City, State', fontSize: 9 },
  { id: 'violation1_date', page: 5, x: 30, y: 34, width: 12, type: 'date', label: 'Violation 1 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'violation1_charge', page: 5, x: 44, y: 34, width: 30, type: 'text', label: 'Violation 1 Charge', placeholder: 'Charge', fontSize: 9 },
  { id: 'violation1_penalty', page: 5, x: 76, y: 34, width: 18, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 9 },
  
  { id: 'violation2_location', page: 5, x: 8, y: 39, width: 20, type: 'text', label: 'Violation 2 Location', placeholder: 'City, State', fontSize: 9 },
  { id: 'violation2_date', page: 5, x: 30, y: 39, width: 12, type: 'date', label: 'Violation 2 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'violation2_charge', page: 5, x: 44, y: 39, width: 30, type: 'text', label: 'Violation 2 Charge', placeholder: 'Charge', fontSize: 9 },
  { id: 'violation2_penalty', page: 5, x: 76, y: 39, width: 18, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 9 },
  
  { id: 'violation3_location', page: 5, x: 8, y: 44, width: 20, type: 'text', label: 'Violation 3 Location', placeholder: 'City, State', fontSize: 9 },
  { id: 'violation3_date', page: 5, x: 30, y: 44, width: 12, type: 'date', label: 'Violation 3 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'violation3_charge', page: 5, x: 44, y: 44, width: 30, type: 'text', label: 'Violation 3 Charge', placeholder: 'Charge', fontSize: 9 },
  { id: 'violation3_penalty', page: 5, x: 76, y: 44, width: 18, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 9 },
  
  { id: 'violation4_location', page: 5, x: 8, y: 49, width: 20, type: 'text', label: 'Violation 4 Location', placeholder: 'City, State', fontSize: 9 },
  { id: 'violation4_date', page: 5, x: 30, y: 49, width: 12, type: 'date', label: 'Violation 4 Date', placeholder: 'MM/DD/YY', fontSize: 9 },
  { id: 'violation4_charge', page: 5, x: 44, y: 49, width: 30, type: 'text', label: 'Violation 4 Charge', placeholder: 'Charge', fontSize: 9 },
  { id: 'violation4_penalty', page: 5, x: 76, y: 49, width: 18, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 9 },
  
  // CDL License Information
  { id: 'cdl_number', page: 5, x: 8, y: 60, width: 25, type: 'text', label: 'CDL Number', required: true, placeholder: 'License Number', fontSize: 10 },
  { id: 'cdl_state', page: 5, x: 35, y: 60, width: 10, type: 'text', label: 'CDL State', required: true, format: 'state', placeholder: 'ST', fontSize: 10 },
  { id: 'cdl_type', page: 5, x: 47, y: 60, width: 20, type: 'text', label: 'CDL Type/Endorsements', required: true, placeholder: 'Class A, HAZMAT', fontSize: 10 },
  { id: 'cdl_expiration', page: 5, x: 70, y: 60, width: 18, type: 'date', label: 'CDL Expiration', required: true, placeholder: 'MM/DD/YYYY', fontSize: 10 },
  
  // License questions
  { id: 'denied_yes', page: 5, x: 82, y: 68, width: 3, type: 'checkbox', label: 'Denied License - Yes' },
  { id: 'denied_no', page: 5, x: 88, y: 68, width: 3, type: 'checkbox', label: 'Denied License - No' },
  { id: 'suspended_yes', page: 5, x: 82, y: 73, width: 3, type: 'checkbox', label: 'Suspended License - Yes' },
  { id: 'suspended_no', page: 5, x: 88, y: 73, width: 3, type: 'checkbox', label: 'Suspended License - No' },
  { id: 'felony_yes', page: 5, x: 82, y: 78, width: 3, type: 'checkbox', label: 'Felony Conviction - Yes' },
  { id: 'felony_no', page: 5, x: 88, y: 78, width: 3, type: 'checkbox', label: 'Felony Conviction - No' },
  { id: 'license_explanation', page: 5, x: 8, y: 84, width: 85, type: 'text', label: 'Explanation', placeholder: 'If any above is Yes, explain here', fontSize: 9 },
  
  // ========================================
  // PAGE 6: DRIVING EXPERIENCE
  // ========================================
  
  // Straight Truck
  { id: 'exp_straight_type', page: 6, x: 25, y: 20, width: 15, type: 'text', label: 'Straight Truck - Type', placeholder: 'Van, Tank', fontSize: 9 },
  { id: 'exp_straight_from', page: 6, x: 42, y: 20, width: 12, type: 'text', label: 'From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_straight_to', page: 6, x: 56, y: 20, width: 12, type: 'text', label: 'To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_straight_miles', page: 6, x: 72, y: 20, width: 18, type: 'text', label: 'Approx Miles', placeholder: 'Miles', fontSize: 9 },
  
  // Tractor Semi-Trailer
  { id: 'exp_semi_type', page: 6, x: 25, y: 28, width: 15, type: 'text', label: 'Semi-Trailer - Type', placeholder: 'Van, Tank', fontSize: 9 },
  { id: 'exp_semi_from', page: 6, x: 42, y: 28, width: 12, type: 'text', label: 'From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_semi_to', page: 6, x: 56, y: 28, width: 12, type: 'text', label: 'To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_semi_miles', page: 6, x: 72, y: 28, width: 18, type: 'text', label: 'Approx Miles', placeholder: 'Miles', fontSize: 9 },
  
  // Tractor Two Trailer
  { id: 'exp_doubles_type', page: 6, x: 25, y: 36, width: 15, type: 'text', label: 'Two Trailer - Type', placeholder: 'Van, Tank', fontSize: 9 },
  { id: 'exp_doubles_from', page: 6, x: 42, y: 36, width: 12, type: 'text', label: 'From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_doubles_to', page: 6, x: 56, y: 36, width: 12, type: 'text', label: 'To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_doubles_miles', page: 6, x: 72, y: 36, width: 18, type: 'text', label: 'Approx Miles', placeholder: 'Miles', fontSize: 9 },
  
  // Other
  { id: 'exp_other_class', page: 6, x: 8, y: 44, width: 15, type: 'text', label: 'Other Equipment', placeholder: 'Type', fontSize: 9 },
  { id: 'exp_other_type', page: 6, x: 25, y: 44, width: 15, type: 'text', label: 'Other - Type', placeholder: 'Van, Tank', fontSize: 9 },
  { id: 'exp_other_from', page: 6, x: 42, y: 44, width: 12, type: 'text', label: 'From', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_other_to', page: 6, x: 56, y: 44, width: 12, type: 'text', label: 'To', placeholder: 'MM/YY', fontSize: 9 },
  { id: 'exp_other_miles', page: 6, x: 72, y: 44, width: 18, type: 'text', label: 'Approx Miles', placeholder: 'Miles', fontSize: 9 },
  
  // ========================================
  // PAGE 7: STATES, TRAINING, AWARDS
  // ========================================
  
  { id: 'statesOperated', page: 7, x: 8, y: 12, width: 85, type: 'text', label: 'States Operated In (Past 5 Years)', required: true, placeholder: 'WA, OR, CA, ID, MT, ...', fontSize: 9 },
  { id: 'specialCourses', page: 7, x: 8, y: 22, width: 85, type: 'text', label: 'Special Courses or Training', placeholder: 'Describe special training', fontSize: 9 },
  { id: 'safetyAwards', page: 7, x: 8, y: 32, width: 85, type: 'text', label: 'Safe Driving Awards', placeholder: 'List safety awards', fontSize: 9 },
  { id: 'otherTraining', page: 7, x: 8, y: 42, width: 85, type: 'text', label: 'Other Courses and Training', placeholder: 'Other training not listed above', fontSize: 9 },
  { id: 'specialEquipment', page: 7, x: 8, y: 52, width: 85, type: 'text', label: 'Special Equipment or Technical Materials', placeholder: 'Special equipment skills', fontSize: 9 },
  
  // ========================================
  // PAGE 22: PSP AUTHORIZATION SIGNATURE
  // ========================================
  
  { id: 'psp_signatureDate', page: 22, x: 15, y: 75, width: 20, type: 'date', label: 'PSP Signature Date', required: true, placeholder: 'MM/DD/YYYY', fontSize: 11 },
  { id: 'psp_signatureName', page: 22, x: 15, y: 82, width: 50, type: 'signature', label: 'PSP Signature (Full Legal Name)', required: true, placeholder: 'Full Legal Name', fontSize: 12 },
]

/**
 * Get all fields for a specific page
 */
export function getFieldsForPage(pageNumber: number): FieldDefinition[] {
  return OVERLAY_FIELDS.filter(f => f.page === pageNumber)
}

/**
 * Get all required fields
 */
export function getRequiredFields(): FieldDefinition[] {
  return OVERLAY_FIELDS.filter(f => f.required)
}

/**
 * Validate that all required fields have values
 */
export function validateFields(formData: Record<string, string>): { valid: boolean; missing: string[] } {
  const requiredFields = getRequiredFields()
  const missing: string[] = []
  
  for (const field of requiredFields) {
    const value = formData[field.id]
    if (!value || value.trim() === '') {
      missing.push(field.label || field.id)
    }
  }
  
  return { valid: missing.length === 0, missing }
}

