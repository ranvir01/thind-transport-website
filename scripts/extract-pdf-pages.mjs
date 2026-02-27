/**
 * Extract PDF pages to PNG images for the overlay form system
 * 
 * Usage: node scripts/extract-pdf-pages.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const pdfPath = join(projectRoot, 'public', 'templates', 'thind-transport-application-template.pdf')
const outputDir = join(projectRoot, 'public', 'templates', 'pages')

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

async function extractPages() {
  // Dynamic import for ES modules
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { createCanvas } = await import('canvas')
  
  console.log('Loading PDF from:', pdfPath)
  
  // Read PDF file
  const pdfData = new Uint8Array(readFileSync(pdfPath))
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true,
  })
  
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  
  console.log(`PDF loaded. Total pages: ${numPages}`)
  
  // Extract each page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    console.log(`Processing page ${pageNum}/${numPages}...`)
    
    const page = await pdfDoc.getPage(pageNum)
    
    // Get page dimensions at 2x scale for better quality
    const scale = 2.0
    const viewport = page.getViewport({ scale })
    
    // Create canvas
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
    
    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise
    
    // Save as PNG
    const pageNumStr = String(pageNum).padStart(2, '0')
    const outputPath = join(outputDir, `page-${pageNumStr}.png`)
    
    const buffer = canvas.toBuffer('image/png')
    writeFileSync(outputPath, buffer)
    
    console.log(`  Saved: page-${pageNumStr}.png (${viewport.width}x${viewport.height})`)
  }
  
  console.log(`\nDone! Extracted ${numPages} pages to ${outputDir}`)
}

extractPages().catch(err => {
  console.error('Error extracting pages:', err)
  process.exit(1)
})

