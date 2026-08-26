/*
 * HaulDesk — API client & domain contract
 * ----------------------------------------
 * This is the single seam between the UI (TypeScript/Next.js) and the backend
 * (Go core API + Rust compute services). The prototype runs against the in-memory
 * MockHaulDeskApi below; in production you swap the method bodies for fetch()/gRPC
 * calls and NOTHING in the UI changes — the method names, arguments, and return
 * shapes are the contract.
 *
 * Endpoint map (contract-first — generate TS types + Go stubs + Rust prost/tonic
 * from one OpenAPI/proto definition):
 *
 *   listLoads / getLoad / createLoad      GET|POST  /v1/loads            services/api (Go)
 *   assignDriver                          POST      /v1/loads/:ref/assign         (Go)
 *   advanceLoad                           POST      /v1/loads/:ref/advance        (Go) — status machine
 *   createInvoice / sendInvoice           POST      /v1/invoices                  (Go) — billing
 *   listDrivers / addDriver               GET|POST  /v1/drivers                   (Go)
 *   listTrucks  / addTruck                GET|POST  /v1/trucks                    (Go)
 *   runPayroll                            POST      /v1/settlements/run           (Go) — pay engine
 *   toggleTask                            PATCH     /v1/tasks/:id                 (Go)
 *   markNotificationsRead                 POST      /v1/notifications/read        (Go)
 *   optimizeRoute / estimateEta           POST      /v1/routing/*        services/optimizer (Rust)
 *   ingestEld                             (stream)  telematics ingestion  services/ingest    (Rust)
 *   calcIfta                              POST      /v1/ifta/calc        services/optimizer (Rust)
 *
 * Domain types (JSDoc — mirror these as TS interfaces / Go structs / Rust structs):
 * @typedef {'quoted'|'booked'|'dispatched'|'at_pickup'|'in_transit'|'needs_invoice'|'invoiced'|'paid'} LoadStatus
 * @typedef {Object} Load   { ref:string, status:LoadStatus, customer:string, origin:string, dest:string, driver:string, rate:number, margin:number }
 * @typedef {Object} Driver { id:string, name:string, phone:string, truck:string, status:string, hos:number, cdl:string }
 * @typedef {Object} Truck  { unit:string, plate:string, status:string, driver:string, loc:string, service:string }
 * @typedef {Object} Invoice{ num:string, ref:string, customer:string, amount:number, age:number, status:'Draft'|'Sent'|'Overdue'|'Paid' }
 */

// The status machine the Go service will enforce server-side.
export const LOAD_FLOW = ['quoted', 'booked', 'dispatched', 'at_pickup', 'in_transit', 'needs_invoice', 'invoiced', 'paid'];

export const STATUS_META = {
  quoted:        { label: 'Quoted',        tone: 'neutral' },
  booked:        { label: 'Booked',        tone: 'neutral' },
  dispatched:    { label: 'Dispatched',    tone: 'accent'  },
  at_pickup:     { label: 'At pickup',     tone: 'amber'   },
  in_transit:    { label: 'In transit',    tone: 'blue'    },
  needs_invoice: { label: 'Needs invoice', tone: 'amber'   },
  invoiced:      { label: 'Invoiced',      tone: 'accent'  },
  paid:          { label: 'Paid',          tone: 'green'   },
};

/** Pure transition — identical logic will live in the Go handler. */
export function nextStatus(status) {
  const i = LOAD_FLOW.indexOf(status);
  return i < 0 || i >= LOAD_FLOW.length - 1 ? status : LOAD_FLOW[i + 1];
}

/**
 * In-memory implementation used by the prototype. Every method returns a Promise
 * and simulates network latency so the UI's async handling is real. Replace the
 * bodies with fetch()/gRPC for production; keep the signatures.
 */
export class MockHaulDeskApi {
  constructor(store) { this.store = store; this._latency = 0; }
  _wait() { return this._latency ? new Promise((r) => setTimeout(r, this._latency)) : Promise.resolve(); }

  async listLoads() { await this._wait(); return this.store.loads; }

  async createLoad(input) {
    await this._wait();
    this.store.seq += 1;
    const load = {
      ref: 'TL-' + (24822 + this.store.seq),
      status: input.driver && input.driver !== '— unassigned' ? 'dispatched' : 'booked',
      customer: input.customer, origin: input.origin, dest: input.dest,
      driver: input.driver || '— unassigned',
      rate: input.rate, margin: input.margin == null ? 26 : input.margin,
    };
    this.store.loads.unshift(load);
    return load; // POST /v1/loads → 201
  }

  async assignDriver(ref, driverName) {
    await this._wait();
    const l = this.store.loads.find((x) => x.ref === ref);
    if (l) { l.driver = driverName; if (l.status === 'booked' || l.status === 'quoted') l.status = 'dispatched'; }
    return l; // POST /v1/loads/:ref/assign
  }

  async advanceLoad(ref) {
    await this._wait();
    const l = this.store.loads.find((x) => x.ref === ref);
    if (l) l.status = nextStatus(l.status);
    return l; // POST /v1/loads/:ref/advance — server enforces the machine
  }

  async createInvoice(ref) {
    await this._wait();
    const l = this.store.loads.find((x) => x.ref === ref);
    if (!l) return null;
    this.store.seq += 1;
    const inv = { num: 'INV-' + (1043 + this.store.seq), ref: l.ref, customer: l.customer, amount: l.rate, age: 0, status: 'Draft' };
    this.store.invoices.unshift(inv);
    l.status = 'invoiced';
    return inv; // POST /v1/invoices
  }

  async sendInvoice(num) {
    await this._wait();
    const iv = this.store.invoices.find((x) => x.num === num);
    if (iv) iv.status = 'Sent';
    return iv; // POST /v1/invoices/:num/send
  }

  async addDriver(input) {
    await this._wait();
    const d = { id: 'D-' + (++this.store.seq), name: input.name, phone: input.phone || '—',
      truck: input.truck || '—', status: 'Available', tone: 'green', hos: 11, cdl: input.cdl || '2027', cdlTone: 'neutral', loads: 0 };
    this.store.drivers.push(d);
    return d; // POST /v1/drivers
  }

  async addTruck(input) {
    await this._wait();
    const t = { unit: input.unit, plate: input.plate || 'WA · —', status: 'Available', tone: 'green', driver: '—', loc: 'Kent, WA · yard', service: 'in 10,000 mi' };
    this.store.trucks.push(t);
    return t; // POST /v1/trucks
  }

  async runPayroll() {
    await this._wait();
    let total = 0;
    this.store.settlements.forEach((s) => { if (s.status === 'Ready') { s.status = 'Paid'; s.tone = 'green'; total += s.gross - s.ded; } });
    return { paid: total }; // POST /v1/settlements/run → pay engine
  }

  async toggleTask(id) {
    await this._wait();
    const t = this.store.tasks.find((x) => x.id === id);
    if (t) t.done = !t.done;
    return t; // PATCH /v1/tasks/:id
  }

  async markNotificationsRead() {
    await this._wait();
    this.store.notifications.forEach((n) => { n.unread = false; });
    return this.store.notifications; // POST /v1/notifications/read
  }

  /* ---- Rust compute services (stubs — wired later) ---- */
  async estimateEta(/* ref */) { await this._wait(); /* POST /v1/routing/eta → services/optimizer (Rust) */ return null; }
  async calcIfta(/* quarter */) { await this._wait(); /* POST /v1/ifta/calc → services/optimizer (Rust) */ return null; }
}

// Default export kept simple for `import api from './hauldesk-api'` ergonomics.
export default MockHaulDeskApi;
