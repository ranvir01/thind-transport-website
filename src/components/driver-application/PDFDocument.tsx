"use client"

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { DriverApplicationData } from '@/types/driver-application'
import { FIELD_PLACEMENTS, mapFormDataToFields } from '@/lib/pdf-field-mapping'

/**
 * Fill the original Thind Transport Application PDF template with form data
 * Uses coordinate-based text placement since the PDF has no fillable form fields
 */
export async function fillApplicationPDF(formData: DriverApplicationData): Promise<Uint8Array> {
  // Use absolute URL for reliable fetching in all environments
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const templateUrl = `${baseUrl}/templates/thind-transport-application-template.pdf`
  
  console.log('Loading PDF template from:', templateUrl)
  
  // Fetch with retry logic for large files
  let response: Response | null = null
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(templateUrl, {
        cache: 'force-cache', // Cache the large PDF
        headers: {
          'Accept': 'application/pdf',
        },
      })
      
      if (response.ok) {
        break
      } else {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
        console.warn(`PDF fetch attempt ${attempt} failed:`, lastError.message)
      }
    } catch (err: any) {
      lastError = err
      console.warn(`PDF fetch attempt ${attempt} error:`, err.message)
    }
    
    // Wait before retry
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  if (!response || !response.ok) {
    throw new Error(`Failed to load PDF template after 3 attempts: ${lastError?.message || 'Unknown error'}`)
  }
  
  const templateBytes = await response.arrayBuffer()
  console.log('PDF template loaded, size:', templateBytes.byteLength, 'bytes')
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })
  console.log('PDF parsed, pages:', pdfDoc.getPageCount())
  
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
  console.log('PDF filled and saved, output size:', pdfBytes.length, 'bytes')
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
 * Main function to generate application PDF
 * Tries to fill the original template first, falls back to summary if that fails
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
  
  page.drawText('(Full 25-page application PDF could not be generated - please contact support)', {
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
  
  // Address
  if (formData.personalInfo?.currentAddress) {
    y -= 10
    page.drawText('CURRENT ADDRESS', { x: margin, y, size: 12, font: boldFont })
    y -= 20
    const addr = formData.personalInfo.currentAddress
    page.drawText(`${addr.street || ''}`, { x: margin, y, size: 10, font })
    y -= 15
    page.drawText(`${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`, { x: margin, y, size: 10, font })
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
  } else {
    page.drawText('No CDL information provided', { x: margin, y, size: 10, font })
    y -= 15
  }
  
  y -= 20
  page.drawText('EMPLOYMENT HISTORY', { x: margin, y, size: 12, font: boldFont })
  y -= 20
  
  const employment = formData.employmentHistory?.entries || []
  if (employment.length > 0) {
    for (let i = 0; i < Math.min(3, employment.length); i++) {
      const emp = employment[i]
      page.drawText(`${emp.employerName || 'Unknown'} - ${emp.position || 'Driver'}`, { x: margin, y, size: 10, font })
      y -= 15
      page.drawText(`${emp.fromDate || ''} to ${emp.toDate || ''}`, { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
      y -= 18
    }
  } else {
    page.drawText('No employment history provided', { x: margin, y, size: 10, font })
    y -= 15
  }
  
  y -= 20
  page.drawText('AUTHORIZATION', { x: margin, y, size: 12, font: boldFont })
  y -= 20
  
  page.drawText(`Signed by: ${formData.pspAuthorization?.fullName || 'Not signed'}`, { x: margin, y, size: 10, font })
  y -= 15
  page.drawText(`Date: ${formData.pspAuthorization?.signatureDate || 'N/A'}`, { x: margin, y, size: 10, font })
  
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
