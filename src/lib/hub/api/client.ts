/**
 * Typed HaulDesk API client — swap implementation from server actions to Go fetch/gRPC
 * without changing UI call sites. Signatures match docs/design/hauldesk-api.js.
 */

import type { ContractDriver, ContractInvoice, ContractLoad, ContractTruck } from "./types"

export interface HaulDeskApi {
  listLoads(): Promise<ContractLoad[]>
  createLoad(input: {
    customer: string
    origin: string
    dest: string
    driver?: string
    rate: number
    margin?: number
  }): Promise<ContractLoad>
  assignDriver(ref: string, driverName: string): Promise<ContractLoad | null>
  advanceLoad(ref: string): Promise<ContractLoad | null>
  createInvoice(ref: string): Promise<ContractInvoice | null>
  sendInvoice(num: string): Promise<ContractInvoice | null>
  addDriver(input: { name: string; phone?: string; truck?: string; cdl?: string }): Promise<ContractDriver>
  addTruck(input: { unit: string; plate?: string }): Promise<ContractTruck>
  runPayroll(): Promise<{ paid: number }>
  toggleTask(id: string): Promise<{ id: string; done: boolean } | null>
  markNotificationsRead(): Promise<void>
  /** Rust optimizer — stub until services/optimizer is wired */
  estimateEta(ref: string): Promise<{ etaMinutes: number } | null>
  calcIfta(quarter: string): Promise<{ jurisdictions: string[] } | null>
}

const API_BASE = process.env.HAULDESK_API_URL ?? ""

/** HTTP client for when HAULDESK_API_URL points at services/api (Go). */
export class FetchHaulDeskApi implements HaulDeskApi {
  constructor(private base = API_BASE) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    })
    if (!res.ok) throw new Error(`HaulDesk API ${path}: ${res.status}`)
    return res.json() as Promise<T>
  }

  listLoads() {
    return this.request<ContractLoad[]>("/v1/loads")
  }
  createLoad(input: Parameters<HaulDeskApi["createLoad"]>[0]) {
    return this.request<ContractLoad>("/v1/loads", { method: "POST", body: JSON.stringify(input) })
  }
  assignDriver(ref: string, driverName: string) {
    return this.request<ContractLoad | null>(`/v1/loads/${ref}/assign`, {
      method: "POST",
      body: JSON.stringify({ driver: driverName }),
    })
  }
  advanceLoad(ref: string) {
    return this.request<ContractLoad | null>(`/v1/loads/${ref}/advance`, { method: "POST" })
  }
  createInvoice(ref: string) {
    return this.request<ContractInvoice | null>("/v1/invoices", {
      method: "POST",
      body: JSON.stringify({ ref }),
    })
  }
  sendInvoice(num: string) {
    return this.request<ContractInvoice | null>(`/v1/invoices/${num}/send`, { method: "POST" })
  }
  addDriver(input: Parameters<HaulDeskApi["addDriver"]>[0]) {
    return this.request<ContractDriver>("/v1/drivers", { method: "POST", body: JSON.stringify(input) })
  }
  addTruck(input: Parameters<HaulDeskApi["addTruck"]>[0]) {
    return this.request<ContractTruck>("/v1/trucks", { method: "POST", body: JSON.stringify(input) })
  }
  runPayroll() {
    return this.request<{ paid: number }>("/v1/settlements/run", { method: "POST" })
  }
  toggleTask(id: string) {
    return this.request<{ id: string; done: boolean } | null>(`/v1/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ toggle: true }),
    })
  }
  markNotificationsRead() {
    return this.request<void>("/v1/notifications/read", { method: "POST" })
  }
  estimateEta(ref: string) {
    return this.request<{ etaMinutes: number } | null>("/v1/routing/eta", {
      method: "POST",
      body: JSON.stringify({ ref }),
    })
  }
  calcIfta(quarter: string) {
    return this.request<{ jurisdictions: string[] } | null>("/v1/ifta/calc", {
      method: "POST",
      body: JSON.stringify({ quarter }),
    })
  }
}

/** Returns Fetch client when HAULDESK_API_URL is set; otherwise null (use server actions). */
export function createHaulDeskApi(): HaulDeskApi | null {
  if (!API_BASE) return null
  return new FetchHaulDeskApi()
}

export type { ContractDriver, ContractInvoice, ContractLoad, ContractTruck } from "./types"
export { LOAD_FLOW, STATUS_META, nextStatus } from "./types"
