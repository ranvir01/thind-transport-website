/**
 * Empty form-state factories. Plain module (not "use client") so server
 * pages can build initial state and pass it to the client form components.
 */
import type { LoadFormInitial } from "@/components/hub/LoadForm"
import type { TruckFormState, TrailerFormState } from "@/components/hub/FleetForms"
import type { DriverFormState } from "@/components/hub/DriverForm"
import type { CustomerFormState } from "@/components/hub/CustomerForm"

export function emptyLoadForm(): LoadFormInitial {
  return {
    customer_id: "", customer_reference: "", equipment: "dry_van", commodity: "",
    weight_lbs: "", linehaul: "", fuel_surcharge: "", loaded_miles: "", deadhead_miles: "",
    truck_id: "", trailer_id: "", driver_id: "", factored: false, notes: "",
    stops: [
      { type: "pickup", facility: "", address: "", city: "", state: "", zip: "", pickup_number: "", po_number: "", fcfs: false, appt_start: "", notes: "" },
      { type: "delivery", facility: "", address: "", city: "", state: "", zip: "", pickup_number: "", po_number: "", fcfs: false, appt_start: "", notes: "" },
    ],
    accessorials: [],
  }
}

export function emptyTruck(): TruckFormState {
  return {
    unit_number: "", vin: "", plate: "", plate_state: "", year: "", make: "", model: "",
    ownership: "company", status: "active", registration_expiry: "", inspection_due: "",
    insurance_expiry: "", assigned_driver_id: "", tank_capacity_gallons: "", notes: "",
  }
}

export function emptyTrailer(): TrailerFormState {
  return {
    unit_number: "", vin: "", plate: "", plate_state: "", year: "", make: "",
    type: "dry_van", status: "active", registration_expiry: "", inspection_due: "", notes: "",
  }
}

export function emptyDriver(): DriverFormState {
  return {
    first_name: "", last_name: "", phone: "", email: "", cdl_number: "", cdl_state: "",
    cdl_expiry: "", medical_card_expiry: "", hire_date: "", pay_type: "per_mile",
    pay_rate: "", pay_loaded_miles_only: true, escrow_weekly: "", insurance_weekly: "",
    status: "active", emergency_contact_name: "", emergency_contact_phone: "",
    notes: "",
  }
}

export function emptyCustomer(): CustomerFormState {
  return {
    name: "", type: "broker", mc_number: "", dot_number: "", billing_email: "",
    billing_address: "", phone: "",
    status_updates_email: "", payment_terms_days: "30", credit_limit: "",
    factored: false, status: "active", notes: "",
  }
}
