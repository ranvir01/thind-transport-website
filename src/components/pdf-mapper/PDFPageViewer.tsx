"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as pdfjsLib from "pdfjs-dist"
import type { FieldDefinition } from "./FieldEditor"

// Set worker path - using CDN for reliability
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

interface PDFPageViewerProps {
  pdfUrl: string
  pageNumber: number
  fields: FieldDefinition[]
  onClickPage: (x: number, y: number) => void
  onClickField: (field: FieldDefinition) => void
  scale: number
}

export default function PDFPageViewer({
  pdfUrl,
  pageNumber,
  fields,
  onClickPage,
  onClickField,
  scale,
}: PDFPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageHeight, setPageHeight] = useState(792) // Default letter size height
  const [pageWidth, setPageWidth] = useState(612) // Default letter size width
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
      } catch (err) {
        console.error("Error loading PDF:", err)
        setError("Failed to load PDF")
      }
    }
    loadPdf()
  }, [pdfUrl])

  // Render page when PDF or page number changes
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return

      try {
        setIsLoading(true)
        const page = await pdfDoc.getPage(pageNumber)
        const viewport = page.getViewport({ scale })

        const canvas = canvasRef.current
        const context = canvas.getContext("2d")
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width
        setPageHeight(viewport.height / scale)
        setPageWidth(viewport.width / scale)

        await page.render({
          canvasContext: context,
          viewport,
          canvas: canvas,
        }).promise

        setIsLoading(false)
      } catch (err) {
        console.error("Error rendering page:", err)
        setError("Failed to render page")
        setIsLoading(false)
      }
    }
    renderPage()
  }, [pdfDoc, pageNumber, scale])

  // Handle click on canvas - convert to PDF coordinates
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const clickX = (e.clientX - rect.left) / scale
      // PDF coordinates have origin at bottom-left, so invert Y
      const clickY = pageHeight - (e.clientY - rect.top) / scale

      // Check if clicked on an existing field
      const clickedField = fields
        .filter((f) => f.page === pageNumber)
        .find((f) => {
          const fieldTop = pageHeight - f.y
          const fieldBottom = fieldTop + f.height
          const fieldLeft = f.x
          const fieldRight = f.x + f.width
          
          const scaledClickX = (e.clientX - rect.left) / scale
          const scaledClickY = (e.clientY - rect.top) / scale

          return (
            scaledClickX >= fieldLeft &&
            scaledClickX <= fieldRight &&
            scaledClickY >= fieldTop &&
            scaledClickY <= fieldBottom
          )
        })

      if (clickedField) {
        onClickField(clickedField)
      } else {
        onClickPage(clickX, clickY)
      }
    },
    [fields, pageNumber, pageHeight, scale, onClickPage, onClickField]
  )

  // Render field overlays
  const pageFields = fields.filter((f) => f.page === pageNumber)

  return (
    <div className="relative bg-gray-200 flex items-center justify-center min-h-[600px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange border-t-transparent"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        onClick={handleCanvasClick}
        style={{ width: pageWidth * scale, height: pageHeight * scale }}
      >
        <canvas ref={canvasRef} className="shadow-lg" />

        {/* Field overlays */}
        {pageFields.map((field) => (
          <div
            key={field.id}
            className="absolute border-2 border-orange bg-orange/20 hover:bg-orange/40 cursor-pointer transition-colors flex items-center justify-center"
            style={{
              left: field.x * scale,
              top: (pageHeight - field.y) * scale,
              width: field.width * scale,
              height: field.height * scale,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onClickField(field)
            }}
            title={`${field.label} (${field.id})`}
          >
            <span
              className="text-orange-800 font-medium truncate px-1"
              style={{ fontSize: Math.max(8, field.fontSize * scale * 0.8) }}
            >
              {field.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

