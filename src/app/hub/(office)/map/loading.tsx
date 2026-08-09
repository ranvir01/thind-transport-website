export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-7 w-48 rounded-control" />
      <div className="hub-skeleton h-[60vh] min-h-[360px] rounded-card" />
    </div>
  )
}
