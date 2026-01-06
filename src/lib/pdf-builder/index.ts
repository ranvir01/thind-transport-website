/**
 * Thind Transport DOT Application PDF Generator
 * Generates a complete 25-page fillable PDF from scratch
 */

import { createPDFContext, addPage, drawPageNumber, PDFContext } from './utils'

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
 * Generate the complete DOT Driver Application PDF
 * Returns a Blob of the PDF
 */
export async function generateDOTApplicationPDF(): Promise<Blob> {
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
  
  // Save and return as Blob
  const pdfBytes = await ctx.doc.save()
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer
  
  return new Blob([arrayBuffer], { type: 'application/pdf' })
}

