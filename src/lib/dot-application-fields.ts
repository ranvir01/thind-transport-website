// Thind Transport DOT Application - Field Map
// Based on actual PDF structure (25 pages)
// PDF coordinates: 612x792 pts, Y=0 at bottom

import type { FieldDefinition } from "@/components/pdf-mapper/FieldEditor"

export const DOT_APPLICATION_FIELDS: FieldDefinition[] = [
  // ============================================
  // PAGE 1: DQ FILE CHECKLIST (Internal Use)
  // ============================================
  { id: "dq_driver_name", label: "Driver Name", type: "text", page: 1, x: 180, y: 710, width: 250, height: 12, fontSize: 10, required: false, section: "DQ Checklist" },
  { id: "dq_hire_date", label: "Hire Date", type: "text", page: 1, x: 120, y: 690, width: 70, height: 12, fontSize: 10, required: false, section: "DQ Checklist" },
  { id: "dq_complete_date", label: "DQ File Complete Date", type: "text", page: 1, x: 320, y: 690, width: 70, height: 12, fontSize: 10, required: false, section: "DQ Checklist" },
  { id: "dq_address", label: "Address", type: "text", page: 1, x: 100, y: 670, width: 400, height: 12, fontSize: 10, required: false, section: "DQ Checklist" },
  { id: "dq_phone", label: "Phone", type: "text", page: 1, x: 90, y: 650, width: 120, height: 12, fontSize: 10, required: false, section: "DQ Checklist" },

  // ============================================
  // PAGE 2: APPLICANT INFORMATION
  // ============================================
  // Top section
  { id: "app_date", label: "Date", type: "date", page: 2, x: 480, y: 680, width: 90, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  
  // Position checkboxes
  { id: "pos_contract_driver", label: "Contract Driver", type: "checkbox", page: 2, x: 200, y: 660, width: 12, height: 12, fontSize: 10, required: false, section: "Applicant Information", checkChar: "X" },
  { id: "pos_contractors_driver", label: "Contractor's Driver", type: "checkbox", page: 2, x: 300, y: 660, width: 12, height: 12, fontSize: 10, required: false, section: "Applicant Information", checkChar: "X" },
  
  // Personal Info
  { id: "applicant_name", label: "Name", type: "text", page: 2, x: 100, y: 630, width: 250, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "phone", label: "Phone", type: "text", page: 2, x: 380, y: 630, width: 120, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "emergency_phone", label: "Emergency Phone", type: "text", page: 2, x: 480, y: 610, width: 100, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  
  { id: "age", label: "Age", type: "text", page: 2, x: 100, y: 590, width: 40, height: 12, fontSize: 10, required: false, section: "Applicant Information" },
  { id: "dob", label: "Date of Birth", type: "date", page: 2, x: 200, y: 590, width: 90, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "ssn", label: "Social Security Number", type: "text", page: 2, x: 380, y: 590, width: 120, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  
  { id: "physical_exam_exp", label: "Physical Exam Expiration Date", type: "date", page: 2, x: 250, y: 550, width: 90, height: 12, fontSize: 10, required: true, section: "Applicant Information" },
  
  // Current & Previous Addresses (3 years)
  { id: "addr1_street", label: "Address 1 (Current)", type: "text", page: 2, x: 72, y: 510, width: 300, height: 12, fontSize: 9, required: true, section: "Address History" },
  { id: "addr1_from", label: "From", type: "text", page: 2, x: 400, y: 510, width: 50, height: 12, fontSize: 9, required: true, section: "Address History" },
  { id: "addr1_to", label: "To", type: "text", page: 2, x: 470, y: 510, width: 50, height: 12, fontSize: 9, required: true, section: "Address History" },
  
  { id: "addr2_street", label: "Address 2", type: "text", page: 2, x: 72, y: 490, width: 300, height: 12, fontSize: 9, required: false, section: "Address History" },
  { id: "addr2_from", label: "From", type: "text", page: 2, x: 400, y: 490, width: 50, height: 12, fontSize: 9, required: false, section: "Address History" },
  { id: "addr2_to", label: "To", type: "text", page: 2, x: 470, y: 490, width: 50, height: 12, fontSize: 9, required: false, section: "Address History" },
  
  { id: "addr3_street", label: "Address 3", type: "text", page: 2, x: 72, y: 470, width: 300, height: 12, fontSize: 9, required: false, section: "Address History" },
  { id: "addr3_from", label: "From", type: "text", page: 2, x: 400, y: 470, width: 50, height: 12, fontSize: 9, required: false, section: "Address History" },
  { id: "addr3_to", label: "To", type: "text", page: 2, x: 470, y: 470, width: 50, height: 12, fontSize: 9, required: false, section: "Address History" },
  
  // Worked for company before
  { id: "worked_before_yes", label: "Worked Before: Yes", type: "checkbox", page: 2, x: 280, y: 430, width: 12, height: 12, fontSize: 10, required: false, section: "Applicant Information", checkChar: "X" },
  { id: "worked_before_no", label: "Worked Before: No", type: "checkbox", page: 2, x: 330, y: 430, width: 12, height: 12, fontSize: 10, required: false, section: "Applicant Information", checkChar: "X" },
  { id: "worked_before_from", label: "If Yes, From", type: "text", page: 2, x: 180, y: 410, width: 60, height: 12, fontSize: 9, required: false, section: "Applicant Information" },
  { id: "worked_before_to", label: "To", type: "text", page: 2, x: 260, y: 410, width: 60, height: 12, fontSize: 9, required: false, section: "Applicant Information" },
  { id: "worked_before_reason", label: "Reason for Leaving", type: "text", page: 2, x: 180, y: 390, width: 350, height: 12, fontSize: 9, required: false, section: "Applicant Information" },
  
  // Education - Circle highest grade
  { id: "edu_grade_school", label: "Grade School (1-12)", type: "text", page: 2, x: 200, y: 350, width: 30, height: 12, fontSize: 10, required: false, section: "Education" },
  { id: "edu_college", label: "College (1-4)", type: "text", page: 2, x: 320, y: 350, width: 30, height: 12, fontSize: 10, required: false, section: "Education" },
  { id: "edu_post_grad", label: "Post Graduate (1-4)", type: "text", page: 2, x: 440, y: 350, width: 30, height: 12, fontSize: 10, required: false, section: "Education" },

  // ============================================
  // PAGE 3: EMPLOYMENT HISTORY
  // ============================================
  // Employer 1
  { id: "emp1_from", label: "Emp 1 From (Mo/Yr)", type: "text", page: 3, x: 72, y: 700, width: 50, height: 12, fontSize: 9, required: true, section: "Employment History" },
  { id: "emp1_to", label: "Emp 1 To (Mo/Yr)", type: "text", page: 3, x: 130, y: 700, width: 50, height: 12, fontSize: 9, required: true, section: "Employment History" },
  { id: "emp1_name", label: "Employer 1 Name", type: "text", page: 3, x: 200, y: 700, width: 300, height: 12, fontSize: 9, required: true, section: "Employment History" },
  { id: "emp1_position", label: "Position Held", type: "text", page: 3, x: 72, y: 680, width: 150, height: 12, fontSize: 9, required: true, section: "Employment History" },
  { id: "emp1_address", label: "Address", type: "text", page: 3, x: 240, y: 680, width: 260, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp1_reason", label: "Reason for Leaving", type: "text", page: 3, x: 72, y: 660, width: 200, height: 12, fontSize: 9, required: true, section: "Employment History" },
  { id: "emp1_phone", label: "Phone", type: "text", page: 3, x: 350, y: 660, width: 100, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp1_fmcsr_yes", label: "FMCSR: Yes", type: "checkbox", page: 3, x: 400, y: 640, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp1_fmcsr_no", label: "FMCSR: No", type: "checkbox", page: 3, x: 450, y: 640, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp1_dot_drug_yes", label: "DOT Drug Test: Yes", type: "checkbox", page: 3, x: 400, y: 620, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp1_dot_drug_no", label: "DOT Drug Test: No", type: "checkbox", page: 3, x: 450, y: 620, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },

  // Employer 2
  { id: "emp2_from", label: "Emp 2 From", type: "text", page: 3, x: 72, y: 580, width: 50, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_to", label: "Emp 2 To", type: "text", page: 3, x: 130, y: 580, width: 50, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_name", label: "Employer 2 Name", type: "text", page: 3, x: 200, y: 580, width: 300, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_position", label: "Position", type: "text", page: 3, x: 72, y: 560, width: 150, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_address", label: "Address", type: "text", page: 3, x: 240, y: 560, width: 260, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_reason", label: "Reason for Leaving", type: "text", page: 3, x: 72, y: 540, width: 200, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_phone", label: "Phone", type: "text", page: 3, x: 350, y: 540, width: 100, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp2_fmcsr_yes", label: "FMCSR: Yes", type: "checkbox", page: 3, x: 400, y: 520, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp2_fmcsr_no", label: "FMCSR: No", type: "checkbox", page: 3, x: 450, y: 520, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp2_dot_drug_yes", label: "DOT Drug: Yes", type: "checkbox", page: 3, x: 400, y: 500, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp2_dot_drug_no", label: "DOT Drug: No", type: "checkbox", page: 3, x: 450, y: 500, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },

  // Employer 3
  { id: "emp3_from", label: "Emp 3 From", type: "text", page: 3, x: 72, y: 460, width: 50, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_to", label: "Emp 3 To", type: "text", page: 3, x: 130, y: 460, width: 50, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_name", label: "Employer 3 Name", type: "text", page: 3, x: 200, y: 460, width: 300, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_position", label: "Position", type: "text", page: 3, x: 72, y: 440, width: 150, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_address", label: "Address", type: "text", page: 3, x: 240, y: 440, width: 260, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_reason", label: "Reason", type: "text", page: 3, x: 72, y: 420, width: 200, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_phone", label: "Phone", type: "text", page: 3, x: 350, y: 420, width: 100, height: 12, fontSize: 9, required: false, section: "Employment History" },
  { id: "emp3_fmcsr_yes", label: "FMCSR: Yes", type: "checkbox", page: 3, x: 400, y: 400, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp3_fmcsr_no", label: "FMCSR: No", type: "checkbox", page: 3, x: 450, y: 400, width: 12, height: 12, fontSize: 9, required: false, section: "Employment History", checkChar: "X" },

  // ============================================
  // PAGE 4: ACCIDENT RECORD, TRAFFIC, CDL, EXPERIENCE
  // ============================================
  // Accident Record (3 Years)
  { id: "acc1_date", label: "Accident 1 Date", type: "text", page: 4, x: 72, y: 700, width: 70, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc1_details", label: "Details", type: "text", page: 4, x: 150, y: 700, width: 200, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc1_fatalities", label: "Fatalities", type: "text", page: 4, x: 360, y: 700, width: 40, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc1_injuries", label: "Injuries", type: "text", page: 4, x: 420, y: 700, width: 40, height: 12, fontSize: 9, required: false, section: "Accident History" },
  
  { id: "acc2_date", label: "Accident 2 Date", type: "text", page: 4, x: 72, y: 680, width: 70, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc2_details", label: "Details", type: "text", page: 4, x: 150, y: 680, width: 200, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc2_fatalities", label: "Fatalities", type: "text", page: 4, x: 360, y: 680, width: 40, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc2_injuries", label: "Injuries", type: "text", page: 4, x: 420, y: 680, width: 40, height: 12, fontSize: 9, required: false, section: "Accident History" },
  
  { id: "acc3_date", label: "Accident 3 Date", type: "text", page: 4, x: 72, y: 660, width: 70, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc3_details", label: "Details", type: "text", page: 4, x: 150, y: 660, width: 200, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc3_fatalities", label: "Fatalities", type: "text", page: 4, x: 360, y: 660, width: 40, height: 12, fontSize: 9, required: false, section: "Accident History" },
  { id: "acc3_injuries", label: "Injuries", type: "text", page: 4, x: 420, y: 660, width: 40, height: 12, fontSize: 9, required: false, section: "Accident History" },

  // Traffic Convictions (3 Years)
  { id: "traffic1_location", label: "Traffic 1 Location", type: "text", page: 4, x: 72, y: 600, width: 100, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  { id: "traffic1_date", label: "Date", type: "text", page: 4, x: 180, y: 600, width: 60, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  { id: "traffic1_charge", label: "Charge", type: "text", page: 4, x: 250, y: 600, width: 150, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  { id: "traffic1_penalty", label: "Penalty", type: "text", page: 4, x: 420, y: 600, width: 80, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  
  { id: "traffic2_location", label: "Traffic 2 Location", type: "text", page: 4, x: 72, y: 580, width: 100, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  { id: "traffic2_date", label: "Date", type: "text", page: 4, x: 180, y: 580, width: 60, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  { id: "traffic2_charge", label: "Charge", type: "text", page: 4, x: 250, y: 580, width: 150, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },
  { id: "traffic2_penalty", label: "Penalty", type: "text", page: 4, x: 420, y: 580, width: 80, height: 12, fontSize: 9, required: false, section: "Traffic Violations" },

  // CDL/License Info
  { id: "lic1_number", label: "License 1 Number", type: "text", page: 4, x: 72, y: 520, width: 120, height: 12, fontSize: 9, required: true, section: "CDL Information" },
  { id: "lic1_state", label: "State", type: "text", page: 4, x: 200, y: 520, width: 40, height: 12, fontSize: 9, required: true, section: "CDL Information" },
  { id: "lic1_type", label: "Type/Endorsements", type: "text", page: 4, x: 250, y: 520, width: 150, height: 12, fontSize: 9, required: true, section: "CDL Information" },
  { id: "lic1_exp", label: "Expiration", type: "date", page: 4, x: 420, y: 520, width: 80, height: 12, fontSize: 9, required: true, section: "CDL Information" },
  
  { id: "lic2_number", label: "License 2 Number", type: "text", page: 4, x: 72, y: 500, width: 120, height: 12, fontSize: 9, required: false, section: "CDL Information" },
  { id: "lic2_state", label: "State", type: "text", page: 4, x: 200, y: 500, width: 40, height: 12, fontSize: 9, required: false, section: "CDL Information" },
  { id: "lic2_type", label: "Type/Endorsements", type: "text", page: 4, x: 250, y: 500, width: 150, height: 12, fontSize: 9, required: false, section: "CDL Information" },
  { id: "lic2_exp", label: "Expiration", type: "date", page: 4, x: 420, y: 500, width: 80, height: 12, fontSize: 9, required: false, section: "CDL Information" },

  // A, B, C Questions
  { id: "denied_license_yes", label: "A. Denied License: Yes", type: "checkbox", page: 4, x: 480, y: 460, width: 12, height: 12, fontSize: 9, required: false, section: "CDL Information", checkChar: "X" },
  { id: "denied_license_no", label: "A. Denied License: No", type: "checkbox", page: 4, x: 520, y: 460, width: 12, height: 12, fontSize: 9, required: false, section: "CDL Information", checkChar: "X" },
  { id: "suspended_yes", label: "B. Suspended/Revoked: Yes", type: "checkbox", page: 4, x: 480, y: 440, width: 12, height: 12, fontSize: 9, required: false, section: "CDL Information", checkChar: "X" },
  { id: "suspended_no", label: "B. Suspended/Revoked: No", type: "checkbox", page: 4, x: 520, y: 440, width: 12, height: 12, fontSize: 9, required: false, section: "CDL Information", checkChar: "X" },
  { id: "felony_yes", label: "C. Felony: Yes", type: "checkbox", page: 4, x: 480, y: 420, width: 12, height: 12, fontSize: 9, required: false, section: "CDL Information", checkChar: "X" },
  { id: "felony_no", label: "C. Felony: No", type: "checkbox", page: 4, x: 520, y: 420, width: 12, height: 12, fontSize: 9, required: false, section: "CDL Information", checkChar: "X" },
  { id: "abc_explain", label: "If Yes, Explain", type: "text", page: 4, x: 72, y: 400, width: 450, height: 12, fontSize: 9, required: false, section: "CDL Information" },

  // Driving Experience Table
  { id: "exp_straight_type", label: "Straight Truck Type", type: "text", page: 4, x: 150, y: 350, width: 80, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_straight_from", label: "From", type: "text", page: 4, x: 240, y: 350, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_straight_to", label: "To", type: "text", page: 4, x: 300, y: 350, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_straight_miles", label: "Miles", type: "text", page: 4, x: 360, y: 350, width: 60, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  
  { id: "exp_semi_type", label: "Tractor Semi Type", type: "text", page: 4, x: 150, y: 330, width: 80, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_semi_from", label: "From", type: "text", page: 4, x: 240, y: 330, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_semi_to", label: "To", type: "text", page: 4, x: 300, y: 330, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_semi_miles", label: "Miles", type: "text", page: 4, x: 360, y: 330, width: 60, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  
  { id: "exp_doubles_type", label: "Two Trailer Type", type: "text", page: 4, x: 150, y: 310, width: 80, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_doubles_from", label: "From", type: "text", page: 4, x: 240, y: 310, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_doubles_to", label: "To", type: "text", page: 4, x: 300, y: 310, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_doubles_miles", label: "Miles", type: "text", page: 4, x: 360, y: 310, width: 60, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  
  { id: "exp_other_class", label: "Other Equipment", type: "text", page: 4, x: 72, y: 290, width: 70, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_other_type", label: "Type", type: "text", page: 4, x: 150, y: 290, width: 80, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_other_from", label: "From", type: "text", page: 4, x: 240, y: 290, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_other_to", label: "To", type: "text", page: 4, x: 300, y: 290, width: 50, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "exp_other_miles", label: "Miles", type: "text", page: 4, x: 360, y: 290, width: 60, height: 12, fontSize: 9, required: false, section: "Driving Experience" },

  // ============================================
  // PAGE 5: STATES, TRAINING, AWARDS
  // ============================================
  { id: "states_operated", label: "States Operated In (5 Years)", type: "text", page: 5, x: 72, y: 700, width: 450, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "special_courses", label: "Special Courses/Training", type: "text", page: 5, x: 72, y: 660, width: 450, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "safe_awards", label: "Safe Operating Awards", type: "text", page: 5, x: 72, y: 620, width: 450, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "other_courses", label: "Other Courses/Training", type: "text", page: 5, x: 72, y: 580, width: 450, height: 12, fontSize: 9, required: false, section: "Driving Experience" },
  { id: "special_equipment", label: "Special Equipment/Technical", type: "text", page: 5, x: 72, y: 540, width: 450, height: 12, fontSize: 9, required: false, section: "Driving Experience" },

  // ============================================
  // SIGNATURE PAGES (adjust page numbers as needed)
  // ============================================
  // Main Application Signature
  { id: "app_signature", label: "Applicant Signature", type: "signature", page: 6, x: 72, y: 200, width: 250, height: 18, fontSize: 11, required: true, section: "Certification" },
  { id: "app_sign_date", label: "Date", type: "date", page: 6, x: 400, y: 200, width: 90, height: 12, fontSize: 10, required: true, section: "Certification" },

  // PSP Authorization (based on your PDF content showing this)
  { id: "psp_date", label: "PSP Date", type: "date", page: 22, x: 72, y: 250, width: 90, height: 12, fontSize: 10, required: true, section: "Authorization" },
  { id: "psp_signature", label: "PSP Signature", type: "signature", page: 22, x: 72, y: 220, width: 250, height: 18, fontSize: 11, required: true, section: "Authorization" },
  { id: "psp_printed_name", label: "Name (Print)", type: "text", page: 22, x: 72, y: 190, width: 200, height: 12, fontSize: 10, required: true, section: "Authorization" },

  // Road Test (Page 23)
  { id: "road_driver_name", label: "Driver Name", type: "text", page: 23, x: 150, y: 720, width: 200, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_driver_phone", label: "Phone", type: "text", page: 23, x: 400, y: 720, width: 120, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_driver_address", label: "Address", type: "text", page: 23, x: 150, y: 700, width: 350, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_city", label: "City", type: "text", page: 23, x: 80, y: 680, width: 150, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_state", label: "State", type: "text", page: 23, x: 250, y: 680, width: 50, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_zip", label: "Zip", type: "text", page: 23, x: 320, y: 680, width: 70, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_equipment", label: "Equipment Used", type: "text", page: 23, x: 200, y: 400, width: 300, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_date", label: "Date", type: "date", page: 23, x: 72, y: 370, width: 80, height: 12, fontSize: 10, required: false, section: "Road Test" },
  { id: "road_examiner_sig", label: "Examiner Signature", type: "signature", page: 23, x: 250, y: 370, width: 200, height: 18, fontSize: 10, required: false, section: "Road Test" },

  // Page 25: Internal Process Record
  { id: "process_review_date", label: "Date of Review", type: "date", page: 25, x: 150, y: 700, width: 80, height: 12, fontSize: 10, required: false, section: "Internal Use" },
  { id: "process_hired", label: "Applicant Hired", type: "text", page: 25, x: 150, y: 680, width: 100, height: 12, fontSize: 10, required: false, section: "Internal Use" },
  { id: "process_rejected", label: "Applicant Rejected", type: "text", page: 25, x: 300, y: 680, width: 100, height: 12, fontSize: 10, required: false, section: "Internal Use" },
  { id: "process_reject_reasons", label: "Rejection Reasons", type: "text", page: 25, x: 72, y: 640, width: 450, height: 30, fontSize: 9, required: false, section: "Internal Use" },
  { id: "process_employ_date", label: "Date Employed", type: "date", page: 25, x: 150, y: 600, width: 80, height: 12, fontSize: 10, required: false, section: "Internal Use" },
  { id: "process_department", label: "Department", type: "text", page: 25, x: 150, y: 580, width: 150, height: 12, fontSize: 10, required: false, section: "Internal Use" },
  { id: "process_classification", label: "Classification", type: "text", page: 25, x: 350, y: 580, width: 150, height: 12, fontSize: 10, required: false, section: "Internal Use" },
]
