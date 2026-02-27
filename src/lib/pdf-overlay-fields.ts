/**
 * PDF Overlay Field Definitions - Complete Mapping
 * All fields positioned based on the actual PDF layout
 */

export interface FieldDefinition {
  id: string
  page: number
  x: number      // % from left
  y: number      // % from top  
  width: number  // % width
  height?: number
  type: 'text' | 'checkbox' | 'date' | 'signature'
  label?: string
  required?: boolean
  format?: 'phone' | 'ssn' | 'date' | 'zip' | 'state'
  placeholder?: string
  fontSize?: number
}

export const OVERLAY_FIELDS: FieldDefinition[] = [
  // ============================================================
  // PAGE 2: APPLICANT INFORMATION
  // ============================================================
  
  // Application Date (top right corner)
  { id: 'applicationDate', page: 2, x: 80, y: 3.5, width: 17, type: 'date', label: 'Date', required: true, placeholder: 'MM/DD/YYYY', fontSize: 9 },
  
  // Position Applying For checkboxes
  { id: 'position_contract', page: 2, x: 37.5, y: 9.8, width: 2.5, type: 'checkbox', label: 'Contract Driver' },
  { id: 'position_contractor', page: 2, x: 52, y: 9.8, width: 2.5, type: 'checkbox', label: "Contractor's Driver" },
  
  // Name fields (on the line below "APPLICANT INFORMATION")
  { id: 'lastName', page: 2, x: 8, y: 14.5, width: 20, type: 'text', label: 'Last Name', required: true, placeholder: 'Last Name', fontSize: 9 },
  { id: 'firstName', page: 2, x: 30, y: 14.5, width: 18, type: 'text', label: 'First Name', required: true, placeholder: 'First Name', fontSize: 9 },
  { id: 'middleName', page: 2, x: 50, y: 14.5, width: 10, type: 'text', label: 'Middle', placeholder: 'MI', fontSize: 9 },
  
  // SSN (below name, left side)
  { id: 'ssn', page: 2, x: 8, y: 18, width: 18, type: 'text', label: 'Social Security Number', required: true, format: 'ssn', placeholder: 'XXX-XX-XXXX', fontSize: 9 },
  
  // Age and DOB (right side of SSN line)
  { id: 'age', page: 2, x: 62, y: 18, width: 6, type: 'text', label: 'Age', required: true, placeholder: 'Age', fontSize: 9 },
  { id: 'dateOfBirth', page: 2, x: 72, y: 18, width: 18, type: 'date', label: 'Date of Birth', required: true, placeholder: 'MM/DD/YYYY', fontSize: 9 },
  
  // Phone and Emergency Phone
  { id: 'phone', page: 2, x: 8, y: 21.5, width: 18, type: 'text', label: 'Phone', required: true, format: 'phone', placeholder: '(XXX) XXX-XXXX', fontSize: 9 },
  { id: 'emergencyPhone', page: 2, x: 38, y: 21.5, width: 18, type: 'text', label: 'Emergency Phone', required: true, format: 'phone', placeholder: '(XXX) XXX-XXXX', fontSize: 9 },
  { id: 'physicalExamExp', page: 2, x: 72, y: 21.5, width: 18, type: 'date', label: 'Physical Exam Exp', required: true, placeholder: 'MM/DD/YYYY', fontSize: 9 },
  
  // Current Address Section
  { id: 'currentAddress_street', page: 2, x: 8, y: 28, width: 60, type: 'text', label: 'Street Address', required: true, placeholder: 'Street Address', fontSize: 9 },
  { id: 'currentAddress_city', page: 2, x: 8, y: 32, width: 28, type: 'text', label: 'City', required: true, placeholder: 'City', fontSize: 9 },
  { id: 'currentAddress_state', page: 2, x: 38, y: 32, width: 6, type: 'text', label: 'State', required: true, format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'currentAddress_zip', page: 2, x: 46, y: 32, width: 10, type: 'text', label: 'ZIP', required: true, format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'currentAddress_from', page: 2, x: 58, y: 32, width: 10, type: 'text', label: 'From', required: true, placeholder: 'MM/YYYY', fontSize: 8 },
  { id: 'currentAddress_to', page: 2, x: 70, y: 32, width: 10, type: 'text', label: 'To', required: true, placeholder: 'Present', fontSize: 8 },
  
  // Previous Address 1
  { id: 'prevAddr1_street', page: 2, x: 8, y: 37, width: 60, type: 'text', label: 'Previous Address 1', placeholder: 'Street Address', fontSize: 9 },
  { id: 'prevAddr1_city', page: 2, x: 8, y: 41, width: 28, type: 'text', label: 'City', placeholder: 'City', fontSize: 9 },
  { id: 'prevAddr1_state', page: 2, x: 38, y: 41, width: 6, type: 'text', label: 'State', format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'prevAddr1_zip', page: 2, x: 46, y: 41, width: 10, type: 'text', label: 'ZIP', format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'prevAddr1_from', page: 2, x: 58, y: 41, width: 10, type: 'text', label: 'From', placeholder: 'MM/YYYY', fontSize: 8 },
  { id: 'prevAddr1_to', page: 2, x: 70, y: 41, width: 10, type: 'text', label: 'To', placeholder: 'MM/YYYY', fontSize: 8 },
  
  // Previous Address 2
  { id: 'prevAddr2_street', page: 2, x: 8, y: 46, width: 60, type: 'text', label: 'Previous Address 2', placeholder: 'Street Address', fontSize: 9 },
  { id: 'prevAddr2_city', page: 2, x: 8, y: 50, width: 28, type: 'text', label: 'City', placeholder: 'City', fontSize: 9 },
  { id: 'prevAddr2_state', page: 2, x: 38, y: 50, width: 6, type: 'text', label: 'State', format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'prevAddr2_zip', page: 2, x: 46, y: 50, width: 10, type: 'text', label: 'ZIP', format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'prevAddr2_from', page: 2, x: 58, y: 50, width: 10, type: 'text', label: 'From', placeholder: 'MM/YYYY', fontSize: 8 },
  { id: 'prevAddr2_to', page: 2, x: 70, y: 50, width: 10, type: 'text', label: 'To', placeholder: 'MM/YYYY', fontSize: 8 },
  
  // Previous Address 3
  { id: 'prevAddr3_street', page: 2, x: 8, y: 55, width: 60, type: 'text', label: 'Previous Address 3', placeholder: 'Street Address', fontSize: 9 },
  { id: 'prevAddr3_city', page: 2, x: 8, y: 59, width: 28, type: 'text', label: 'City', placeholder: 'City', fontSize: 9 },
  { id: 'prevAddr3_state', page: 2, x: 38, y: 59, width: 6, type: 'text', label: 'State', format: 'state', placeholder: 'ST', fontSize: 9 },
  { id: 'prevAddr3_zip', page: 2, x: 46, y: 59, width: 10, type: 'text', label: 'ZIP', format: 'zip', placeholder: 'ZIP', fontSize: 9 },
  { id: 'prevAddr3_from', page: 2, x: 58, y: 59, width: 10, type: 'text', label: 'From', placeholder: 'MM/YYYY', fontSize: 8 },
  { id: 'prevAddr3_to', page: 2, x: 70, y: 59, width: 10, type: 'text', label: 'To', placeholder: 'MM/YYYY', fontSize: 8 },
  
  // Worked for company before
  { id: 'workedBefore_yes', page: 2, x: 50, y: 64, width: 2.5, type: 'checkbox', label: 'Yes' },
  { id: 'workedBefore_no', page: 2, x: 62, y: 64, width: 2.5, type: 'checkbox', label: 'No' },
  { id: 'workedBefore_from', page: 2, x: 26, y: 66, width: 12, type: 'text', label: 'From', placeholder: 'From', fontSize: 8 },
  { id: 'workedBefore_to', page: 2, x: 42, y: 66, width: 12, type: 'text', label: 'To', placeholder: 'To', fontSize: 8 },
  { id: 'workedBefore_reason', page: 2, x: 8, y: 70, width: 80, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  
  // Education - Grade School (1-12) - horizontal row
  { id: 'edu_grade_1', page: 2, x: 36.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 1' },
  { id: 'edu_grade_2', page: 2, x: 39.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 2' },
  { id: 'edu_grade_3', page: 2, x: 42.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 3' },
  { id: 'edu_grade_4', page: 2, x: 45.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 4' },
  { id: 'edu_grade_5', page: 2, x: 48.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 5' },
  { id: 'edu_grade_6', page: 2, x: 51.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 6' },
  { id: 'edu_grade_7', page: 2, x: 54.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 7' },
  { id: 'edu_grade_8', page: 2, x: 57.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 8' },
  { id: 'edu_grade_9', page: 2, x: 60.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 9' },
  { id: 'edu_grade_10', page: 2, x: 63.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 10' },
  { id: 'edu_grade_11', page: 2, x: 66.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 11' },
  { id: 'edu_grade_12', page: 2, x: 69.5, y: 77.5, width: 2.2, type: 'checkbox', label: 'Grade 12' },
  
  // Education - College (1-4)
  { id: 'edu_college_1', page: 2, x: 29, y: 80, width: 2.2, type: 'checkbox', label: 'College 1' },
  { id: 'edu_college_2', page: 2, x: 32, y: 80, width: 2.2, type: 'checkbox', label: 'College 2' },
  { id: 'edu_college_3', page: 2, x: 35, y: 80, width: 2.2, type: 'checkbox', label: 'College 3' },
  { id: 'edu_college_4', page: 2, x: 38, y: 80, width: 2.2, type: 'checkbox', label: 'College 4' },
  
  // Education - Post Graduate (1-4)
  { id: 'edu_postgrad_1', page: 2, x: 56.5, y: 80, width: 2.2, type: 'checkbox', label: 'Post Grad 1' },
  { id: 'edu_postgrad_2', page: 2, x: 59.5, y: 80, width: 2.2, type: 'checkbox', label: 'Post Grad 2' },
  { id: 'edu_postgrad_3', page: 2, x: 62.5, y: 80, width: 2.2, type: 'checkbox', label: 'Post Grad 3' },
  { id: 'edu_postgrad_4', page: 2, x: 65.5, y: 80, width: 2.2, type: 'checkbox', label: 'Post Grad 4' },
  
  // Employment History header on page 2 (bottom section)
  // Employment Entry 1 (on Page 2, bottom)
  { id: 'p2_emp1_from', page: 2, x: 6, y: 88, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'p2_emp1_to', page: 2, x: 16, y: 88, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'p2_emp1_employer', page: 2, x: 32, y: 88, width: 55, type: 'text', label: 'Employer Name', required: true, placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'p2_emp1_position', page: 2, x: 6, y: 92, width: 22, type: 'text', label: 'Position Held', placeholder: 'Position', fontSize: 9 },
  { id: 'p2_emp1_address', page: 2, x: 32, y: 92, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'p2_emp1_reason', page: 2, x: 6, y: 96, width: 35, type: 'text', label: 'Reason for Leaving', placeholder: 'Reason for leaving', fontSize: 9 },
  { id: 'p2_emp1_phone', page: 2, x: 46, y: 96, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'p2_emp1_fmcsr_yes', page: 2, x: 70, y: 96, width: 2.2, type: 'checkbox', label: 'FMCSR Yes' },
  { id: 'p2_emp1_fmcsr_no', page: 2, x: 80, y: 96, width: 2.2, type: 'checkbox', label: 'FMCSR No' },

  // ============================================================
  // PAGE 3: EMPLOYMENT HISTORY (Continued)
  // ============================================================
  
  // Employment Entry 2
  { id: 'emp2_from', page: 3, x: 6, y: 5, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp2_to', page: 3, x: 16, y: 5, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp2_employer', page: 3, x: 38, y: 5, width: 50, type: 'text', label: 'Employer', placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'emp2_position', page: 3, x: 6, y: 9, width: 20, type: 'text', label: 'Position', placeholder: 'Position Held', fontSize: 9 },
  { id: 'emp2_address', page: 3, x: 32, y: 9, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp2_reason', page: 3, x: 6, y: 13, width: 32, type: 'text', label: 'Reason', placeholder: 'Reason for Leaving', fontSize: 9 },
  { id: 'emp2_phone', page: 3, x: 42, y: 13, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp2_fmcsr_yes', page: 3, x: 70, y: 13, width: 2.2, type: 'checkbox', label: 'FMCSR Yes' },
  { id: 'emp2_fmcsr_no', page: 3, x: 80, y: 13, width: 2.2, type: 'checkbox', label: 'FMCSR No' },
  { id: 'emp2_safety_yes', page: 3, x: 70, y: 16, width: 2.2, type: 'checkbox', label: 'Safety Yes' },
  { id: 'emp2_safety_no', page: 3, x: 80, y: 16, width: 2.2, type: 'checkbox', label: 'Safety No' },
  
  // Employment Entry 3
  { id: 'emp3_from', page: 3, x: 6, y: 21, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp3_to', page: 3, x: 16, y: 21, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp3_employer', page: 3, x: 38, y: 21, width: 50, type: 'text', label: 'Employer', placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'emp3_position', page: 3, x: 6, y: 25, width: 20, type: 'text', label: 'Position', placeholder: 'Position Held', fontSize: 9 },
  { id: 'emp3_address', page: 3, x: 32, y: 25, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp3_reason', page: 3, x: 6, y: 29, width: 32, type: 'text', label: 'Reason', placeholder: 'Reason for Leaving', fontSize: 9 },
  { id: 'emp3_phone', page: 3, x: 42, y: 29, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp3_fmcsr_yes', page: 3, x: 70, y: 29, width: 2.2, type: 'checkbox', label: 'FMCSR Yes' },
  { id: 'emp3_fmcsr_no', page: 3, x: 80, y: 29, width: 2.2, type: 'checkbox', label: 'FMCSR No' },
  { id: 'emp3_safety_yes', page: 3, x: 70, y: 32, width: 2.2, type: 'checkbox', label: 'Safety Yes' },
  { id: 'emp3_safety_no', page: 3, x: 80, y: 32, width: 2.2, type: 'checkbox', label: 'Safety No' },
  
  // Employment Entry 4
  { id: 'emp4_from', page: 3, x: 6, y: 38, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp4_to', page: 3, x: 16, y: 38, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp4_employer', page: 3, x: 38, y: 38, width: 50, type: 'text', label: 'Employer', placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'emp4_position', page: 3, x: 6, y: 42, width: 20, type: 'text', label: 'Position', placeholder: 'Position Held', fontSize: 9 },
  { id: 'emp4_address', page: 3, x: 32, y: 42, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp4_reason', page: 3, x: 6, y: 46, width: 32, type: 'text', label: 'Reason', placeholder: 'Reason for Leaving', fontSize: 9 },
  { id: 'emp4_phone', page: 3, x: 42, y: 46, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp4_fmcsr_yes', page: 3, x: 70, y: 46, width: 2.2, type: 'checkbox', label: 'FMCSR Yes' },
  { id: 'emp4_fmcsr_no', page: 3, x: 80, y: 46, width: 2.2, type: 'checkbox', label: 'FMCSR No' },
  { id: 'emp4_safety_yes', page: 3, x: 70, y: 49, width: 2.2, type: 'checkbox', label: 'Safety Yes' },
  { id: 'emp4_safety_no', page: 3, x: 80, y: 49, width: 2.2, type: 'checkbox', label: 'Safety No' },
  
  // Employment Entry 5
  { id: 'emp5_from', page: 3, x: 6, y: 55, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp5_to', page: 3, x: 16, y: 55, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp5_employer', page: 3, x: 38, y: 55, width: 50, type: 'text', label: 'Employer', placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'emp5_position', page: 3, x: 6, y: 59, width: 20, type: 'text', label: 'Position', placeholder: 'Position Held', fontSize: 9 },
  { id: 'emp5_address', page: 3, x: 32, y: 59, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp5_reason', page: 3, x: 6, y: 63, width: 32, type: 'text', label: 'Reason', placeholder: 'Reason for Leaving', fontSize: 9 },
  { id: 'emp5_phone', page: 3, x: 42, y: 63, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp5_fmcsr_yes', page: 3, x: 70, y: 63, width: 2.2, type: 'checkbox', label: 'FMCSR Yes' },
  { id: 'emp5_fmcsr_no', page: 3, x: 80, y: 63, width: 2.2, type: 'checkbox', label: 'FMCSR No' },
  { id: 'emp5_safety_yes', page: 3, x: 70, y: 66, width: 2.2, type: 'checkbox', label: 'Safety Yes' },
  { id: 'emp5_safety_no', page: 3, x: 80, y: 66, width: 2.2, type: 'checkbox', label: 'Safety No' },
  
  // Employment Entry 6
  { id: 'emp6_from', page: 3, x: 6, y: 72, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp6_to', page: 3, x: 16, y: 72, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp6_employer', page: 3, x: 38, y: 72, width: 50, type: 'text', label: 'Employer', placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'emp6_position', page: 3, x: 6, y: 76, width: 20, type: 'text', label: 'Position', placeholder: 'Position Held', fontSize: 9 },
  { id: 'emp6_address', page: 3, x: 32, y: 76, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp6_reason', page: 3, x: 6, y: 80, width: 32, type: 'text', label: 'Reason', placeholder: 'Reason for Leaving', fontSize: 9 },
  { id: 'emp6_phone', page: 3, x: 42, y: 80, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },
  { id: 'emp6_fmcsr_yes', page: 3, x: 70, y: 80, width: 2.2, type: 'checkbox', label: 'FMCSR Yes' },
  { id: 'emp6_fmcsr_no', page: 3, x: 80, y: 80, width: 2.2, type: 'checkbox', label: 'FMCSR No' },
  { id: 'emp6_safety_yes', page: 3, x: 70, y: 83, width: 2.2, type: 'checkbox', label: 'Safety Yes' },
  { id: 'emp6_safety_no', page: 3, x: 80, y: 83, width: 2.2, type: 'checkbox', label: 'Safety No' },
  
  // Employment Entry 7 (last one on page 3)
  { id: 'emp7_from', page: 3, x: 6, y: 89, width: 8, type: 'text', label: 'From', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp7_to', page: 3, x: 16, y: 89, width: 8, type: 'text', label: 'To', placeholder: 'Mo/Yr', fontSize: 8 },
  { id: 'emp7_employer', page: 3, x: 38, y: 89, width: 50, type: 'text', label: 'Employer', placeholder: 'Present or Last Employer', fontSize: 9 },
  { id: 'emp7_position', page: 3, x: 6, y: 93, width: 20, type: 'text', label: 'Position', placeholder: 'Position Held', fontSize: 9 },
  { id: 'emp7_address', page: 3, x: 32, y: 93, width: 55, type: 'text', label: 'Address', placeholder: 'Address', fontSize: 9 },
  { id: 'emp7_reason', page: 3, x: 6, y: 97, width: 32, type: 'text', label: 'Reason', placeholder: 'Reason for Leaving', fontSize: 9 },
  { id: 'emp7_phone', page: 3, x: 42, y: 97, width: 20, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 9 },

  // ============================================================
  // PAGE 4: CDL DRIVERS APPLICATION (Accident Record, Violations, CDL, Experience)
  // ============================================================
  
  // Accident Record (3 rows)
  { id: 'accident1_date', page: 4, x: 8, y: 14, width: 12, type: 'date', label: 'Accident 1 Date', placeholder: 'MM/DD/YY', fontSize: 8 },
  { id: 'accident1_details', page: 4, x: 22, y: 14, width: 40, type: 'text', label: 'Nature of Accident', placeholder: 'Nature of accident', fontSize: 8 },
  { id: 'accident1_fatalities', page: 4, x: 64, y: 14, width: 8, type: 'text', label: 'Fatalities', placeholder: '0', fontSize: 8 },
  { id: 'accident1_injuries', page: 4, x: 76, y: 14, width: 8, type: 'text', label: 'Injuries', placeholder: '0', fontSize: 8 },
  
  { id: 'accident2_date', page: 4, x: 8, y: 18, width: 12, type: 'date', label: 'Accident 2 Date', placeholder: 'MM/DD/YY', fontSize: 8 },
  { id: 'accident2_details', page: 4, x: 22, y: 18, width: 40, type: 'text', label: 'Nature of Accident', placeholder: 'Nature of accident', fontSize: 8 },
  { id: 'accident2_fatalities', page: 4, x: 64, y: 18, width: 8, type: 'text', label: 'Fatalities', placeholder: '0', fontSize: 8 },
  { id: 'accident2_injuries', page: 4, x: 76, y: 18, width: 8, type: 'text', label: 'Injuries', placeholder: '0', fontSize: 8 },
  
  { id: 'accident3_date', page: 4, x: 8, y: 22, width: 12, type: 'date', label: 'Accident 3 Date', placeholder: 'MM/DD/YY', fontSize: 8 },
  { id: 'accident3_details', page: 4, x: 22, y: 22, width: 40, type: 'text', label: 'Nature of Accident', placeholder: 'Nature of accident', fontSize: 8 },
  { id: 'accident3_fatalities', page: 4, x: 64, y: 22, width: 8, type: 'text', label: 'Fatalities', placeholder: '0', fontSize: 8 },
  { id: 'accident3_injuries', page: 4, x: 76, y: 22, width: 8, type: 'text', label: 'Injuries', placeholder: '0', fontSize: 8 },
  
  // Traffic Violations (4 rows)
  { id: 'violation1_location', page: 4, x: 8, y: 32, width: 18, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'violation1_date', page: 4, x: 28, y: 32, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'violation1_charge', page: 4, x: 42, y: 32, width: 28, type: 'text', label: 'Charge', placeholder: 'Charge', fontSize: 8 },
  { id: 'violation1_penalty', page: 4, x: 72, y: 32, width: 15, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 8 },
  
  { id: 'violation2_location', page: 4, x: 8, y: 36, width: 18, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'violation2_date', page: 4, x: 28, y: 36, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'violation2_charge', page: 4, x: 42, y: 36, width: 28, type: 'text', label: 'Charge', placeholder: 'Charge', fontSize: 8 },
  { id: 'violation2_penalty', page: 4, x: 72, y: 36, width: 15, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 8 },
  
  { id: 'violation3_location', page: 4, x: 8, y: 40, width: 18, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'violation3_date', page: 4, x: 28, y: 40, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'violation3_charge', page: 4, x: 42, y: 40, width: 28, type: 'text', label: 'Charge', placeholder: 'Charge', fontSize: 8 },
  { id: 'violation3_penalty', page: 4, x: 72, y: 40, width: 15, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 8 },
  
  { id: 'violation4_location', page: 4, x: 8, y: 44, width: 18, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'violation4_date', page: 4, x: 28, y: 44, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'violation4_charge', page: 4, x: 42, y: 44, width: 28, type: 'text', label: 'Charge', placeholder: 'Charge', fontSize: 8 },
  { id: 'violation4_penalty', page: 4, x: 72, y: 44, width: 15, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 8 },
  
  // CDL License Information
  { id: 'cdl_number', page: 4, x: 8, y: 52, width: 22, type: 'text', label: 'License Number', required: true, placeholder: 'License Number', fontSize: 9 },
  { id: 'cdl_state', page: 4, x: 32, y: 52, width: 8, type: 'text', label: 'State', required: true, format: 'state', placeholder: 'State', fontSize: 9 },
  { id: 'cdl_endorsements', page: 4, x: 42, y: 52, width: 20, type: 'text', label: 'Type/Endorsements', required: true, placeholder: 'Class A, HAZMAT', fontSize: 9 },
  { id: 'cdl_expiration', page: 4, x: 64, y: 52, width: 18, type: 'date', label: 'Expiration Date', required: true, placeholder: 'MM/DD/YYYY', fontSize: 9 },
  
  // Denied/Suspended/Felony Yes/No checkboxes
  { id: 'denied_yes', page: 4, x: 72, y: 58, width: 2.2, type: 'checkbox', label: 'Denied Yes' },
  { id: 'denied_no', page: 4, x: 82, y: 58, width: 2.2, type: 'checkbox', label: 'Denied No' },
  { id: 'suspended_yes', page: 4, x: 72, y: 62, width: 2.2, type: 'checkbox', label: 'Suspended Yes' },
  { id: 'suspended_no', page: 4, x: 82, y: 62, width: 2.2, type: 'checkbox', label: 'Suspended No' },
  { id: 'felony_yes', page: 4, x: 72, y: 66, width: 2.2, type: 'checkbox', label: 'Felony Yes' },
  { id: 'felony_no', page: 4, x: 82, y: 66, width: 2.2, type: 'checkbox', label: 'Felony No' },
  { id: 'license_explanation', page: 4, x: 8, y: 70, width: 80, type: 'text', label: 'Explanation', placeholder: 'If any above is Yes, explain here', fontSize: 8 },
  
  // Driving Experience table (4 rows: Straight Truck, Tractor Semi-Trailer, Tractor Two Trailer, Other)
  { id: 'exp_straight_type', page: 4, x: 32, y: 78, width: 12, type: 'text', label: 'Type', placeholder: 'Van, Tank', fontSize: 8 },
  { id: 'exp_straight_from', page: 4, x: 46, y: 78, width: 10, type: 'text', label: 'From', placeholder: 'From', fontSize: 8 },
  { id: 'exp_straight_to', page: 4, x: 58, y: 78, width: 10, type: 'text', label: 'To', placeholder: 'To', fontSize: 8 },
  { id: 'exp_straight_miles', page: 4, x: 70, y: 78, width: 15, type: 'text', label: 'Miles', placeholder: 'Approx Miles', fontSize: 8 },
  
  { id: 'exp_semi_type', page: 4, x: 32, y: 82, width: 12, type: 'text', label: 'Type', placeholder: 'Van, Tank', fontSize: 8 },
  { id: 'exp_semi_from', page: 4, x: 46, y: 82, width: 10, type: 'text', label: 'From', placeholder: 'From', fontSize: 8 },
  { id: 'exp_semi_to', page: 4, x: 58, y: 82, width: 10, type: 'text', label: 'To', placeholder: 'To', fontSize: 8 },
  { id: 'exp_semi_miles', page: 4, x: 70, y: 82, width: 15, type: 'text', label: 'Miles', placeholder: 'Approx Miles', fontSize: 8 },
  
  { id: 'exp_doubles_type', page: 4, x: 32, y: 86, width: 12, type: 'text', label: 'Type', placeholder: 'Van, Tank', fontSize: 8 },
  { id: 'exp_doubles_from', page: 4, x: 46, y: 86, width: 10, type: 'text', label: 'From', placeholder: 'From', fontSize: 8 },
  { id: 'exp_doubles_to', page: 4, x: 58, y: 86, width: 10, type: 'text', label: 'To', placeholder: 'To', fontSize: 8 },
  { id: 'exp_doubles_miles', page: 4, x: 70, y: 86, width: 15, type: 'text', label: 'Miles', placeholder: 'Approx Miles', fontSize: 8 },
  
  { id: 'exp_other_class', page: 4, x: 8, y: 90, width: 20, type: 'text', label: 'Other', placeholder: 'Other', fontSize: 8 },
  { id: 'exp_other_type', page: 4, x: 32, y: 90, width: 12, type: 'text', label: 'Type', placeholder: 'Van, Tank', fontSize: 8 },
  { id: 'exp_other_from', page: 4, x: 46, y: 90, width: 10, type: 'text', label: 'From', placeholder: 'From', fontSize: 8 },
  { id: 'exp_other_to', page: 4, x: 58, y: 90, width: 10, type: 'text', label: 'To', placeholder: 'To', fontSize: 8 },
  { id: 'exp_other_miles', page: 4, x: 70, y: 90, width: 15, type: 'text', label: 'Miles', placeholder: 'Approx Miles', fontSize: 8 },

  // ============================================================
  // PAGE 5: CDL DRIVERS APPLICATION (States, Training, Applicant Statement)
  // ============================================================
  
  // States Operated (past 5 years)
  { id: 'statesOperated', page: 5, x: 8, y: 9, width: 80, type: 'text', label: 'States Operated In', required: true, placeholder: 'WA, OR, CA, ID, MT, etc.', fontSize: 9 },
  
  // Special Courses or Training
  { id: 'specialCourses', page: 5, x: 8, y: 15, width: 80, type: 'text', label: 'Special Courses or Training', placeholder: 'Describe special training', fontSize: 9 },
  
  // Safe Driving Awards
  { id: 'safetyAwards', page: 5, x: 8, y: 21, width: 80, type: 'text', label: 'Safe Driving Awards', placeholder: 'List safety awards', fontSize: 9 },
  
  // Other Training
  { id: 'otherTraining', page: 5, x: 8, y: 27, width: 80, type: 'text', label: 'Other Training', placeholder: 'Other courses and training', fontSize: 9 },
  
  // Special Equipment
  { id: 'specialEquipment', page: 5, x: 8, y: 33, width: 80, type: 'text', label: 'Special Equipment', placeholder: 'Special equipment or technical materials', fontSize: 9 },

  // Violations Table (continues from page 4 at top of page 5)
  { id: 'violation5_location', page: 5, x: 8, y: 41, width: 18, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'violation5_date', page: 5, x: 28, y: 41, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'violation5_charge', page: 5, x: 42, y: 41, width: 28, type: 'text', label: 'Charge', placeholder: 'Charge', fontSize: 8 },
  { id: 'violation5_penalty', page: 5, x: 72, y: 41, width: 15, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 8 },
  
  { id: 'violation6_location', page: 5, x: 8, y: 45, width: 18, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'violation6_date', page: 5, x: 28, y: 45, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'violation6_charge', page: 5, x: 42, y: 45, width: 28, type: 'text', label: 'Charge', placeholder: 'Charge', fontSize: 8 },
  { id: 'violation6_penalty', page: 5, x: 72, y: 45, width: 15, type: 'text', label: 'Penalty', placeholder: 'Penalty', fontSize: 8 },
  
  // Applicant Statement checkboxes (if any above is Yes, explain)
  { id: 'p5_explain', page: 5, x: 8, y: 86, width: 80, type: 'text', label: 'If any above is Yes, explain here', placeholder: 'Explanation', fontSize: 9 },

  // ============================================================
  // PAGE 6: APPLICANT ACCEPTANCE
  // ============================================================
  
  { id: 'p6_printName', page: 6, x: 8, y: 77, width: 40, type: 'text', label: 'Print Name', required: true, placeholder: 'Print Name', fontSize: 10 },
  { id: 'p6_signature', page: 6, x: 8, y: 84, width: 45, type: 'signature', label: 'Applicants Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p6_date', page: 6, x: 70, y: 84, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 7: CERTIFICATION OF COMPLIANCE WITH DRIVER LICENSE REQUIREMENTS
  // ============================================================
  
  { id: 'p7_statesOperated', page: 7, x: 8, y: 5, width: 80, type: 'text', label: 'States Operated', placeholder: 'WA, OR, CA, ID, etc.', fontSize: 9 },
  { id: 'p7_specialTraining', page: 7, x: 8, y: 16, width: 80, type: 'text', label: 'Describe Special Training', placeholder: 'Special training', fontSize: 9 },
  { id: 'p7_safetyAwards', page: 7, x: 8, y: 24, width: 80, type: 'text', label: 'List Safety Awards', placeholder: 'Safety awards', fontSize: 9 },
  { id: 'p7_otherTraining', page: 7, x: 8, y: 32, width: 80, type: 'text', label: 'Other Training Not Listed Above', placeholder: 'Other training', fontSize: 9 },
  { id: 'p7_specialEquipment', page: 7, x: 8, y: 40, width: 80, type: 'text', label: 'Special Equipment Skills', placeholder: 'Special equipment', fontSize: 9 },
  
  // License Info
  { id: 'p7_licenseNo', page: 7, x: 8, y: 68, width: 25, type: 'text', label: 'Drivers License No.', required: true, placeholder: 'License No.', fontSize: 10 },
  { id: 'p7_state', page: 7, x: 40, y: 68, width: 15, type: 'text', label: 'State', required: true, placeholder: 'State', fontSize: 10 },
  { id: 'p7_expDate', page: 7, x: 68, y: 68, width: 18, type: 'date', label: 'Exp. Date', required: true, placeholder: 'Exp Date', fontSize: 10 },
  
  // Signature Section
  { id: 'p7_signature', page: 7, x: 8, y: 76, width: 45, type: 'signature', label: 'Applicants Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p7_date', page: 7, x: 68, y: 76, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },
  { id: 'p7_printName', page: 7, x: 8, y: 84, width: 40, type: 'text', label: 'Print Name', required: true, placeholder: 'Print Name', fontSize: 10 },

  // ============================================================
  // PAGE 8: DRIVERS STATEMENT OF ON-DUTY HOURS
  // ============================================================
  
  { id: 'p8_driverName', page: 8, x: 8, y: 35, width: 35, type: 'text', label: 'Driver Name (print)', required: true, placeholder: 'Driver Name', fontSize: 10 },
  { id: 'p8_ssn', page: 8, x: 60, y: 35, width: 28, type: 'text', label: 'Social Security Number', required: true, format: 'ssn', placeholder: 'XXX-XX-XXXX', fontSize: 10 },
  
  // Driver's License row
  { id: 'p8_licenseState', page: 8, x: 22, y: 41, width: 10, type: 'text', label: 'State', placeholder: 'State', fontSize: 9 },
  { id: 'p8_licenseNumber', page: 8, x: 38, y: 41, width: 20, type: 'text', label: 'Number', placeholder: 'Number', fontSize: 9 },
  { id: 'p8_licenseClass', page: 8, x: 62, y: 41, width: 10, type: 'text', label: 'Class', placeholder: 'Class', fontSize: 9 },
  { id: 'p8_endorsements', page: 8, x: 76, y: 41, width: 15, type: 'text', label: 'Endorsements', placeholder: 'Endorse', fontSize: 9 },
  
  // On-Duty Hours Table (7 days)
  { id: 'p8_day1_date', page: 8, x: 26, y: 50, width: 7, type: 'text', label: 'Day 1 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_day2_date', page: 8, x: 34, y: 50, width: 7, type: 'text', label: 'Day 2 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_day3_date', page: 8, x: 42, y: 50, width: 7, type: 'text', label: 'Day 3 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_day4_date', page: 8, x: 50, y: 50, width: 7, type: 'text', label: 'Day 4 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_day5_date', page: 8, x: 58, y: 50, width: 7, type: 'text', label: 'Day 5 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_day6_date', page: 8, x: 66, y: 50, width: 7, type: 'text', label: 'Day 6 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_day7_date', page: 8, x: 74, y: 50, width: 7, type: 'text', label: 'Day 7 Date', placeholder: '', fontSize: 8 },
  { id: 'p8_totals_date', page: 8, x: 82, y: 50, width: 8, type: 'text', label: 'Totals', placeholder: '', fontSize: 8 },
  
  // On Duty row
  { id: 'p8_day1_onduty', page: 8, x: 26, y: 54, width: 7, type: 'text', label: 'Day 1 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_day2_onduty', page: 8, x: 34, y: 54, width: 7, type: 'text', label: 'Day 2 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_day3_onduty', page: 8, x: 42, y: 54, width: 7, type: 'text', label: 'Day 3 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_day4_onduty', page: 8, x: 50, y: 54, width: 7, type: 'text', label: 'Day 4 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_day5_onduty', page: 8, x: 58, y: 54, width: 7, type: 'text', label: 'Day 5 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_day6_onduty', page: 8, x: 66, y: 54, width: 7, type: 'text', label: 'Day 6 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_day7_onduty', page: 8, x: 74, y: 54, width: 7, type: 'text', label: 'Day 7 On Duty', placeholder: '', fontSize: 8 },
  { id: 'p8_totals_onduty', page: 8, x: 82, y: 54, width: 8, type: 'text', label: 'Totals', placeholder: '', fontSize: 8 },
  
  // Driving row
  { id: 'p8_day1_driving', page: 8, x: 26, y: 58, width: 7, type: 'text', label: 'Day 1 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_day2_driving', page: 8, x: 34, y: 58, width: 7, type: 'text', label: 'Day 2 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_day3_driving', page: 8, x: 42, y: 58, width: 7, type: 'text', label: 'Day 3 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_day4_driving', page: 8, x: 50, y: 58, width: 7, type: 'text', label: 'Day 4 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_day5_driving', page: 8, x: 58, y: 58, width: 7, type: 'text', label: 'Day 5 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_day6_driving', page: 8, x: 66, y: 58, width: 7, type: 'text', label: 'Day 6 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_day7_driving', page: 8, x: 74, y: 58, width: 7, type: 'text', label: 'Day 7 Driving', placeholder: '', fontSize: 8 },
  { id: 'p8_totals_driving', page: 8, x: 82, y: 58, width: 8, type: 'text', label: 'Totals', placeholder: '', fontSize: 8 },
  
  // Last relieved from work
  { id: 'p8_ampm', page: 8, x: 15, y: 71, width: 8, type: 'text', label: 'AM/PM', placeholder: 'AM/PM', fontSize: 9 },
  { id: 'p8_day', page: 8, x: 42, y: 71, width: 8, type: 'text', label: 'Day', placeholder: 'Day', fontSize: 9 },
  { id: 'p8_month', page: 8, x: 55, y: 71, width: 10, type: 'text', label: 'Month', placeholder: 'Month', fontSize: 9 },
  { id: 'p8_year', page: 8, x: 70, y: 71, width: 10, type: 'text', label: 'Year', placeholder: 'Year', fontSize: 9 },
  
  { id: 'p8_signature', page: 8, x: 8, y: 80, width: 45, type: 'signature', label: 'Drivers Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p8_signDate', page: 8, x: 70, y: 80, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 9: PERMISSION TO REQUEST STATE DRIVER MVR
  // ============================================================
  
  { id: 'p9_firstName', page: 9, x: 8, y: 43, width: 22, type: 'text', label: 'First Name', required: true, placeholder: 'First Name', fontSize: 10 },
  { id: 'p9_mi', page: 9, x: 35, y: 43, width: 8, type: 'text', label: 'MI', placeholder: 'MI', fontSize: 10 },
  { id: 'p9_lastName', page: 9, x: 48, y: 43, width: 35, type: 'text', label: 'Last Name', required: true, placeholder: 'Last Name', fontSize: 10 },
  
  { id: 'p9_address', page: 9, x: 8, y: 51, width: 30, type: 'text', label: 'Address', required: true, placeholder: 'Address', fontSize: 10 },
  { id: 'p9_city', page: 9, x: 42, y: 51, width: 18, type: 'text', label: 'City', required: true, placeholder: 'City', fontSize: 10 },
  { id: 'p9_state', page: 9, x: 64, y: 51, width: 8, type: 'text', label: 'State', required: true, placeholder: 'ST', fontSize: 10 },
  { id: 'p9_zip', page: 9, x: 76, y: 51, width: 12, type: 'text', label: 'Zip', required: true, placeholder: 'ZIP', fontSize: 10 },
  
  { id: 'p9_dob', page: 9, x: 8, y: 60, width: 18, type: 'date', label: 'Date of Birth', required: true, placeholder: 'DOB', fontSize: 10 },
  { id: 'p9_licenseNumber', page: 9, x: 32, y: 60, width: 25, type: 'text', label: 'License Number', required: true, placeholder: 'License Number', fontSize: 10 },
  { id: 'p9_licenseState', page: 9, x: 62, y: 60, width: 15, type: 'text', label: 'State', required: true, placeholder: 'State', fontSize: 10 },
  
  { id: 'p9_signature', page: 9, x: 8, y: 70, width: 45, type: 'signature', label: 'Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p9_date', page: 9, x: 70, y: 70, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 10: DRIVING RECORD RELEASE OF INTEREST (WA State DOL)
  // ============================================================
  
  { id: 'p10_fullName', page: 10, x: 8, y: 57, width: 60, type: 'text', label: 'Full Name', required: true, placeholder: 'Full Name (First, Middle, Last)', fontSize: 10 },
  { id: 'p10_dob', page: 10, x: 42, y: 64, width: 18, type: 'date', label: 'Date of Birth', required: true, placeholder: 'mm/dd/yyyy', fontSize: 10 },
  { id: 'p10_licenseNumber', page: 10, x: 62, y: 64, width: 25, type: 'text', label: 'WA Driver License Number', required: true, placeholder: 'License Number', fontSize: 10 },
  
  { id: 'p10_signature', page: 10, x: 35, y: 87, width: 40, type: 'signature', label: 'Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p10_date', page: 10, x: 77, y: 87, width: 15, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 11: ANNUAL CERTIFICATE OF VIOLATIONS (COV)
  // ============================================================
  
  { id: 'p11_driverName', page: 11, x: 8, y: 11, width: 55, type: 'text', label: 'Driver Name', required: true, placeholder: 'Driver Name', fontSize: 10 },
  { id: 'p11_licenseNo', page: 11, x: 8, y: 16, width: 25, type: 'text', label: 'License No.', required: true, placeholder: 'License No.', fontSize: 10 },
  { id: 'p11_licenseState', page: 11, x: 50, y: 16, width: 25, type: 'text', label: 'State', required: true, placeholder: 'State', fontSize: 10 },
  
  // Violations checkbox options
  { id: 'p11_hasViolations', page: 11, x: 12, y: 26, width: 2.2, type: 'checkbox', label: 'Violations are listed' },
  { id: 'p11_noViolations', page: 11, x: 50, y: 26, width: 2.2, type: 'checkbox', label: 'No violations' },
  
  // Violations table (4 rows)
  { id: 'p11_viol1_date', page: 11, x: 8, y: 35, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'p11_viol1_offense', page: 11, x: 22, y: 35, width: 22, type: 'text', label: 'Offense', placeholder: 'Offense', fontSize: 8 },
  { id: 'p11_viol1_location', page: 11, x: 46, y: 35, width: 20, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'p11_viol1_vehicle', page: 11, x: 68, y: 35, width: 20, type: 'text', label: 'Vehicle Type', placeholder: 'Vehicle', fontSize: 8 },
  
  { id: 'p11_viol2_date', page: 11, x: 8, y: 40, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'p11_viol2_offense', page: 11, x: 22, y: 40, width: 22, type: 'text', label: 'Offense', placeholder: 'Offense', fontSize: 8 },
  { id: 'p11_viol2_location', page: 11, x: 46, y: 40, width: 20, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'p11_viol2_vehicle', page: 11, x: 68, y: 40, width: 20, type: 'text', label: 'Vehicle Type', placeholder: 'Vehicle', fontSize: 8 },
  
  { id: 'p11_viol3_date', page: 11, x: 8, y: 45, width: 12, type: 'date', label: 'Date', placeholder: 'Date', fontSize: 8 },
  { id: 'p11_viol3_offense', page: 11, x: 22, y: 45, width: 22, type: 'text', label: 'Offense', placeholder: 'Offense', fontSize: 8 },
  { id: 'p11_viol3_location', page: 11, x: 46, y: 45, width: 20, type: 'text', label: 'Location', placeholder: 'Location', fontSize: 8 },
  { id: 'p11_viol3_vehicle', page: 11, x: 68, y: 45, width: 20, type: 'text', label: 'Vehicle Type', placeholder: 'Vehicle', fontSize: 8 },
  
  // Signature section
  { id: 'p11_signature', page: 11, x: 8, y: 65, width: 45, type: 'signature', label: 'Driver Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p11_date', page: 11, x: 70, y: 65, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 12: CERTIFICATE OF RECEIPT - DRUG AND ALCOHOL ABUSE
  // ============================================================
  
  { id: 'p12_employeeName', page: 12, x: 8, y: 60, width: 50, type: 'text', label: 'Employees Printed Name', required: true, placeholder: 'Printed Name', fontSize: 10 },
  { id: 'p12_signature', page: 12, x: 8, y: 68, width: 45, type: 'signature', label: 'Employees Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p12_date', page: 12, x: 70, y: 68, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 13: CELL PHONE USE POLICY
  // ============================================================
  
  { id: 'p13_signature', page: 13, x: 8, y: 76, width: 45, type: 'signature', label: 'Driver Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p13_date', page: 13, x: 70, y: 76, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 14: PREVIOUS EMPLOYER INQUIRY
  // ============================================================
  
  { id: 'p14_applicantName', page: 14, x: 8, y: 8, width: 55, type: 'text', label: 'Applicant Name', required: true, placeholder: 'Applicant Name', fontSize: 10 },
  { id: 'p14_ssn', page: 14, x: 70, y: 8, width: 22, type: 'text', label: 'SSN', required: true, format: 'ssn', placeholder: 'XXX-XX-XXXX', fontSize: 10 },
  { id: 'p14_signature', page: 14, x: 8, y: 22, width: 45, type: 'signature', label: 'Applicant Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'p14_date', page: 14, x: 70, y: 22, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 15: FORM I-9 (Page 1 - Employee Info)
  // ============================================================
  
  // Section 1: Employee Information
  { id: 'i9_lastName', page: 15, x: 6, y: 16.5, width: 18, type: 'text', label: 'Last Name', required: true, placeholder: 'Last Name', fontSize: 8 },
  { id: 'i9_firstName', page: 15, x: 26, y: 16.5, width: 18, type: 'text', label: 'First Name', required: true, placeholder: 'First Name', fontSize: 8 },
  { id: 'i9_middleInitial', page: 15, x: 46, y: 16.5, width: 6, type: 'text', label: 'Middle Initial', placeholder: 'MI', fontSize: 8 },
  { id: 'i9_otherNames', page: 15, x: 55, y: 16.5, width: 18, type: 'text', label: 'Other Last Names', placeholder: 'Other Names', fontSize: 8 },
  
  { id: 'i9_address', page: 15, x: 6, y: 20.5, width: 18, type: 'text', label: 'Address', required: true, placeholder: 'Address', fontSize: 8 },
  { id: 'i9_aptNumber', page: 15, x: 26, y: 20.5, width: 8, type: 'text', label: 'Apt Number', placeholder: 'Apt', fontSize: 8 },
  { id: 'i9_city', page: 15, x: 36, y: 20.5, width: 14, type: 'text', label: 'City', required: true, placeholder: 'City', fontSize: 8 },
  { id: 'i9_state', page: 15, x: 52, y: 20.5, width: 8, type: 'text', label: 'State', required: true, placeholder: 'State', fontSize: 8 },
  { id: 'i9_zip', page: 15, x: 62, y: 20.5, width: 10, type: 'text', label: 'ZIP', required: true, placeholder: 'ZIP', fontSize: 8 },
  
  { id: 'i9_dob', page: 15, x: 6, y: 24.5, width: 15, type: 'date', label: 'Date of Birth', required: true, placeholder: 'mm/dd/yyyy', fontSize: 8 },
  { id: 'i9_ssn1', page: 15, x: 23, y: 24.5, width: 4, type: 'text', label: 'SSN Part 1', placeholder: '', fontSize: 8 },
  { id: 'i9_ssn2', page: 15, x: 28, y: 24.5, width: 3, type: 'text', label: 'SSN Part 2', placeholder: '', fontSize: 8 },
  { id: 'i9_ssn3', page: 15, x: 33, y: 24.5, width: 5, type: 'text', label: 'SSN Part 3', placeholder: '', fontSize: 8 },
  { id: 'i9_email', page: 15, x: 42, y: 24.5, width: 20, type: 'text', label: 'Email', placeholder: 'Email', fontSize: 8 },
  { id: 'i9_phone', page: 15, x: 65, y: 24.5, width: 15, type: 'text', label: 'Phone', placeholder: 'Phone', fontSize: 8 },
  
  // Citizenship checkboxes
  { id: 'i9_citizen', page: 15, x: 6, y: 32.5, width: 2.2, type: 'checkbox', label: 'US Citizen' },
  { id: 'i9_noncitizenNational', page: 15, x: 6, y: 35.5, width: 2.2, type: 'checkbox', label: 'Noncitizen National' },
  { id: 'i9_lawfulResident', page: 15, x: 6, y: 38.5, width: 2.2, type: 'checkbox', label: 'Lawful Permanent Resident' },
  { id: 'i9_alienAuthorized', page: 15, x: 6, y: 42, width: 2.2, type: 'checkbox', label: 'Alien Authorized to Work' },
  
  // Alien/USCIS number fields
  { id: 'i9_uscisNumber', page: 15, x: 36, y: 38.5, width: 30, type: 'text', label: 'USCIS Number', placeholder: 'USCIS Number', fontSize: 8 },
  { id: 'i9_alienExpDate', page: 15, x: 36, y: 42, width: 20, type: 'date', label: 'Expiration Date', placeholder: 'Exp Date', fontSize: 8 },
  
  // Signature section
  { id: 'i9_signature', page: 15, x: 6, y: 68.5, width: 45, type: 'signature', label: 'Employee Signature', required: true, placeholder: 'Signature', fontSize: 10 },
  { id: 'i9_signatureDate', page: 15, x: 62, y: 68.5, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 18: W-9 FORM
  // ============================================================
  
  { id: 'w9_name', page: 18, x: 8, y: 9, width: 70, type: 'text', label: 'Name', required: true, placeholder: 'Name as shown on tax return', fontSize: 9 },
  { id: 'w9_businessName', page: 18, x: 8, y: 13, width: 70, type: 'text', label: 'Business Name', placeholder: 'Business name if different', fontSize: 9 },
  
  // Tax classification checkboxes
  { id: 'w9_individual', page: 18, x: 8, y: 18, width: 2.2, type: 'checkbox', label: 'Individual/Sole Proprietor' },
  { id: 'w9_cCorp', page: 18, x: 38, y: 18, width: 2.2, type: 'checkbox', label: 'C Corporation' },
  { id: 'w9_sCorp', page: 18, x: 52, y: 18, width: 2.2, type: 'checkbox', label: 'S Corporation' },
  { id: 'w9_partnership', page: 18, x: 66, y: 18, width: 2.2, type: 'checkbox', label: 'Partnership' },
  { id: 'w9_trustEstate', page: 18, x: 80, y: 18, width: 2.2, type: 'checkbox', label: 'Trust/Estate' },
  { id: 'w9_llc', page: 18, x: 8, y: 21, width: 2.2, type: 'checkbox', label: 'LLC' },
  { id: 'w9_other', page: 18, x: 8, y: 24, width: 2.2, type: 'checkbox', label: 'Other' },
  
  { id: 'w9_address', page: 18, x: 8, y: 31, width: 60, type: 'text', label: 'Address', required: true, placeholder: 'Address', fontSize: 9 },
  { id: 'w9_cityStateZip', page: 18, x: 8, y: 35, width: 60, type: 'text', label: 'City, State, ZIP', required: true, placeholder: 'City, State, ZIP', fontSize: 9 },
  
  // SSN or EIN (Part I)
  { id: 'w9_ssn1', page: 18, x: 72, y: 40, width: 3.5, type: 'text', label: 'SSN Part 1', placeholder: '', fontSize: 9 },
  { id: 'w9_ssn2', page: 18, x: 76, y: 40, width: 3, type: 'text', label: 'SSN Part 2', placeholder: '', fontSize: 9 },
  { id: 'w9_ssn3', page: 18, x: 80, y: 40, width: 5, type: 'text', label: 'SSN Part 3', placeholder: '', fontSize: 9 },
  
  { id: 'w9_ein1', page: 18, x: 72, y: 47, width: 3, type: 'text', label: 'EIN Part 1', placeholder: '', fontSize: 9 },
  { id: 'w9_ein2', page: 18, x: 76, y: 47, width: 8, type: 'text', label: 'EIN Part 2', placeholder: '', fontSize: 9 },
  
  // Signature
  { id: 'w9_signature', page: 18, x: 8, y: 78, width: 50, type: 'signature', label: 'Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'w9_date', page: 18, x: 68, y: 78, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 19: FAIR CREDIT REPORTING ACT DISCLOSURE
  // ============================================================
  
  { id: 'fcra_signature', page: 19, x: 8, y: 53, width: 45, type: 'signature', label: 'Applicants Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'fcra_date', page: 19, x: 60, y: 53, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },
  { id: 'fcra_printName', page: 19, x: 8, y: 62, width: 35, type: 'text', label: 'Print Name', required: true, placeholder: 'Print Name', fontSize: 10 },
  { id: 'fcra_ssn', page: 19, x: 60, y: 62, width: 22, type: 'text', label: 'S.S.N.', required: true, format: 'ssn', placeholder: 'XXX-XX-XXXX', fontSize: 10 },

  // ============================================================
  // PAGE 20: FMCSA DRUG AND ALCOHOL CLEARINGHOUSE LIMITED CONSENT
  // ============================================================
  
  { id: 'fmcsa_firstName', page: 20, x: 8, y: 52, width: 30, type: 'text', label: 'First Name', required: true, placeholder: 'First Name', fontSize: 10 },
  { id: 'fmcsa_lastName', page: 20, x: 50, y: 52, width: 35, type: 'text', label: 'Last Name', required: true, placeholder: 'Last Name', fontSize: 10 },
  
  { id: 'fmcsa_dob', page: 20, x: 8, y: 63, width: 18, type: 'date', label: 'Date of Birth', required: true, placeholder: 'DOB', fontSize: 10 },
  { id: 'fmcsa_licenseNumber', page: 20, x: 32, y: 63, width: 28, type: 'text', label: 'License Number', required: true, placeholder: 'License Number', fontSize: 10 },
  { id: 'fmcsa_state', page: 20, x: 65, y: 63, width: 18, type: 'text', label: 'State', required: true, placeholder: 'State', fontSize: 10 },
  
  { id: 'fmcsa_signature', page: 20, x: 8, y: 76, width: 45, type: 'signature', label: 'Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'fmcsa_date', page: 20, x: 68, y: 76, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },

  // ============================================================
  // PAGE 22: PSP AUTHORIZATION
  // ============================================================
  
  { id: 'psp_date', page: 22, x: 8, y: 10, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'Date', fontSize: 10 },
  { id: 'psp_signature', page: 22, x: 38, y: 10, width: 45, type: 'signature', label: 'Signature', required: true, placeholder: 'Signature', fontSize: 11 },
  { id: 'psp_printName', page: 22, x: 38, y: 18, width: 45, type: 'text', label: 'Name (Please Print)', required: true, placeholder: 'Print Name', fontSize: 10 },
  
  // Bottom of page signature
  { id: 'psp_signatureDate2', page: 22, x: 8, y: 84, width: 18, type: 'date', label: 'Date', required: true, placeholder: 'MM/DD/YYYY', fontSize: 10 },
  { id: 'psp_fullLegalName', page: 22, x: 8, y: 91, width: 50, type: 'text', label: 'Full Legal Name', required: true, placeholder: 'Full Legal Name', fontSize: 10 },
]

// Helper functions
export function getFieldsForPage(pageNumber: number): FieldDefinition[] {
  return OVERLAY_FIELDS.filter(f => f.page === pageNumber)
}

export function getRequiredFields(): FieldDefinition[] {
  return OVERLAY_FIELDS.filter(f => f.required)
}

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
