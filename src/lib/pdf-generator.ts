import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface FieldDefinition {
  id: string
  label: string
  type: "text" | "checkbox" | "date" | "signature" | "number"
  page: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  required: boolean
  section?: string
  checkChar?: string
}

export interface FieldMap {
  version: number
  exportedAt: string | null
  pdfTemplate: string
  fields: FieldDefinition[]
}

export interface FormData {
  [fieldId: string]: string | boolean | number
}

/**
 * Generates a filled PDF using pdf-lib by overlaying text at mapped coordinates
 * @param templateUrl - URL to the blank PDF template
 * @param fieldMap - The field mapping configuration
 * @param formData - The form data to fill in
 * @returns The filled PDF as a Blob
 */
export async function generateFilledPDF(
  templateUrl: string,
  fieldMap: FieldMap,
  formData: FormData
): Promise<Blob> {
  // Fetch the blank PDF template
  const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer())
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Get all pages
  const pages = pdfDoc.getPages()
  
  // Fill each field
  for (const field of fieldMap.fields) {
    const value = formData[field.id]
    
    // Skip empty values
    if (value === undefined || value === null || value === '') continue
    
    // Get the page (0-indexed)
    const pageIndex = field.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue
    
    const page = pages[pageIndex]
    
    // Handle different field types
    if (field.type === 'checkbox') {
      // Only draw if checked
      if (value === true || value === 'true' || value === 'yes' || value === 'Yes') {
        page.drawText(field.checkChar || 'X', {
          x: field.x,
          y: field.y,
          size: field.fontSize || 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })
      }
    } else if (field.type === 'signature') {
      // Draw signature as italic text with a line
      const signatureText = String(value)
      page.drawText(signatureText, {
        x: field.x,
        y: field.y,
        size: field.fontSize || 10,
        font: helvetica,
        color: rgb(0, 0, 0.3), // Dark blue for signature
      })
    } else {
      // Text, date, number - draw as text
      const textValue = String(value)
      
      // Handle text wrapping for long values
      const maxWidth = field.width
      const fontSize = field.fontSize || 10
      const charWidth = fontSize * 0.5 // Approximate character width
      const maxChars = Math.floor(maxWidth / charWidth)
      
      if (textValue.length <= maxChars) {
        // Single line
        page.drawText(textValue, {
          x: field.x,
          y: field.y,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        })
      } else {
        // Multi-line: wrap text
        const lines = wrapText(textValue, maxChars)
        const lineHeight = fontSize * 1.2
        
        lines.forEach((line, index) => {
          // Each line goes lower (Y decreases in PDF)
          page.drawText(line, {
            x: field.x,
            y: field.y - (index * lineHeight),
            size: fontSize,
            font: helvetica,
            color: rgb(0, 0, 0),
          })
        })
      }
    }
  }
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save()
  
  // Convert to Blob - handle TypeScript strict ArrayBuffer typing
  const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer
  return new Blob([arrayBuffer], { type: 'application/pdf' })
}

/**
 * Wraps text to fit within a certain number of characters per line
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  
  if (currentLine) lines.push(currentLine)
  
  return lines
}

/**
 * Downloads a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Fetches and parses the field map JSON
 */
export async function loadFieldMap(url: string = '/field-map.json'): Promise<FieldMap> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load field map: ${response.statusText}`)
  }
  return response.json()
}

/**
 * Groups fields by section for better form organization
 */
export function groupFieldsBySection(fields: FieldDefinition[]): Map<string, FieldDefinition[]> {
  const groups = new Map<string, FieldDefinition[]>()
  
  for (const field of fields) {
    const section = field.section || 'Other'
    if (!groups.has(section)) {
      groups.set(section, [])
    }
    groups.get(section)!.push(field)
  }
  
  return groups
}

/**
 * Validates form data against field requirements
 */
export function validateFormData(
  fieldMap: FieldMap,
  formData: FormData
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  for (const field of fieldMap.fields) {
    if (field.required) {
      const value = formData[field.id]
      if (value === undefined || value === null || value === '' || value === false) {
        errors[field.id] = `${field.label} is required`
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
