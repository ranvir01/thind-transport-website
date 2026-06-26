/** Domain contract mirrored from proto/hauldesk/v1 and docs/design/hauldesk-api.js */

export const LOAD_FLOW = [
  "quoted",
  "booked",
  "dispatched",
  "at_pickup",
  "in_transit",
  "needs_invoice",
  "invoiced",
  "paid",
] as const

export type ContractLoadStatus = (typeof LOAD_FLOW)[number]

export type StatusTone = "neutral" | "accent" | "amber" | "blue" | "green"

export const STATUS_META: Record<
  ContractLoadStatus,
  { label: string; tone: StatusTone }
> = {
  quoted: { label: "Quoted", tone: "neutral" },
  booked: { label: "Booked", tone: "neutral" },
  dispatched: { label: "Dispatched", tone: "accent" },
  at_pickup: { label: "At pickup", tone: "amber" },
  in_transit: { label: "In transit", tone: "blue" },
  needs_invoice: { label: "Needs invoice", tone: "amber" },
  invoiced: { label: "Invoiced", tone: "accent" },
  paid: { label: "Paid", tone: "green" },
}

export interface ContractLoad {
  ref: string
  status: ContractLoadStatus
  customer: string
  origin: string
  dest: string
  driver: string
  rate: number
  margin: number
}

export interface ContractDriver {
  id: string
  name: string
  phone: string
  truck: string
  status: string
  hos: number
  cdl: string
}

export interface ContractTruck {
  unit: string
  plate: string
  status: string
  driver: string
  loc: string
  service: string
}

export interface ContractInvoice {
  num: string
  ref: string
  customer: string
  amount: number
  age: number
  status: "Draft" | "Sent" | "Overdue" | "Paid"
}

/** Pure transition — identical logic will live in the Go handler. */
export function nextStatus(status: ContractLoadStatus): ContractLoadStatus {
  const i = LOAD_FLOW.indexOf(status)
  return i < 0 || i >= LOAD_FLOW.length - 1 ? status : LOAD_FLOW[i + 1]
}
