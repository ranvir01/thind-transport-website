/**
 * Script to analyze the Thind Transport Application PDF and extract all form fields
 * Run with: node scripts/analyze-pdf-fields.mjs
 */

import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

async function analyzePDF() {
  const pdfPath = path.join(process.cwd(), 'Thind Transport Application (1).pdf')
  
  console.log('Loading PDF from:', pdfPath)
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file not found!')
    process.exit(1)
  }
  
  const pdfBytes = fs.readFileSync(pdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  
  console.log('\n=== PDF Analysis ===')
  console.log('Title:', pdfDoc.getTitle() || 'N/A')
  console.log('Author:', pdfDoc.getAuthor() || 'N/A')
  console.log('Page Count:', pdfDoc.getPageCount())
  
  // Try to get the form
  try {
    const form = pdfDoc.getForm()
    const fields = form.getFields()
    
    console.log('\n=== Form Fields Found ===')
    console.log('Total Fields:', fields.length)
    
    if (fields.length === 0) {
      console.log('\nNo fillable form fields found in this PDF.')
      console.log('The PDF is likely a flat/scanned document.')
      console.log('We will need to use coordinate-based text placement instead.')
    } else {
      console.log('\nField Details:')
      fields.forEach((field, index) => {
        const type = field.constructor.name
        const name = field.getName()
        console.log(`${index + 1}. [${type}] ${name}`)
      })
    }
  } catch (error) {
    console.log('\nError accessing form:', error.message)
    console.log('The PDF may not have a form or may be encrypted.')
  }
  
  // Get page dimensions for coordinate-based placement
  console.log('\n=== Page Dimensions ===')
  for (let i = 0; i < Math.min(3, pdfDoc.getPageCount()); i++) {
    const page = pdfDoc.getPage(i)
    const { width, height } = page.getSize()
    console.log(`Page ${i + 1}: ${width} x ${height} points`)
  }
}

analyzePDF().catch(console.error)

