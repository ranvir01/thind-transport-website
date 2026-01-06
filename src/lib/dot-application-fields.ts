// DOT Commercial Driver Application - Pre-mapped fields
// These are estimated positions - use the visual mapper to drag and adjust

import type { FieldDefinition } from "@/components/pdf-mapper/FieldEditor"

export const DOT_APPLICATION_FIELDS: FieldDefinition[] = [
  // ============================================
  // PAGE 2: APPLICANT INFORMATION
  // ============================================
  { id: "applicant_name", label: "Applicant Name", type: "text", page: 2, x: 150, y: 720, width: 250, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "position_applied", label: "Position Applied For", type: "text", page: 2, x: 450, y: 720, width: 120, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "application_date", label: "Date of Application", type: "date", page: 2, x: 150, y: 700, width: 100, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "ssn", label: "Social Security Number", type: "text", page: 2, x: 350, y: 700, width: 120, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "dob", label: "Date of Birth", type: "date", page: 2, x: 500, y: 700, width: 80, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  
  // Current Address
  { id: "current_address", label: "Current Address", type: "text", page: 2, x: 150, y: 660, width: 300, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "current_city", label: "City", type: "text", page: 2, x: 150, y: 640, width: 150, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "current_state", label: "State", type: "text", page: 2, x: 320, y: 640, width: 50, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "current_zip", label: "Zip", type: "text", page: 2, x: 390, y: 640, width: 80, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "how_long_current", label: "How Long at Current Address", type: "text", page: 2, x: 500, y: 640, width: 70, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  
  // Contact Info
  { id: "phone", label: "Phone Number", type: "text", page: 2, x: 150, y: 600, width: 120, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "email", label: "Email Address", type: "text", page: 2, x: 300, y: 600, width: 200, height: 14, fontSize: 10, required: false, section: "Applicant Information" },
  
  // Previous Addresses (3 years)
  { id: "prev_address_1", label: "Previous Address 1", type: "text", page: 2, x: 150, y: 560, width: 300, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_city_1", label: "City 1", type: "text", page: 2, x: 150, y: 540, width: 120, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_state_1", label: "State 1", type: "text", page: 2, x: 280, y: 540, width: 40, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_zip_1", label: "Zip 1", type: "text", page: 2, x: 340, y: 540, width: 70, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_dates_1", label: "Dates 1 (From-To)", type: "text", page: 2, x: 430, y: 540, width: 100, height: 14, fontSize: 10, required: false, section: "Address History" },
  
  { id: "prev_address_2", label: "Previous Address 2", type: "text", page: 2, x: 150, y: 500, width: 300, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_city_2", label: "City 2", type: "text", page: 2, x: 150, y: 480, width: 120, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_state_2", label: "State 2", type: "text", page: 2, x: 280, y: 480, width: 40, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_zip_2", label: "Zip 2", type: "text", page: 2, x: 340, y: 480, width: 70, height: 14, fontSize: 10, required: false, section: "Address History" },
  { id: "prev_dates_2", label: "Dates 2 (From-To)", type: "text", page: 2, x: 430, y: 480, width: 100, height: 14, fontSize: 10, required: false, section: "Address History" },

  // Employment Eligibility
  { id: "eligible_to_work_yes", label: "Eligible to Work: Yes", type: "checkbox", page: 2, x: 300, y: 420, width: 14, height: 14, fontSize: 12, required: false, section: "Applicant Information", checkChar: "X" },
  { id: "eligible_to_work_no", label: "Eligible to Work: No", type: "checkbox", page: 2, x: 350, y: 420, width: 14, height: 14, fontSize: 12, required: false, section: "Applicant Information", checkChar: "X" },
  
  // Emergency Contact
  { id: "emergency_name", label: "Emergency Contact Name", type: "text", page: 2, x: 150, y: 380, width: 200, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "emergency_phone", label: "Emergency Contact Phone", type: "text", page: 2, x: 380, y: 380, width: 120, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "emergency_relationship", label: "Relationship", type: "text", page: 2, x: 150, y: 360, width: 150, height: 14, fontSize: 10, required: true, section: "Applicant Information" },

  // ============================================
  // PAGE 3-5: EMPLOYMENT HISTORY (Last 10 years)
  // ============================================
  // Employer 1
  { id: "emp1_company", label: "Employer 1 - Company Name", type: "text", page: 3, x: 100, y: 700, width: 200, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_address", label: "Employer 1 - Address", type: "text", page: 3, x: 320, y: 700, width: 200, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_city_state_zip", label: "Employer 1 - City/State/Zip", type: "text", page: 3, x: 100, y: 680, width: 200, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_phone", label: "Employer 1 - Phone", type: "text", page: 3, x: 320, y: 680, width: 120, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_contact", label: "Employer 1 - Contact Person", type: "text", page: 3, x: 450, y: 680, width: 100, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp1_position", label: "Employer 1 - Position Held", type: "text", page: 3, x: 100, y: 660, width: 150, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_from", label: "Employer 1 - From Date", type: "text", page: 3, x: 270, y: 660, width: 80, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_to", label: "Employer 1 - To Date", type: "text", page: 3, x: 370, y: 660, width: 80, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_salary", label: "Employer 1 - Salary", type: "text", page: 3, x: 470, y: 660, width: 80, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp1_reason_leaving", label: "Employer 1 - Reason for Leaving", type: "text", page: 3, x: 100, y: 640, width: 300, height: 14, fontSize: 10, required: true, section: "Employment History" },
  { id: "emp1_subject_fmcsr_yes", label: "Emp 1 Subject to FMCSR: Yes", type: "checkbox", page: 3, x: 420, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp1_subject_fmcsr_no", label: "Emp 1 Subject to FMCSR: No", type: "checkbox", page: 3, x: 470, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp1_drug_test_yes", label: "Emp 1 Drug Test: Yes", type: "checkbox", page: 3, x: 420, y: 620, width: 14, height: 14, fontSize: 12, required: false, section: "Employment History", checkChar: "X" },
  { id: "emp1_drug_test_no", label: "Emp 1 Drug Test: No", type: "checkbox", page: 3, x: 470, y: 620, width: 14, height: 14, fontSize: 12, required: false, section: "Employment History", checkChar: "X" },

  // Employer 2
  { id: "emp2_company", label: "Employer 2 - Company Name", type: "text", page: 3, x: 100, y: 560, width: 200, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_address", label: "Employer 2 - Address", type: "text", page: 3, x: 320, y: 560, width: 200, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_city_state_zip", label: "Employer 2 - City/State/Zip", type: "text", page: 3, x: 100, y: 540, width: 200, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_phone", label: "Employer 2 - Phone", type: "text", page: 3, x: 320, y: 540, width: 120, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_position", label: "Employer 2 - Position Held", type: "text", page: 3, x: 100, y: 520, width: 150, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_from", label: "Employer 2 - From Date", type: "text", page: 3, x: 270, y: 520, width: 80, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_to", label: "Employer 2 - To Date", type: "text", page: 3, x: 370, y: 520, width: 80, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp2_reason_leaving", label: "Employer 2 - Reason for Leaving", type: "text", page: 3, x: 100, y: 500, width: 300, height: 14, fontSize: 10, required: false, section: "Employment History" },

  // Employer 3
  { id: "emp3_company", label: "Employer 3 - Company Name", type: "text", page: 3, x: 100, y: 440, width: 200, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_address", label: "Employer 3 - Address", type: "text", page: 3, x: 320, y: 440, width: 200, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_city_state_zip", label: "Employer 3 - City/State/Zip", type: "text", page: 3, x: 100, y: 420, width: 200, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_phone", label: "Employer 3 - Phone", type: "text", page: 3, x: 320, y: 420, width: 120, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_position", label: "Employer 3 - Position Held", type: "text", page: 3, x: 100, y: 400, width: 150, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_from", label: "Employer 3 - From Date", type: "text", page: 3, x: 270, y: 400, width: 80, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_to", label: "Employer 3 - To Date", type: "text", page: 3, x: 370, y: 400, width: 80, height: 14, fontSize: 10, required: false, section: "Employment History" },
  { id: "emp3_reason_leaving", label: "Employer 3 - Reason for Leaving", type: "text", page: 3, x: 100, y: 380, width: 300, height: 14, fontSize: 10, required: false, section: "Employment History" },

  // ============================================
  // PAGE 6: CDL INFORMATION
  // ============================================
  { id: "cdl_license_number", label: "CDL License Number", type: "text", page: 6, x: 150, y: 700, width: 180, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  { id: "cdl_state", label: "CDL State", type: "text", page: 6, x: 360, y: 700, width: 60, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  { id: "cdl_class", label: "CDL Class", type: "text", page: 6, x: 450, y: 700, width: 60, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  { id: "cdl_expiration", label: "CDL Expiration Date", type: "date", page: 6, x: 150, y: 680, width: 100, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  
  // Endorsements
  { id: "endorsement_h", label: "Endorsement H (Hazmat)", type: "checkbox", page: 6, x: 150, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "endorsement_n", label: "Endorsement N (Tank)", type: "checkbox", page: 6, x: 220, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "endorsement_p", label: "Endorsement P (Passenger)", type: "checkbox", page: 6, x: 290, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "endorsement_s", label: "Endorsement S (School Bus)", type: "checkbox", page: 6, x: 360, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "endorsement_t", label: "Endorsement T (Double/Triple)", type: "checkbox", page: 6, x: 430, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "endorsement_x", label: "Endorsement X (Hazmat+Tank)", type: "checkbox", page: 6, x: 500, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },

  // Restrictions
  { id: "restriction_l", label: "Restriction L (No Air Brake)", type: "checkbox", page: 6, x: 150, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "restriction_z", label: "Restriction Z (No Full Air)", type: "checkbox", page: 6, x: 300, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },
  { id: "restriction_e", label: "Restriction E (No Manual)", type: "checkbox", page: 6, x: 450, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "CDL Information", checkChar: "X" },

  // Medical Card
  { id: "med_card_expiration", label: "Medical Card Expiration", type: "date", page: 6, x: 150, y: 560, width: 100, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  { id: "med_examiner_name", label: "Medical Examiner Name", type: "text", page: 6, x: 300, y: 560, width: 200, height: 14, fontSize: 10, required: false, section: "CDL Information" },

  // ============================================
  // PAGE 7: DRIVING EXPERIENCE
  // ============================================
  { id: "exp_straight_truck", label: "Straight Truck Experience (Years)", type: "text", page: 7, x: 350, y: 680, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_straight_truck_miles", label: "Straight Truck Miles", type: "text", page: 7, x: 450, y: 680, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_tractor_semi", label: "Tractor Semi-Trailer (Years)", type: "text", page: 7, x: 350, y: 660, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_tractor_semi_miles", label: "Tractor Semi Miles", type: "text", page: 7, x: 450, y: 660, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_tractor_doubles", label: "Tractor Doubles (Years)", type: "text", page: 7, x: 350, y: 640, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_tractor_doubles_miles", label: "Tractor Doubles Miles", type: "text", page: 7, x: 450, y: 640, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_tanker", label: "Tanker (Years)", type: "text", page: 7, x: 350, y: 620, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_tanker_miles", label: "Tanker Miles", type: "text", page: 7, x: 450, y: 620, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_hazmat", label: "Hazmat (Years)", type: "text", page: 7, x: 350, y: 600, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  { id: "exp_hazmat_miles", label: "Hazmat Miles", type: "text", page: 7, x: 450, y: 600, width: 80, height: 14, fontSize: 10, required: false, section: "Driving Experience" },

  // States Operated
  { id: "states_operated", label: "States Operated In (List)", type: "text", page: 7, x: 100, y: 540, width: 400, height: 14, fontSize: 10, required: false, section: "Driving Experience" },
  
  // Special Courses
  { id: "special_training", label: "Special Training/Certifications", type: "text", page: 7, x: 100, y: 500, width: 400, height: 14, fontSize: 10, required: false, section: "Driving Experience" },

  // ============================================
  // PAGE 8-9: ACCIDENT HISTORY (Last 3 Years)
  // ============================================
  // Accident 1
  { id: "acc1_date", label: "Accident 1 - Date", type: "date", page: 8, x: 80, y: 680, width: 80, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc1_nature", label: "Accident 1 - Nature", type: "text", page: 8, x: 170, y: 680, width: 150, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc1_fatalities", label: "Accident 1 - Fatalities", type: "text", page: 8, x: 340, y: 680, width: 50, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc1_injuries", label: "Accident 1 - Injuries", type: "text", page: 8, x: 400, y: 680, width: 50, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc1_hazmat_spill", label: "Accident 1 - Hazmat Spill", type: "checkbox", page: 8, x: 470, y: 680, width: 14, height: 14, fontSize: 12, required: false, section: "Accident History", checkChar: "X" },

  // Accident 2
  { id: "acc2_date", label: "Accident 2 - Date", type: "date", page: 8, x: 80, y: 640, width: 80, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc2_nature", label: "Accident 2 - Nature", type: "text", page: 8, x: 170, y: 640, width: 150, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc2_fatalities", label: "Accident 2 - Fatalities", type: "text", page: 8, x: 340, y: 640, width: 50, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc2_injuries", label: "Accident 2 - Injuries", type: "text", page: 8, x: 400, y: 640, width: 50, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc2_hazmat_spill", label: "Accident 2 - Hazmat Spill", type: "checkbox", page: 8, x: 470, y: 640, width: 14, height: 14, fontSize: 12, required: false, section: "Accident History", checkChar: "X" },

  // Accident 3
  { id: "acc3_date", label: "Accident 3 - Date", type: "date", page: 8, x: 80, y: 600, width: 80, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc3_nature", label: "Accident 3 - Nature", type: "text", page: 8, x: 170, y: 600, width: 150, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc3_fatalities", label: "Accident 3 - Fatalities", type: "text", page: 8, x: 340, y: 600, width: 50, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc3_injuries", label: "Accident 3 - Injuries", type: "text", page: 8, x: 400, y: 600, width: 50, height: 14, fontSize: 10, required: false, section: "Accident History" },
  { id: "acc3_hazmat_spill", label: "Accident 3 - Hazmat Spill", type: "checkbox", page: 8, x: 470, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "Accident History", checkChar: "X" },

  // ============================================
  // PAGE 9-10: TRAFFIC VIOLATIONS (Last 3 Years)
  // ============================================
  // Violation 1
  { id: "vio1_date", label: "Violation 1 - Date", type: "date", page: 9, x: 80, y: 680, width: 80, height: 14, fontSize: 10, required: false, section: "Violations" },
  { id: "vio1_offense", label: "Violation 1 - Offense", type: "text", page: 9, x: 170, y: 680, width: 200, height: 14, fontSize: 10, required: false, section: "Violations" },
  { id: "vio1_location", label: "Violation 1 - Location", type: "text", page: 9, x: 390, y: 680, width: 120, height: 14, fontSize: 10, required: false, section: "Violations" },

  // Violation 2
  { id: "vio2_date", label: "Violation 2 - Date", type: "date", page: 9, x: 80, y: 650, width: 80, height: 14, fontSize: 10, required: false, section: "Violations" },
  { id: "vio2_offense", label: "Violation 2 - Offense", type: "text", page: 9, x: 170, y: 650, width: 200, height: 14, fontSize: 10, required: false, section: "Violations" },
  { id: "vio2_location", label: "Violation 2 - Location", type: "text", page: 9, x: 390, y: 650, width: 120, height: 14, fontSize: 10, required: false, section: "Violations" },

  // Violation 3
  { id: "vio3_date", label: "Violation 3 - Date", type: "date", page: 9, x: 80, y: 620, width: 80, height: 14, fontSize: 10, required: false, section: "Violations" },
  { id: "vio3_offense", label: "Violation 3 - Offense", type: "text", page: 9, x: 170, y: 620, width: 200, height: 14, fontSize: 10, required: false, section: "Violations" },
  { id: "vio3_location", label: "Violation 3 - Location", type: "text", page: 9, x: 390, y: 620, width: 120, height: 14, fontSize: 10, required: false, section: "Violations" },

  // ============================================
  // PAGE 10-11: CRIMINAL HISTORY
  // ============================================
  { id: "convicted_felony_yes", label: "Convicted of Felony: Yes", type: "checkbox", page: 10, x: 350, y: 680, width: 14, height: 14, fontSize: 12, required: false, section: "Criminal History", checkChar: "X" },
  { id: "convicted_felony_no", label: "Convicted of Felony: No", type: "checkbox", page: 10, x: 400, y: 680, width: 14, height: 14, fontSize: 12, required: false, section: "Criminal History", checkChar: "X" },
  { id: "felony_explanation", label: "Felony Explanation", type: "text", page: 10, x: 100, y: 640, width: 400, height: 28, fontSize: 10, required: false, section: "Criminal History" },
  
  { id: "license_denied_yes", label: "License Denied/Suspended: Yes", type: "checkbox", page: 10, x: 350, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "Criminal History", checkChar: "X" },
  { id: "license_denied_no", label: "License Denied/Suspended: No", type: "checkbox", page: 10, x: 400, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "Criminal History", checkChar: "X" },
  { id: "license_denial_explanation", label: "License Denial Explanation", type: "text", page: 10, x: 100, y: 560, width: 400, height: 28, fontSize: 10, required: false, section: "Criminal History" },

  // ============================================
  // PAGE 11: EDUCATION
  // ============================================
  { id: "highest_grade", label: "Highest Grade Completed", type: "text", page: 11, x: 250, y: 700, width: 80, height: 14, fontSize: 10, required: false, section: "Education" },
  { id: "high_school", label: "High School Name", type: "text", page: 11, x: 100, y: 680, width: 200, height: 14, fontSize: 10, required: false, section: "Education" },
  { id: "high_school_city_state", label: "High School City/State", type: "text", page: 11, x: 320, y: 680, width: 150, height: 14, fontSize: 10, required: false, section: "Education" },
  { id: "college_name", label: "College/Trade School Name", type: "text", page: 11, x: 100, y: 640, width: 200, height: 14, fontSize: 10, required: false, section: "Education" },
  { id: "college_city_state", label: "College City/State", type: "text", page: 11, x: 320, y: 640, width: 150, height: 14, fontSize: 10, required: false, section: "Education" },
  { id: "degree_received", label: "Degree/Certification Received", type: "text", page: 11, x: 100, y: 620, width: 200, height: 14, fontSize: 10, required: false, section: "Education" },

  // ============================================
  // PAGE 12-13: REFERENCES
  // ============================================
  // Reference 1
  { id: "ref1_name", label: "Reference 1 - Name", type: "text", page: 12, x: 100, y: 680, width: 180, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref1_phone", label: "Reference 1 - Phone", type: "text", page: 12, x: 300, y: 680, width: 120, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref1_relationship", label: "Reference 1 - Relationship", type: "text", page: 12, x: 440, y: 680, width: 100, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref1_years_known", label: "Reference 1 - Years Known", type: "text", page: 12, x: 100, y: 660, width: 80, height: 14, fontSize: 10, required: false, section: "References" },

  // Reference 2
  { id: "ref2_name", label: "Reference 2 - Name", type: "text", page: 12, x: 100, y: 620, width: 180, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref2_phone", label: "Reference 2 - Phone", type: "text", page: 12, x: 300, y: 620, width: 120, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref2_relationship", label: "Reference 2 - Relationship", type: "text", page: 12, x: 440, y: 620, width: 100, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref2_years_known", label: "Reference 2 - Years Known", type: "text", page: 12, x: 100, y: 600, width: 80, height: 14, fontSize: 10, required: false, section: "References" },

  // Reference 3
  { id: "ref3_name", label: "Reference 3 - Name", type: "text", page: 12, x: 100, y: 560, width: 180, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref3_phone", label: "Reference 3 - Phone", type: "text", page: 12, x: 300, y: 560, width: 120, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref3_relationship", label: "Reference 3 - Relationship", type: "text", page: 12, x: 440, y: 560, width: 100, height: 14, fontSize: 10, required: false, section: "References" },
  { id: "ref3_years_known", label: "Reference 3 - Years Known", type: "text", page: 12, x: 100, y: 540, width: 80, height: 14, fontSize: 10, required: false, section: "References" },

  // ============================================
  // PAGE 14-15: APPLICANT CERTIFICATION/SIGNATURE
  // ============================================
  { id: "cert_signature", label: "Applicant Signature", type: "signature", page: 14, x: 100, y: 200, width: 250, height: 20, fontSize: 12, required: true, section: "Certification" },
  { id: "cert_date", label: "Signature Date", type: "date", page: 14, x: 400, y: 200, width: 100, height: 14, fontSize: 10, required: true, section: "Certification" },

  // ============================================
  // PAGE 16: MVR RELEASE AUTHORIZATION
  // ============================================
  { id: "mvr_signature", label: "MVR Release Signature", type: "signature", page: 16, x: 100, y: 250, width: 250, height: 20, fontSize: 12, required: true, section: "Authorization" },
  { id: "mvr_date", label: "MVR Date", type: "date", page: 16, x: 400, y: 250, width: 100, height: 14, fontSize: 10, required: true, section: "Authorization" },

  // ============================================
  // PAGE 17: FAIR CREDIT REPORTING ACT DISCLOSURE
  // ============================================
  { id: "fcra_signature", label: "FCRA Signature", type: "signature", page: 17, x: 100, y: 200, width: 250, height: 20, fontSize: 12, required: true, section: "Authorization" },
  { id: "fcra_date", label: "FCRA Date", type: "date", page: 17, x: 400, y: 200, width: 100, height: 14, fontSize: 10, required: true, section: "Authorization" },

  // ============================================
  // PAGE 18: DRUG & ALCOHOL TESTING CONSENT
  // ============================================
  { id: "drug_alcohol_signature", label: "Drug/Alcohol Consent Signature", type: "signature", page: 18, x: 100, y: 200, width: 250, height: 20, fontSize: 12, required: true, section: "Authorization" },
  { id: "drug_alcohol_date", label: "Drug/Alcohol Consent Date", type: "date", page: 18, x: 400, y: 200, width: 100, height: 14, fontSize: 10, required: true, section: "Authorization" },

  // ============================================
  // PAGE 19: FMCSA CLEARINGHOUSE CONSENT
  // ============================================
  { id: "clearinghouse_signature", label: "Clearinghouse Consent Signature", type: "signature", page: 19, x: 100, y: 200, width: 250, height: 20, fontSize: 12, required: true, section: "Authorization" },
  { id: "clearinghouse_date", label: "Clearinghouse Date", type: "date", page: 19, x: 400, y: 200, width: 100, height: 14, fontSize: 10, required: true, section: "Authorization" },

  // ============================================
  // PAGE 20: CELL PHONE POLICY
  // ============================================
  { id: "cell_policy_signature", label: "Cell Phone Policy Signature", type: "signature", page: 20, x: 100, y: 200, width: 250, height: 20, fontSize: 12, required: true, section: "Authorization" },
  { id: "cell_policy_date", label: "Cell Phone Policy Date", type: "date", page: 20, x: 400, y: 200, width: 100, height: 14, fontSize: 10, required: true, section: "Authorization" },

  // ============================================
  // PAGE 21: ANNUAL CERTIFICATION OF VIOLATIONS
  // ============================================
  { id: "violations_cert_name", label: "Driver Name (Violations Cert)", type: "text", page: 21, x: 150, y: 650, width: 200, height: 14, fontSize: 10, required: true, section: "Certification" },
  { id: "violations_no_violations", label: "I certify: No Violations", type: "checkbox", page: 21, x: 100, y: 600, width: 14, height: 14, fontSize: 12, required: false, section: "Certification", checkChar: "X" },
  { id: "violations_cert_signature", label: "Violations Cert Signature", type: "signature", page: 21, x: 100, y: 250, width: 250, height: 20, fontSize: 12, required: true, section: "Certification" },
  { id: "violations_cert_date", label: "Violations Cert Date", type: "date", page: 21, x: 400, y: 250, width: 100, height: 14, fontSize: 10, required: true, section: "Certification" },

  // ============================================
  // PAGE 22: W-9 FORM (For Owner Operators)
  // ============================================
  { id: "w9_name", label: "W-9 Name", type: "text", page: 22, x: 100, y: 700, width: 250, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "w9_business_name", label: "W-9 Business Name", type: "text", page: 22, x: 100, y: 680, width: 250, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "w9_address", label: "W-9 Address", type: "text", page: 22, x: 100, y: 640, width: 250, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "w9_city_state_zip", label: "W-9 City/State/Zip", type: "text", page: 22, x: 100, y: 620, width: 250, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "w9_ssn_ein", label: "W-9 SSN/EIN", type: "text", page: 22, x: 100, y: 580, width: 150, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "w9_signature", label: "W-9 Signature", type: "signature", page: 22, x: 100, y: 400, width: 250, height: 20, fontSize: 12, required: false, section: "Other" },
  { id: "w9_date", label: "W-9 Date", type: "date", page: 22, x: 400, y: 400, width: 100, height: 14, fontSize: 10, required: false, section: "Other" },

  // ============================================
  // PAGE 23-25: FORM I-9 (Employment Eligibility)
  // ============================================
  { id: "i9_last_name", label: "I-9 Last Name", type: "text", page: 23, x: 100, y: 680, width: 150, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_first_name", label: "I-9 First Name", type: "text", page: 23, x: 270, y: 680, width: 150, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_middle_initial", label: "I-9 Middle Initial", type: "text", page: 23, x: 440, y: 680, width: 50, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_maiden_name", label: "I-9 Maiden Name", type: "text", page: 23, x: 100, y: 660, width: 150, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_address", label: "I-9 Address", type: "text", page: 23, x: 100, y: 640, width: 300, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_apt", label: "I-9 Apt #", type: "text", page: 23, x: 420, y: 640, width: 60, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_city", label: "I-9 City", type: "text", page: 23, x: 100, y: 620, width: 150, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_state", label: "I-9 State", type: "text", page: 23, x: 270, y: 620, width: 60, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_zip", label: "I-9 Zip", type: "text", page: 23, x: 350, y: 620, width: 80, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_dob", label: "I-9 Date of Birth", type: "date", page: 23, x: 100, y: 600, width: 100, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_ssn", label: "I-9 SSN", type: "text", page: 23, x: 250, y: 600, width: 120, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_email", label: "I-9 Email", type: "text", page: 23, x: 100, y: 580, width: 200, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_phone", label: "I-9 Phone", type: "text", page: 23, x: 320, y: 580, width: 120, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_citizen_yes", label: "I-9 Citizen: Yes", type: "checkbox", page: 23, x: 100, y: 540, width: 14, height: 14, fontSize: 12, required: false, section: "Other", checkChar: "X" },
  { id: "i9_noncitizen_national", label: "I-9 Noncitizen National", type: "checkbox", page: 23, x: 180, y: 540, width: 14, height: 14, fontSize: 12, required: false, section: "Other", checkChar: "X" },
  { id: "i9_permanent_resident", label: "I-9 Permanent Resident", type: "checkbox", page: 23, x: 280, y: 540, width: 14, height: 14, fontSize: 12, required: false, section: "Other", checkChar: "X" },
  { id: "i9_alien_authorized", label: "I-9 Alien Authorized", type: "checkbox", page: 23, x: 380, y: 540, width: 14, height: 14, fontSize: 12, required: false, section: "Other", checkChar: "X" },
  { id: "i9_uscis_number", label: "I-9 USCIS Number", type: "text", page: 23, x: 100, y: 500, width: 150, height: 14, fontSize: 10, required: false, section: "Other" },
  { id: "i9_signature", label: "I-9 Signature", type: "signature", page: 23, x: 100, y: 400, width: 250, height: 20, fontSize: 12, required: false, section: "Other" },
  { id: "i9_date", label: "I-9 Date", type: "date", page: 23, x: 400, y: 400, width: 100, height: 14, fontSize: 10, required: false, section: "Other" },
]

