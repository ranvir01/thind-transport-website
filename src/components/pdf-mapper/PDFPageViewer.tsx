"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as pdfjsLib from "pdfjs-dist"
import type { FieldDefinition } from "./FieldEditor"

// Set worker path - use local copy for version compatibility
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
}

interface PDFPageViewerProps {
  pdfUrl: string
  pageNumber: number
  fields: FieldDefinition[]
  onClickPage: (x: number, y: number) => void
  onClickField: (field: FieldDefinition) => void
  onUpdateField: (field: FieldDefinition) => void
  scale: number
  addMode?: boolean
}

export default function PDFPageViewer({
  pdfUrl,
  pageNumber,
  fields,
  onClickPage,
  onClickField,
  onUpdateField,
  scale,
  addMode = false,
}: PDFPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageHeight, setPageHeight] = useState(792)
  const [pageWidth, setPageWidth] = useState(612)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Drag state
  const [dragState, setDragState] = useState<{
    fieldId: string
    mode: 'move' | 'resize-right' | 'resize-bottom' | 'resize-corner'
    startX: number
    startY: number
    startFieldX: number
    startFieldY: number
    startWidth: number
    startHeight: number
  } | null>(null)

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

  // Render page
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

  // Handle mouse move for dragging
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      const field = fields.find(f => f.id === dragState.fieldId)
      if (!field) return

      const deltaX = (e.clientX - dragState.startX) / scale
      const deltaY = (e.clientY - dragState.startY) / scale

      let updates: Partial<FieldDefinition> = {}

      if (dragState.mode === 'move') {
        updates = {
          x: Math.max(0, dragState.startFieldX + deltaX),
          y: Math.max(0, dragState.startFieldY - deltaY), // Invert Y for PDF coords
        }
      } else if (dragState.mode === 'resize-right') {
        updates = {
          width: Math.max(20, dragState.startWidth + deltaX),
        }
      } else if (dragState.mode === 'resize-bottom') {
        updates = {
          height: Math.max(10, dragState.startHeight + deltaY),
          y: dragState.startFieldY - deltaY,
        }
      } else if (dragState.mode === 'resize-corner') {
        updates = {
          width: Math.max(20, dragState.startWidth + deltaX),
          height: Math.max(10, dragState.startHeight + deltaY),
          y: dragState.startFieldY - deltaY,
        }
      }

      onUpdateField({ ...field, ...updates })
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, fields, scale, onUpdateField])

  // Handle click on canvas
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragState) return
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const clickX = (e.clientX - rect.left) / scale
      const clickY = pageHeight - (e.clientY - rect.top) / scale

      onClickPage(clickX, clickY)
    },
    [pageHeight, scale, onClickPage, dragState]
  )

  // Start dragging
  const handleFieldMouseDown = (
    e: React.MouseEvent,
    field: FieldDefinition,
    mode: 'move' | 'resize-right' | 'resize-bottom' | 'resize-corner'
  ) => {
    e.stopPropagation()
    e.preventDefault()
    
    setDragState({
      fieldId: field.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startFieldX: field.x,
      startFieldY: field.y,
      startWidth: field.width,
      startHeight: field.height,
    })
  }

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
        className={`relative select-none ${addMode ? 'cursor-crosshair' : 'cursor-default'}`}
        onClick={handleCanvasClick}
        style={{ width: pageWidth * scale, height: pageHeight * scale }}
      >
        <canvas ref={canvasRef} className="shadow-lg pointer-events-none" />

        {/* Field overlays with drag handles */}
        {pageFields.map((field) => {
          const isDragging = dragState?.fieldId === field.id
          const left = field.x * scale
          const top = (pageHeight - field.y) * scale
          const width = field.width * scale
          const height = field.height * scale

          return (
            <div
              key={field.id}
              className={`absolute border-2 ${isDragging ? 'border-blue-500 bg-blue-200/50' : 'border-orange bg-orange/20 hover:bg-orange/40'} transition-colors group`}
              style={{ left, top, width, height }}
            >
              {/* Move handle (center) */}
              <div
                className="absolute inset-0 cursor-move flex items-center justify-center"
                onMouseDown={(e) => handleFieldMouseDown(e, field, 'move')}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  onClickField(field)
                }}
                title="Drag to move, double-click to edit"
              >
                <span
                  className="text-orange-800 font-medium truncate px-1 pointer-events-none"
                  style={{ fontSize: Math.max(8, Math.min(12, field.fontSize * scale * 0.7)) }}
                >
                  {field.label}
                </span>
              </div>

              {/* Resize handle - right edge */}
              <div
                className="absolute top-0 right-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-orange/50 hover:bg-orange"
                onMouseDown={(e) => handleFieldMouseDown(e, field, 'resize-right')}
                title="Drag to resize width"
              />

              {/* Resize handle - bottom edge */}
              <div
                className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-orange/50 hover:bg-orange"
                onMouseDown={(e) => handleFieldMouseDown(e, field, 'resize-bottom')}
                title="Drag to resize height"
              />

              {/* Resize handle - corner */}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize opacity-0 group-hover:opacity-100 bg-orange hover:bg-orange-600 rounded-tl"
                onMouseDown={(e) => handleFieldMouseDown(e, field, 'resize-corner')}
                title="Drag to resize"
              />

              {/* Field type indicator */}
              <div className="absolute -top-5 left-0 text-xs bg-navy text-white px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {field.type}{field.required ? ' *' : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      {!isLoading && !error && (
        <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
          {addMode ? '🎯 Click to place new field' : 'Drag to move • Edges to resize • Double-click to edit'}
        </div>
      )}
    </div>
  )
}

