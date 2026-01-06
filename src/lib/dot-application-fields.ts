// DOT Commercial Driver Application - Complete Field Map
// Positions are estimates - drag to adjust in visual mapper

import type { FieldDefinition } from "@/components/pdf-mapper/FieldEditor"

// Helper to create field with defaults
const f = (id: string, label: string, type: "text" | "checkbox" | "date" | "signature" | "number", page: number, x: number, y: number, opts?: Partial<FieldDefinition>): FieldDefinition => ({
  id, label, type, page, x, y,
  width: opts?.width ?? (type === "checkbox" ? 12 : type === "signature" ? 200 : 120),
  height: opts?.height ?? (type === "checkbox" ? 12 : type === "signature" ? 18 : 12),
  fontSize: opts?.fontSize ?? (type === "checkbox" ? 10 : 9),
  required: opts?.required ?? false,
  section: opts?.section ?? "Other",
  checkChar: type === "checkbox" ? "X" : undefined,
  ...opts
})

export const DOT_APPLICATION_FIELDS: FieldDefinition[] = [
  // ========== PAGE 2: APPLICANT INFO ==========
  f("app_name", "Applicant Name", "text", 2, 72, 708, { width: 280, required: true, section: "Applicant Information" }),
  f("app_date", "Application Date", "date", 2, 450, 708, { width: 90, required: true, section: "Applicant Information" }),
  f("position", "Position Applied For", "text", 2, 72, 685, { width: 180, section: "Applicant Information" }),
  f("ssn", "Social Security #", "text", 2, 320, 685, { width: 110, required: true, section: "Applicant Information" }),
  f("dob", "Date of Birth", "date", 2, 470, 685, { width: 80, required: true, section: "Applicant Information" }),
  
  // Address
  f("addr_street", "Street Address", "text", 2, 72, 650, { width: 350, required: true, section: "Applicant Information" }),
  f("addr_city", "City", "text", 2, 72, 628, { width: 160, required: true, section: "Applicant Information" }),
  f("addr_state", "State", "text", 2, 245, 628, { width: 45, required: true, section: "Applicant Information" }),
  f("addr_zip", "Zip Code", "text", 2, 305, 628, { width: 70, required: true, section: "Applicant Information" }),
  f("addr_years", "Years at Address", "text", 2, 400, 628, { width: 50, section: "Applicant Information" }),
  f("addr_months", "Months", "text", 2, 465, 628, { width: 40, section: "Applicant Information" }),
  
  // Contact
  f("phone_home", "Home Phone", "text", 2, 72, 595, { width: 110, section: "Applicant Information" }),
  f("phone_cell", "Cell Phone", "text", 2, 200, 595, { width: 110, required: true, section: "Applicant Information" }),
  f("email", "Email Address", "text", 2, 330, 595, { width: 180, section: "Applicant Information" }),
  
  // Previous Addresses (3 years)
  f("prev1_street", "Prev Address 1 - Street", "text", 2, 72, 555, { width: 250, section: "Address History" }),
  f("prev1_city", "City", "text", 2, 335, 555, { width: 100, section: "Address History" }),
  f("prev1_state", "St", "text", 2, 448, 555, { width: 30, section: "Address History" }),
  f("prev1_zip", "Zip", "text", 2, 490, 555, { width: 55, section: "Address History" }),
  f("prev1_from", "From", "text", 2, 72, 535, { width: 60, section: "Address History" }),
  f("prev1_to", "To", "text", 2, 145, 535, { width: 60, section: "Address History" }),
  
  f("prev2_street", "Prev Address 2 - Street", "text", 2, 72, 505, { width: 250, section: "Address History" }),
  f("prev2_city", "City", "text", 2, 335, 505, { width: 100, section: "Address History" }),
  f("prev2_state", "St", "text", 2, 448, 505, { width: 30, section: "Address History" }),
  f("prev2_zip", "Zip", "text", 2, 490, 505, { width: 55, section: "Address History" }),
  f("prev2_from", "From", "text", 2, 72, 485, { width: 60, section: "Address History" }),
  f("prev2_to", "To", "text", 2, 145, 485, { width: 60, section: "Address History" }),

  f("prev3_street", "Prev Address 3 - Street", "text", 2, 72, 455, { width: 250, section: "Address History" }),
  f("prev3_city", "City", "text", 2, 335, 455, { width: 100, section: "Address History" }),
  f("prev3_state", "St", "text", 2, 448, 455, { width: 30, section: "Address History" }),
  f("prev3_zip", "Zip", "text", 2, 490, 455, { width: 55, section: "Address History" }),
  f("prev3_from", "From", "text", 2, 72, 435, { width: 60, section: "Address History" }),
  f("prev3_to", "To", "text", 2, 145, 435, { width: 60, section: "Address History" }),
  
  // Work Authorization - Circle One
  f("auth_citizen", "US Citizen", "checkbox", 2, 100, 395, { section: "Applicant Information" }),
  f("auth_perm_res", "Permanent Resident", "checkbox", 2, 180, 395, { section: "Applicant Information" }),
  f("auth_visa", "Work Visa", "checkbox", 2, 290, 395, { section: "Applicant Information" }),
  f("auth_other", "Other (specify)", "checkbox", 2, 370, 395, { section: "Applicant Information" }),
  f("auth_other_text", "Specify Auth", "text", 2, 430, 395, { width: 100, section: "Applicant Information" }),
  
  // Can you speak/read/write English?
  f("english_yes", "English: Yes", "checkbox", 2, 200, 365, { section: "Applicant Information" }),
  f("english_no", "English: No", "checkbox", 2, 260, 365, { section: "Applicant Information" }),
  
  // Emergency Contact
  f("emerg_name", "Emergency Contact Name", "text", 2, 72, 330, { width: 200, required: true, section: "Applicant Information" }),
  f("emerg_phone", "Emergency Phone", "text", 2, 290, 330, { width: 110, required: true, section: "Applicant Information" }),
  f("emerg_relation", "Relationship", "text", 2, 420, 330, { width: 100, section: "Applicant Information" }),
  
  // Have you worked for this company before?
  f("worked_before_yes", "Worked Here Before: Yes", "checkbox", 2, 250, 295, { section: "Applicant Information" }),
  f("worked_before_no", "Worked Here Before: No", "checkbox", 2, 310, 295, { section: "Applicant Information" }),
  f("worked_before_dates", "If Yes, Dates", "text", 2, 380, 295, { width: 140, section: "Applicant Information" }),
  
  // Referred by
  f("referred_by", "Referred By", "text", 2, 72, 260, { width: 200, section: "Applicant Information" }),
  
  // ========== PAGE 3: EMPLOYMENT HISTORY ==========
  // Employer 1
  f("emp1_company", "Employer 1 - Company", "text", 3, 72, 700, { width: 200, required: true, section: "Employment History" }),
  f("emp1_phone", "Phone", "text", 3, 290, 700, { width: 100, section: "Employment History" }),
  f("emp1_fax", "Fax", "text", 3, 410, 700, { width: 100, section: "Employment History" }),
  f("emp1_addr", "Address", "text", 3, 72, 680, { width: 200, section: "Employment History" }),
  f("emp1_city", "City", "text", 3, 290, 680, { width: 100, section: "Employment History" }),
  f("emp1_state", "St", "text", 3, 405, 680, { width: 30, section: "Employment History" }),
  f("emp1_zip", "Zip", "text", 3, 450, 680, { width: 60, section: "Employment History" }),
  f("emp1_contact", "Contact Person", "text", 3, 72, 660, { width: 150, section: "Employment History" }),
  f("emp1_position", "Position Held", "text", 3, 240, 660, { width: 120, section: "Employment History" }),
  f("emp1_from", "From (Mo/Yr)", "text", 3, 380, 660, { width: 60, required: true, section: "Employment History" }),
  f("emp1_to", "To (Mo/Yr)", "text", 3, 460, 660, { width: 60, required: true, section: "Employment History" }),
  f("emp1_salary", "Salary/Wage", "text", 3, 72, 640, { width: 80, section: "Employment History" }),
  f("emp1_reason", "Reason for Leaving", "text", 3, 170, 640, { width: 200, required: true, section: "Employment History" }),
  // FMCSR Yes/No
  f("emp1_fmcsr_yes", "Subject to FMCSR: Yes", "checkbox", 3, 400, 640, { section: "Employment History" }),
  f("emp1_fmcsr_no", "Subject to FMCSR: No", "checkbox", 3, 460, 640, { section: "Employment History" }),
  // Drug Testing Yes/No
  f("emp1_drug_yes", "Drug Testing: Yes", "checkbox", 3, 400, 620, { section: "Employment History" }),
  f("emp1_drug_no", "Drug Testing: No", "checkbox", 3, 460, 620, { section: "Employment History" }),

  // Employer 2
  f("emp2_company", "Employer 2 - Company", "text", 3, 72, 580, { width: 200, section: "Employment History" }),
  f("emp2_phone", "Phone", "text", 3, 290, 580, { width: 100, section: "Employment History" }),
  f("emp2_addr", "Address", "text", 3, 72, 560, { width: 200, section: "Employment History" }),
  f("emp2_city", "City", "text", 3, 290, 560, { width: 100, section: "Employment History" }),
  f("emp2_state", "St", "text", 3, 405, 560, { width: 30, section: "Employment History" }),
  f("emp2_zip", "Zip", "text", 3, 450, 560, { width: 60, section: "Employment History" }),
  f("emp2_contact", "Contact Person", "text", 3, 72, 540, { width: 150, section: "Employment History" }),
  f("emp2_position", "Position Held", "text", 3, 240, 540, { width: 120, section: "Employment History" }),
  f("emp2_from", "From", "text", 3, 380, 540, { width: 60, section: "Employment History" }),
  f("emp2_to", "To", "text", 3, 460, 540, { width: 60, section: "Employment History" }),
  f("emp2_salary", "Salary", "text", 3, 72, 520, { width: 80, section: "Employment History" }),
  f("emp2_reason", "Reason for Leaving", "text", 3, 170, 520, { width: 200, section: "Employment History" }),
  f("emp2_fmcsr_yes", "FMCSR: Yes", "checkbox", 3, 400, 520, { section: "Employment History" }),
  f("emp2_fmcsr_no", "FMCSR: No", "checkbox", 3, 460, 520, { section: "Employment History" }),
  f("emp2_drug_yes", "Drug Test: Yes", "checkbox", 3, 400, 500, { section: "Employment History" }),
  f("emp2_drug_no", "Drug Test: No", "checkbox", 3, 460, 500, { section: "Employment History" }),

  // Employer 3
  f("emp3_company", "Employer 3 - Company", "text", 3, 72, 460, { width: 200, section: "Employment History" }),
  f("emp3_phone", "Phone", "text", 3, 290, 460, { width: 100, section: "Employment History" }),
  f("emp3_addr", "Address", "text", 3, 72, 440, { width: 200, section: "Employment History" }),
  f("emp3_city", "City", "text", 3, 290, 440, { width: 100, section: "Employment History" }),
  f("emp3_state", "St", "text", 3, 405, 440, { width: 30, section: "Employment History" }),
  f("emp3_zip", "Zip", "text", 3, 450, 440, { width: 60, section: "Employment History" }),
  f("emp3_position", "Position", "text", 3, 72, 420, { width: 120, section: "Employment History" }),
  f("emp3_from", "From", "text", 3, 210, 420, { width: 60, section: "Employment History" }),
  f("emp3_to", "To", "text", 3, 290, 420, { width: 60, section: "Employment History" }),
  f("emp3_reason", "Reason for Leaving", "text", 3, 370, 420, { width: 150, section: "Employment History" }),
  f("emp3_fmcsr_yes", "FMCSR: Yes", "checkbox", 3, 400, 400, { section: "Employment History" }),
  f("emp3_fmcsr_no", "FMCSR: No", "checkbox", 3, 460, 400, { section: "Employment History" }),

  // ========== PAGE 4: MORE EMPLOYMENT ==========
  // Employer 4
  f("emp4_company", "Employer 4 - Company", "text", 4, 72, 700, { width: 200, section: "Employment History" }),
  f("emp4_phone", "Phone", "text", 4, 290, 700, { width: 100, section: "Employment History" }),
  f("emp4_addr", "Address", "text", 4, 72, 680, { width: 300, section: "Employment History" }),
  f("emp4_position", "Position", "text", 4, 72, 660, { width: 120, section: "Employment History" }),
  f("emp4_from", "From", "text", 4, 210, 660, { width: 60, section: "Employment History" }),
  f("emp4_to", "To", "text", 4, 290, 660, { width: 60, section: "Employment History" }),
  f("emp4_reason", "Reason for Leaving", "text", 4, 370, 660, { width: 150, section: "Employment History" }),

  // Employer 5
  f("emp5_company", "Employer 5 - Company", "text", 4, 72, 600, { width: 200, section: "Employment History" }),
  f("emp5_phone", "Phone", "text", 4, 290, 600, { width: 100, section: "Employment History" }),
  f("emp5_addr", "Address", "text", 4, 72, 580, { width: 300, section: "Employment History" }),
  f("emp5_position", "Position", "text", 4, 72, 560, { width: 120, section: "Employment History" }),
  f("emp5_from", "From", "text", 4, 210, 560, { width: 60, section: "Employment History" }),
  f("emp5_to", "To", "text", 4, 290, 560, { width: 60, section: "Employment History" }),
  f("emp5_reason", "Reason for Leaving", "text", 4, 370, 560, { width: 150, section: "Employment History" }),

  // Gaps in employment explanation
  f("employment_gaps", "Explain any gaps in employment", "text", 4, 72, 480, { width: 450, height: 40, section: "Employment History" }),

  // ========== PAGE 5: CDL / LICENSE INFO ==========
  f("cdl_number", "CDL License Number", "text", 5, 72, 700, { width: 160, required: true, section: "CDL Information" }),
  f("cdl_state", "State Issued", "text", 5, 250, 700, { width: 50, required: true, section: "CDL Information" }),
  f("cdl_exp", "Expiration Date", "date", 5, 320, 700, { width: 80, required: true, section: "CDL Information" }),
  
  // CDL Class - Circle One
  f("cdl_class_a", "Class A", "checkbox", 5, 100, 670, { section: "CDL Information" }),
  f("cdl_class_b", "Class B", "checkbox", 5, 160, 670, { section: "CDL Information" }),
  f("cdl_class_c", "Class C", "checkbox", 5, 220, 670, { section: "CDL Information" }),
  
  // Endorsements - Check all that apply
  f("endorse_h", "H - Hazmat", "checkbox", 5, 72, 640, { section: "CDL Information" }),
  f("endorse_n", "N - Tank", "checkbox", 5, 150, 640, { section: "CDL Information" }),
  f("endorse_p", "P - Passenger", "checkbox", 5, 220, 640, { section: "CDL Information" }),
  f("endorse_s", "S - School Bus", "checkbox", 5, 310, 640, { section: "CDL Information" }),
  f("endorse_t", "T - Double/Triple", "checkbox", 5, 400, 640, { section: "CDL Information" }),
  f("endorse_x", "X - Combo H&N", "checkbox", 5, 490, 640, { section: "CDL Information" }),
  
  // Restrictions
  f("restrict_l", "L - No Air Brake", "checkbox", 5, 72, 610, { section: "CDL Information" }),
  f("restrict_z", "Z - No Full Air", "checkbox", 5, 170, 610, { section: "CDL Information" }),
  f("restrict_e", "E - No Manual", "checkbox", 5, 270, 610, { section: "CDL Information" }),
  f("restrict_o", "O - No Tractor", "checkbox", 5, 360, 610, { section: "CDL Information" }),
  f("restrict_other", "Other Restrictions", "text", 5, 450, 610, { width: 80, section: "CDL Information" }),

  // Medical Card
  f("med_exp", "Medical Card Exp Date", "date", 5, 72, 570, { width: 90, required: true, section: "CDL Information" }),
  f("med_examiner", "Medical Examiner Name", "text", 5, 200, 570, { width: 180, section: "CDL Information" }),
  f("med_registry", "National Registry #", "text", 5, 400, 570, { width: 120, section: "CDL Information" }),
  
  // Other licenses held in past 3 years
  f("other_lic1_state", "Other License 1 - State", "text", 5, 72, 530, { width: 50, section: "CDL Information" }),
  f("other_lic1_num", "License #", "text", 5, 135, 530, { width: 100, section: "CDL Information" }),
  f("other_lic1_type", "Type", "text", 5, 250, 530, { width: 60, section: "CDL Information" }),
  f("other_lic1_exp", "Exp Date", "text", 5, 325, 530, { width: 70, section: "CDL Information" }),
  
  f("other_lic2_state", "Other License 2 - State", "text", 5, 72, 505, { width: 50, section: "CDL Information" }),
  f("other_lic2_num", "License #", "text", 5, 135, 505, { width: 100, section: "CDL Information" }),
  f("other_lic2_type", "Type", "text", 5, 250, 505, { width: 60, section: "CDL Information" }),
  f("other_lic2_exp", "Exp Date", "text", 5, 325, 505, { width: 70, section: "CDL Information" }),

  // License ever denied/suspended/revoked?
  f("lic_denied_yes", "License Denied/Suspended: Yes", "checkbox", 5, 280, 470, { section: "CDL Information" }),
  f("lic_denied_no", "License Denied/Suspended: No", "checkbox", 5, 350, 470, { section: "CDL Information" }),
  f("lic_denied_explain", "If yes, explain", "text", 5, 72, 445, { width: 450, section: "CDL Information" }),

  // ========== PAGE 6: DRIVING EXPERIENCE ==========
  // Type of equipment
  f("exp_straight", "Straight Truck - Years", "text", 6, 200, 680, { width: 40, section: "Driving Experience" }),
  f("exp_straight_miles", "Miles", "text", 6, 260, 680, { width: 60, section: "Driving Experience" }),
  f("exp_straight_from", "From", "text", 6, 340, 680, { width: 50, section: "Driving Experience" }),
  f("exp_straight_to", "To", "text", 6, 410, 680, { width: 50, section: "Driving Experience" }),
  
  f("exp_semi", "Tractor-Trailer - Years", "text", 6, 200, 655, { width: 40, section: "Driving Experience" }),
  f("exp_semi_miles", "Miles", "text", 6, 260, 655, { width: 60, section: "Driving Experience" }),
  f("exp_semi_from", "From", "text", 6, 340, 655, { width: 50, section: "Driving Experience" }),
  f("exp_semi_to", "To", "text", 6, 410, 655, { width: 50, section: "Driving Experience" }),
  
  f("exp_doubles", "Doubles/Triples - Years", "text", 6, 200, 630, { width: 40, section: "Driving Experience" }),
  f("exp_doubles_miles", "Miles", "text", 6, 260, 630, { width: 60, section: "Driving Experience" }),
  
  f("exp_tanker", "Tanker - Years", "text", 6, 200, 605, { width: 40, section: "Driving Experience" }),
  f("exp_tanker_miles", "Miles", "text", 6, 260, 605, { width: 60, section: "Driving Experience" }),
  
  f("exp_hazmat", "Hazmat - Years", "text", 6, 200, 580, { width: 40, section: "Driving Experience" }),
  f("exp_hazmat_miles", "Miles", "text", 6, 260, 580, { width: 60, section: "Driving Experience" }),
  
  f("exp_flatbed", "Flatbed - Years", "text", 6, 200, 555, { width: 40, section: "Driving Experience" }),
  f("exp_flatbed_miles", "Miles", "text", 6, 260, 555, { width: 60, section: "Driving Experience" }),
  
  f("exp_reefer", "Reefer - Years", "text", 6, 200, 530, { width: 40, section: "Driving Experience" }),
  f("exp_reefer_miles", "Miles", "text", 6, 260, 530, { width: 60, section: "Driving Experience" }),
  
  f("exp_other_type", "Other Equipment Type", "text", 6, 72, 505, { width: 110, section: "Driving Experience" }),
  f("exp_other_years", "Years", "text", 6, 200, 505, { width: 40, section: "Driving Experience" }),
  f("exp_other_miles", "Miles", "text", 6, 260, 505, { width: 60, section: "Driving Experience" }),

  // States operated in
  f("states_operated", "List all states operated in (last 5 years)", "text", 6, 72, 460, { width: 450, section: "Driving Experience" }),
  
  // Special training/certifications
  f("special_courses", "Special Courses/Training", "text", 6, 72, 420, { width: 450, section: "Driving Experience" }),
  f("safe_driving_awards", "Safe Driving Awards", "text", 6, 72, 390, { width: 300, section: "Driving Experience" }),

  // ========== PAGE 7: ACCIDENT RECORD (3 YEARS) ==========
  f("acc1_date", "Accident 1 - Date", "date", 7, 72, 680, { width: 70, section: "Accident History" }),
  f("acc1_nature", "Nature of Accident", "text", 7, 155, 680, { width: 150, section: "Accident History" }),
  f("acc1_fatalities", "Fatalities", "text", 7, 320, 680, { width: 40, section: "Accident History" }),
  f("acc1_injuries", "Injuries", "text", 7, 375, 680, { width: 40, section: "Accident History" }),
  f("acc1_hazmat", "Hazmat Spill", "checkbox", 7, 435, 680, { section: "Accident History" }),
  f("acc1_location", "Location", "text", 7, 475, 680, { width: 70, section: "Accident History" }),
  
  f("acc2_date", "Accident 2 - Date", "date", 7, 72, 650, { width: 70, section: "Accident History" }),
  f("acc2_nature", "Nature of Accident", "text", 7, 155, 650, { width: 150, section: "Accident History" }),
  f("acc2_fatalities", "Fatalities", "text", 7, 320, 650, { width: 40, section: "Accident History" }),
  f("acc2_injuries", "Injuries", "text", 7, 375, 650, { width: 40, section: "Accident History" }),
  f("acc2_hazmat", "Hazmat Spill", "checkbox", 7, 435, 650, { section: "Accident History" }),
  f("acc2_location", "Location", "text", 7, 475, 650, { width: 70, section: "Accident History" }),
  
  f("acc3_date", "Accident 3 - Date", "date", 7, 72, 620, { width: 70, section: "Accident History" }),
  f("acc3_nature", "Nature", "text", 7, 155, 620, { width: 150, section: "Accident History" }),
  f("acc3_fatalities", "Fatalities", "text", 7, 320, 620, { width: 40, section: "Accident History" }),
  f("acc3_injuries", "Injuries", "text", 7, 375, 620, { width: 40, section: "Accident History" }),
  f("acc3_hazmat", "Hazmat", "checkbox", 7, 435, 620, { section: "Accident History" }),
  
  f("no_accidents", "NO ACCIDENTS IN PAST 3 YEARS", "checkbox", 7, 72, 580, { section: "Accident History" }),

  // ========== PAGE 8: TRAFFIC VIOLATIONS (3 YEARS) ==========
  f("vio1_date", "Violation 1 - Date", "date", 8, 72, 680, { width: 70, section: "Violations" }),
  f("vio1_offense", "Offense", "text", 8, 155, 680, { width: 200, section: "Violations" }),
  f("vio1_location", "Location (City/State)", "text", 8, 370, 680, { width: 120, section: "Violations" }),
  f("vio1_vehicle", "CMV?", "checkbox", 8, 510, 680, { section: "Violations" }),
  
  f("vio2_date", "Violation 2 - Date", "date", 8, 72, 650, { width: 70, section: "Violations" }),
  f("vio2_offense", "Offense", "text", 8, 155, 650, { width: 200, section: "Violations" }),
  f("vio2_location", "Location", "text", 8, 370, 650, { width: 120, section: "Violations" }),
  f("vio2_vehicle", "CMV?", "checkbox", 8, 510, 650, { section: "Violations" }),
  
  f("vio3_date", "Violation 3 - Date", "date", 8, 72, 620, { width: 70, section: "Violations" }),
  f("vio3_offense", "Offense", "text", 8, 155, 620, { width: 200, section: "Violations" }),
  f("vio3_location", "Location", "text", 8, 370, 620, { width: 120, section: "Violations" }),
  f("vio3_vehicle", "CMV?", "checkbox", 8, 510, 620, { section: "Violations" }),
  
  f("vio4_date", "Violation 4 - Date", "date", 8, 72, 590, { width: 70, section: "Violations" }),
  f("vio4_offense", "Offense", "text", 8, 155, 590, { width: 200, section: "Violations" }),
  f("vio4_location", "Location", "text", 8, 370, 590, { width: 120, section: "Violations" }),
  
  f("no_violations", "NO VIOLATIONS IN PAST 3 YEARS", "checkbox", 8, 72, 550, { section: "Violations" }),

  // ========== PAGE 9: CRIMINAL / GENERAL QUESTIONS ==========
  // Convicted of felony?
  f("felony_yes", "Convicted of Felony: Yes", "checkbox", 9, 350, 680, { section: "Criminal History" }),
  f("felony_no", "Convicted of Felony: No", "checkbox", 9, 420, 680, { section: "Criminal History" }),
  f("felony_explain", "If yes, explain", "text", 9, 72, 655, { width: 450, height: 30, section: "Criminal History" }),
  
  // DUI/DWI?
  f("dui_yes", "DUI/DWI Conviction: Yes", "checkbox", 9, 350, 610, { section: "Criminal History" }),
  f("dui_no", "DUI/DWI Conviction: No", "checkbox", 9, 420, 610, { section: "Criminal History" }),
  f("dui_explain", "If yes, explain", "text", 9, 72, 585, { width: 450, section: "Criminal History" }),
  
  // Failed or refused drug test?
  f("failed_drug_yes", "Failed/Refused Drug Test: Yes", "checkbox", 9, 350, 545, { section: "Criminal History" }),
  f("failed_drug_no", "Failed/Refused Drug Test: No", "checkbox", 9, 420, 545, { section: "Criminal History" }),
  f("failed_drug_explain", "If yes, explain", "text", 9, 72, 520, { width: 450, section: "Criminal History" }),
  
  // Tested positive for controlled substance?
  f("positive_test_yes", "Tested Positive: Yes", "checkbox", 9, 350, 480, { section: "Criminal History" }),
  f("positive_test_no", "Tested Positive: No", "checkbox", 9, 420, 480, { section: "Criminal History" }),
  
  // Completed return-to-duty process?
  f("return_duty_yes", "Completed Return-to-Duty: Yes", "checkbox", 9, 350, 445, { section: "Criminal History" }),
  f("return_duty_no", "N/A", "checkbox", 9, 420, 445, { section: "Criminal History" }),

  // ========== PAGE 10: EDUCATION ==========
  f("edu_highest", "Highest Grade Completed", "text", 10, 250, 680, { width: 40, section: "Education" }),
  f("edu_hs_name", "High School Name", "text", 10, 72, 650, { width: 200, section: "Education" }),
  f("edu_hs_city", "City/State", "text", 10, 290, 650, { width: 150, section: "Education" }),
  f("edu_hs_grad_yes", "Graduated: Yes", "checkbox", 10, 460, 650, { section: "Education" }),
  f("edu_hs_grad_no", "No", "checkbox", 10, 510, 650, { section: "Education" }),
  
  f("edu_college", "College/Trade School", "text", 10, 72, 615, { width: 200, section: "Education" }),
  f("edu_college_city", "City/State", "text", 10, 290, 615, { width: 150, section: "Education" }),
  f("edu_degree", "Degree/Cert", "text", 10, 460, 615, { width: 80, section: "Education" }),

  // ========== PAGE 11: REFERENCES ==========
  f("ref1_name", "Reference 1 - Name", "text", 11, 72, 680, { width: 160, section: "References" }),
  f("ref1_phone", "Phone", "text", 11, 250, 680, { width: 100, section: "References" }),
  f("ref1_years", "Years Known", "text", 11, 370, 680, { width: 40, section: "References" }),
  f("ref1_relation", "Relationship", "text", 11, 430, 680, { width: 100, section: "References" }),
  
  f("ref2_name", "Reference 2 - Name", "text", 11, 72, 645, { width: 160, section: "References" }),
  f("ref2_phone", "Phone", "text", 11, 250, 645, { width: 100, section: "References" }),
  f("ref2_years", "Years Known", "text", 11, 370, 645, { width: 40, section: "References" }),
  f("ref2_relation", "Relationship", "text", 11, 430, 645, { width: 100, section: "References" }),
  
  f("ref3_name", "Reference 3 - Name", "text", 11, 72, 610, { width: 160, section: "References" }),
  f("ref3_phone", "Phone", "text", 11, 250, 610, { width: 100, section: "References" }),
  f("ref3_years", "Years Known", "text", 11, 370, 610, { width: 40, section: "References" }),
  f("ref3_relation", "Relationship", "text", 11, 430, 610, { width: 100, section: "References" }),

  // ========== PAGE 12-13: APPLICANT STATEMENT / CERTIFICATION ==========
  f("cert_printed_name", "Printed Name", "text", 12, 72, 200, { width: 200, required: true, section: "Certification" }),
  f("cert_signature", "Applicant Signature", "signature", 12, 72, 170, { width: 250, required: true, section: "Certification" }),
  f("cert_date", "Date", "date", 12, 400, 170, { width: 90, required: true, section: "Certification" }),

  // ========== PAGE 14: FAIR CREDIT REPORTING ACT ==========
  f("fcra_signature", "FCRA Signature", "signature", 14, 72, 250, { width: 250, required: true, section: "Authorization" }),
  f("fcra_date", "Date", "date", 14, 400, 250, { width: 90, required: true, section: "Authorization" }),
  f("fcra_printed", "Printed Name", "text", 14, 72, 220, { width: 200, section: "Authorization" }),

  // ========== PAGE 15: MVR RELEASE ==========
  f("mvr_signature", "MVR Release Signature", "signature", 15, 72, 300, { width: 250, required: true, section: "Authorization" }),
  f("mvr_date", "Date", "date", 15, 400, 300, { width: 90, required: true, section: "Authorization" }),
  f("mvr_printed", "Printed Name", "text", 15, 72, 270, { width: 200, section: "Authorization" }),

  // ========== PAGE 16: DRUG & ALCOHOL TESTING CONSENT ==========
  f("drug_consent_signature", "Drug/Alcohol Consent Signature", "signature", 16, 72, 280, { width: 250, required: true, section: "Authorization" }),
  f("drug_consent_date", "Date", "date", 16, 400, 280, { width: 90, required: true, section: "Authorization" }),
  f("drug_consent_printed", "Printed Name", "text", 16, 72, 250, { width: 200, section: "Authorization" }),

  // ========== PAGE 17: PSP DISCLOSURE ==========
  f("psp_signature", "PSP Disclosure Signature", "signature", 17, 72, 250, { width: 250, required: true, section: "Authorization" }),
  f("psp_date", "Date", "date", 17, 400, 250, { width: 90, required: true, section: "Authorization" }),

  // ========== PAGE 18: CLEARINGHOUSE CONSENT ==========
  f("clear_signature", "Clearinghouse Consent Signature", "signature", 18, 72, 280, { width: 250, required: true, section: "Authorization" }),
  f("clear_date", "Date", "date", 18, 400, 280, { width: 90, required: true, section: "Authorization" }),
  f("clear_printed", "Printed Name", "text", 18, 72, 250, { width: 200, section: "Authorization" }),

  // ========== PAGE 19: CELL PHONE POLICY ==========
  f("cell_signature", "Cell Phone Policy Signature", "signature", 19, 72, 250, { width: 250, required: true, section: "Authorization" }),
  f("cell_date", "Date", "date", 19, 400, 250, { width: 90, required: true, section: "Authorization" }),

  // ========== PAGE 20: ANNUAL CERTIFICATION OF VIOLATIONS ==========
  f("annual_driver_name", "Driver Name", "text", 20, 72, 680, { width: 200, required: true, section: "Certification" }),
  f("annual_ssn", "SSN (last 4)", "text", 20, 300, 680, { width: 60, section: "Certification" }),
  f("annual_emp_name", "Employer Name", "text", 20, 72, 650, { width: 200, section: "Certification" }),
  f("annual_cert_date", "Certification Date", "date", 20, 300, 650, { width: 90, section: "Certification" }),
  
  // I certify that... (circle one)
  f("annual_no_vio", "I certify NO violations", "checkbox", 20, 72, 600, { section: "Certification" }),
  f("annual_has_vio", "I have violations (listed below)", "checkbox", 20, 72, 580, { section: "Certification" }),
  
  f("annual_vio1", "Violation 1", "text", 20, 72, 540, { width: 450, section: "Certification" }),
  f("annual_vio2", "Violation 2", "text", 20, 72, 515, { width: 450, section: "Certification" }),
  
  f("annual_signature", "Driver Signature", "signature", 20, 72, 450, { width: 250, required: true, section: "Certification" }),
  f("annual_sign_date", "Date", "date", 20, 400, 450, { width: 90, required: true, section: "Certification" }),

  // ========== PAGE 21: PREVIOUS EMPLOYER INQUIRY ==========
  f("prev_emp_applicant", "Applicant Name", "text", 21, 72, 700, { width: 200, section: "Authorization" }),
  f("prev_emp_ssn", "SSN", "text", 21, 300, 700, { width: 120, section: "Authorization" }),
  f("prev_emp_dob", "DOB", "date", 21, 450, 700, { width: 80, section: "Authorization" }),
  f("prev_emp_signature", "Authorization Signature", "signature", 21, 72, 400, { width: 250, required: true, section: "Authorization" }),
  f("prev_emp_date", "Date", "date", 21, 400, 400, { width: 90, required: true, section: "Authorization" }),

  // ========== PAGE 22: W-9 (for owner operators) ==========
  f("w9_name", "Name (as shown on tax return)", "text", 22, 72, 680, { width: 280, section: "Other" }),
  f("w9_business", "Business Name (if different)", "text", 22, 72, 650, { width: 280, section: "Other" }),
  
  // Tax classification - check one
  f("w9_individual", "Individual/Sole Prop", "checkbox", 22, 72, 620, { section: "Other" }),
  f("w9_ccorp", "C Corporation", "checkbox", 22, 180, 620, { section: "Other" }),
  f("w9_scorp", "S Corporation", "checkbox", 22, 270, 620, { section: "Other" }),
  f("w9_partnership", "Partnership", "checkbox", 22, 360, 620, { section: "Other" }),
  f("w9_llc", "LLC", "checkbox", 22, 440, 620, { section: "Other" }),
  f("w9_llc_type", "LLC Tax Type (C/S/P)", "text", 22, 490, 620, { width: 30, section: "Other" }),
  
  f("w9_address", "Address", "text", 22, 72, 580, { width: 280, section: "Other" }),
  f("w9_city_state_zip", "City, State, ZIP", "text", 22, 72, 555, { width: 280, section: "Other" }),
  f("w9_ssn_ein", "SSN or EIN", "text", 22, 72, 510, { width: 150, section: "Other" }),
  f("w9_signature", "W-9 Signature", "signature", 22, 72, 450, { width: 250, section: "Other" }),
  f("w9_date", "Date", "date", 22, 400, 450, { width: 90, section: "Other" }),

  // ========== PAGE 23-24: FORM I-9 ==========
  f("i9_last", "Last Name", "text", 23, 72, 680, { width: 140, section: "Other" }),
  f("i9_first", "First Name", "text", 23, 225, 680, { width: 140, section: "Other" }),
  f("i9_middle", "Middle Initial", "text", 23, 380, 680, { width: 30, section: "Other" }),
  f("i9_maiden", "Other Last Names Used", "text", 23, 430, 680, { width: 100, section: "Other" }),
  
  f("i9_address", "Address", "text", 23, 72, 650, { width: 200, section: "Other" }),
  f("i9_apt", "Apt #", "text", 23, 290, 650, { width: 40, section: "Other" }),
  f("i9_city", "City", "text", 23, 350, 650, { width: 100, section: "Other" }),
  f("i9_state", "State", "text", 23, 465, 650, { width: 30, section: "Other" }),
  f("i9_zip", "ZIP", "text", 23, 510, 650, { width: 50, section: "Other" }),
  
  f("i9_dob", "Date of Birth", "date", 23, 72, 620, { width: 90, section: "Other" }),
  f("i9_ssn", "SSN", "text", 23, 200, 620, { width: 100, section: "Other" }),
  f("i9_email", "Email", "text", 23, 320, 620, { width: 140, section: "Other" }),
  f("i9_phone", "Phone", "text", 23, 480, 620, { width: 80, section: "Other" }),
  
  // Citizenship status - check one
  f("i9_citizen", "US Citizen", "checkbox", 23, 72, 580, { section: "Other" }),
  f("i9_national", "Noncitizen National", "checkbox", 23, 160, 580, { section: "Other" }),
  f("i9_permanent", "Lawful Permanent Resident", "checkbox", 23, 280, 580, { section: "Other" }),
  f("i9_alien", "Alien Authorized to Work", "checkbox", 23, 430, 580, { section: "Other" }),
  
  f("i9_uscis", "USCIS/A-Number", "text", 23, 72, 550, { width: 120, section: "Other" }),
  f("i9_i94", "I-94 Admission Number", "text", 23, 210, 550, { width: 120, section: "Other" }),
  f("i9_passport", "Foreign Passport #", "text", 23, 350, 550, { width: 100, section: "Other" }),
  f("i9_country", "Country", "text", 23, 470, 550, { width: 70, section: "Other" }),
  
  f("i9_signature", "Employee Signature", "signature", 23, 72, 480, { width: 250, section: "Other" }),
  f("i9_date", "Date", "date", 23, 400, 480, { width: 90, section: "Other" }),

  // ========== PAGE 25: ADDITIONAL ACKNOWLEDGMENTS ==========
  f("ack_read_understand", "I have read and understand all policies", "checkbox", 25, 72, 680, { section: "Certification" }),
  f("ack_truthful", "All information is true and complete", "checkbox", 25, 72, 655, { section: "Certification" }),
  f("ack_background", "I authorize background checks", "checkbox", 25, 72, 630, { section: "Certification" }),
  f("ack_drug_test", "I agree to drug/alcohol testing", "checkbox", 25, 72, 605, { section: "Certification" }),
  f("ack_at_will", "I understand employment is at-will", "checkbox", 25, 72, 580, { section: "Certification" }),
  
  f("final_printed", "Printed Name", "text", 25, 72, 520, { width: 200, required: true, section: "Certification" }),
  f("final_signature", "Final Signature", "signature", 25, 72, 480, { width: 250, required: true, section: "Certification" }),
  f("final_date", "Date", "date", 25, 400, 480, { width: 90, required: true, section: "Certification" }),
]
