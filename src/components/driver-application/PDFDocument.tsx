"use client"

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { DriverApplicationData } from '@/types/driver-application'
import { FIELD_PLACEMENTS, mapFormDataToFields, type FieldPlacement } from '@/lib/pdf-field-mapping'

/**
 * Fill the original Thind Transport Application PDF template with form data
 * Uses coordinate-based text placement since the PDF has no fillable form fields
 */
export async function fillApplicationPDF(formData: DriverApplicationData): Promise<Uint8Array> {
  // Fetch the original PDF template
  const templateUrl = '/templates/thind-transport-application-template.pdf'
  const response = await fetch(templateUrl)
  
  if (!response.ok) {
    throw new Error(`Failed to load PDF template: ${response.status}`)
  }
  
  const templateBytes = await response.arrayBuffer()
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Get the field values from form data
  const fieldValues = mapFormDataToFields(formData)
  
  // Get all pages
  const pages = pdfDoc.getPages()
  
  // Place text on each field
  for (const [fieldKey, placement] of Object.entries(FIELD_PLACEMENTS)) {
    const value = fieldValues[fieldKey]
    
    // Skip if no value or page doesn't exist
    if (value === undefined || value === '' || placement.page >= pages.length) {
      continue
    }
    
    const page = pages[placement.page]
    
    if (placement.isCheckbox) {
      // Draw a checkmark if value is true
      if (value === true) {
        page.drawText('✓', {
          x: placement.x,
          y: placement.y,
          size: placement.fontSize || 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
      }
    } else if (typeof value === 'string' && value) {
      // Draw text
      const text = truncateText(value, placement.maxWidth, font, placement.fontSize || 10)
      page.drawText(text, {
        x: placement.x,
        y: placement.y,
        size: placement.fontSize || 10,
        font: font,
        color: rgb(0, 0, 0),
      })
    }
  }
  
  // Save and return the modified PDF
  const pdfBytes = await pdfDoc.save()
  return new Uint8Array(pdfBytes)
}

/**
 * Truncate text to fit within maxWidth
 */
function truncateText(text: string, maxWidth: number | undefined, font: any, fontSize: number): string {
  if (!maxWidth) return text
  
  let truncated = text
  while (font.widthOfTextAtSize(truncated, fontSize) > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1)
  }
  
  if (truncated.length < text.length && truncated.length > 3) {
    truncated = truncated.slice(0, -3) + '...'
  }
  
  return truncated
}

/**
 * Legacy function for backwards compatibility - generates a new PDF from scratch
 * This is kept as a fallback in case the template approach fails
 */
export async function generateApplicationPDF(formData: DriverApplicationData): Promise<Uint8Array> {
  try {
    // Try to fill the original template first
    return await fillApplicationPDF(formData)
  } catch (error) {
    console.error('Failed to fill PDF template, falling back to generation:', error)
    // If template filling fails, generate a simple summary PDF
    return await generateFallbackPDF(formData)
  }
}

/**
 * Generate a fallback summary PDF if template filling fails
 */
async function generateFallbackPDF(formData: DriverApplicationData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const page = pdfDoc.addPage([612, 792])
  let y = 750
  const margin = 50
  
  // Header
  page.drawText('THIND TRANSPORT LLC', {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.8, 0.4, 0),
  })
  y -= 25
  
  page.drawText('DRIVER APPLICATION SUMMARY', {
    x: margin,
    y,
    size: 14,
    font: boldFont,
  })
  y -= 20
  
  page.drawText('(Full 25-page application PDF could not be generated)', {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })
  y -= 40
  
  // Personal Info
  page.drawText('APPLICANT INFORMATION', {
    x: margin,
    y,
    size: 12,
    font: boldFont,
  })
  y -= 20
  
  const personalLines = [
    `Name: ${formData.personalInfo?.firstName || ''} ${formData.personalInfo?.lastName || ''}`,
    `DOB: ${formData.personalInfo?.dateOfBirth || ''} | Age: ${formData.personalInfo?.age || ''}`,
    `SSN: ${formData.personalInfo?.socialSecurityNumber || ''}`,
    `Phone: ${formData.personalInfo?.phone || ''}`,
    `Emergency: ${formData.personalInfo?.emergencyPhone || ''}`,
  ]
  
  for (const line of personalLines) {
    page.drawText(line, { x: margin, y, size: 10, font })
    y -= 15
  }
  
  y -= 20
  page.drawText('CDL INFORMATION', { x: margin, y, size: 12, font: boldFont })
  y -= 20
  
  const cdl = formData.drivingRecord?.cdlLicenses?.[0]
  if (cdl) {
    page.drawText(`License: ${cdl.licenseNumber} (${cdl.state}) - ${cdl.type}`, { x: margin, y, size: 10, font })
    y -= 15
    page.drawText(`Expires: ${cdl.expirationDate} | Endorsements: ${cdl.endorsements || 'None'}`, { x: margin, y, size: 10, font })
    y -= 15
  }
  
  y -= 20
  page.drawText('AUTHORIZATION', { x: margin, y, size: 12, font: boldFont })
  y -= 20
  
  page.drawText(`Signed by: ${formData.pspAuthorization?.fullName || ''}`, { x: margin, y, size: 10, font })
  y -= 15
  page.drawText(`Date: ${formData.pspAuthorization?.signatureDate || ''}`, { x: margin, y, size: 10, font })
  
  const pdfBytes = await pdfDoc.save()
  return new Uint8Array(pdfBytes)
}

/**
 * Download PDF helper function
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
