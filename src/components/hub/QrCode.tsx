import { qrMatrix, qrSvgPath } from "@/lib/hub/qr"

/**
 * Server-rendered QR code. Always dark-on-white regardless of theme —
 * scanners need the contrast, so the white tile is part of the design.
 */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const matrix = qrMatrix(value)
  const quiet = 4
  const span = matrix.length + quiet * 2
  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      role="img"
      aria-label={label ?? value}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect width={span} height={span} fill="#FFFFFF" />
      <path d={qrSvgPath(matrix, quiet)} fill="#0E1621" />
    </svg>
  )
}
