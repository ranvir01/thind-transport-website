// DOT Application - Minimal Starter Fields
// Drag these to the correct positions on YOUR PDF

import type { FieldDefinition } from "@/components/pdf-mapper/FieldEditor"

// Start with essential fields only - add more as needed via the mapper
export const DOT_APPLICATION_FIELDS: FieldDefinition[] = [
  // PAGE 2 - Basic applicant info (adjust positions to match your form)
  { id: "name", label: "Applicant Name", type: "text", page: 2, x: 100, y: 700, width: 200, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "ssn", label: "SSN", type: "text", page: 2, x: 350, y: 700, width: 100, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "dob", label: "Date of Birth", type: "date", page: 2, x: 480, y: 700, width: 80, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "phone", label: "Phone", type: "text", page: 2, x: 100, y: 650, width: 120, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  { id: "address", label: "Address", type: "text", page: 2, x: 100, y: 600, width: 300, height: 14, fontSize: 10, required: true, section: "Applicant Information" },
  
  // PAGE 5 - CDL Info
  { id: "cdl_number", label: "CDL Number", type: "text", page: 5, x: 100, y: 700, width: 150, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  { id: "cdl_state", label: "State", type: "text", page: 5, x: 280, y: 700, width: 50, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  { id: "cdl_exp", label: "Expiration", type: "date", page: 5, x: 360, y: 700, width: 80, height: 14, fontSize: 10, required: true, section: "CDL Information" },
  
  // PAGE 12 - Main signature
  { id: "signature", label: "Signature", type: "signature", page: 12, x: 100, y: 200, width: 250, height: 20, fontSize: 12, required: true, section: "Certification" },
  { id: "sign_date", label: "Date", type: "date", page: 12, x: 400, y: 200, width: 100, height: 14, fontSize: 10, required: true, section: "Certification" },
]
