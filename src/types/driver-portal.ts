// Driver Portal Types - Ready for Trucking Software API Integration
// Compatible with: Samsara, Motive (KeepTruckin), Fleet Complete, McLeod, TMW

// ============================================
// DRIVER & AUTHENTICATION
// ============================================

export interface Driver {
  id: string
  driverId: string // Company-assigned ID
  firstName: string
  lastName: string
  email: string
  phone: string
  profileImage?: string
  status: DriverStatus
  hireDate: string
  homeTerminal: string
  dispatcherId?: string
  truckId?: string
  trailerId?: string
  cdlNumber: string
  cdlState: string
  cdlExpiration: string
  medicalCardExpiration: string
  drugTestDate?: string
  safetyScore?: number
  createdAt: string
  updatedAt: string
}

export type DriverStatus = 
  | 'active' 
  | 'inactive' 
  | 'on_leave' 
  | 'terminated' 
  | 'pending_approval'

export interface DriverAuth {
  driver: Driver
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface LoginCredentials {
  driverIdOrEmail: string
  password: string
  rememberMe?: boolean
}

// ============================================
// LOADS & DISPATCHING
// ============================================

export interface Load {
  id: string
  loadNumber: string
  status: LoadStatus
  driver?: Driver
  driverId?: string
  truckId?: string
  trailerId?: string
  
  // Origin
  pickupLocation: Location
  pickupDate: string
  pickupTime?: string
  pickupInstructions?: string
  
  // Destination
  deliveryLocation: Location
  deliveryDate: string
  deliveryTime?: string
  deliveryInstructions?: string
  
  // Additional stops
  stops?: LoadStop[]
  
  // Load details
  weight: number // in lbs
  commodity: string
  pieces?: number
  pallets?: number
  temperature?: number // for reefer loads
  hazmat?: boolean
  hazmatClass?: string
  
  // Financials
  rate: number
  rateType: 'flat' | 'per_mile'
  miles: number
  estimatedPay: number
  fuelSurcharge?: number
  accessorials?: Accessorial[]
  
  // Broker/Customer
  customerName: string
  customerContact?: string
  customerPhone?: string
  brokerName?: string
  brokerMC?: string
  referenceNumber?: string
  poNumber?: string
  
  // Timestamps
  dispatchedAt?: string
  pickedUpAt?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
}

export type LoadStatus = 
  | 'available'
  | 'offered'
  | 'accepted'
  | 'dispatched'
  | 'en_route_pickup'
  | 'at_pickup'
  | 'loaded'
  | 'en_route_delivery'
  | 'at_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'tonu' // Truck Ordered Not Used

export interface LoadStop {
  id: string
  sequence: number
  type: 'pickup' | 'delivery' | 'stop'
  location: Location
  scheduledDate: string
  scheduledTime?: string
  actualArrival?: string
  actualDeparture?: string
  instructions?: string
  contactName?: string
  contactPhone?: string
}

export interface Location {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  country?: string
  latitude?: number
  longitude?: number
}

export interface Accessorial {
  type: string
  description: string
  amount: number
}

// ============================================
// SETTLEMENTS & EARNINGS
// ============================================

export interface Settlement {
  id: string
  settlementNumber: string
  driverId: string
  periodStart: string
  periodEnd: string
  status: SettlementStatus
  
  // Earnings breakdown
  grossPay: number
  lineHaulPay: number
  accessorialPay: number
  bonuses: number
  reimbursements: number
  
  // Deductions
  deductions: Deduction[]
  totalDeductions: number
  
  // Net
  netPay: number
  
  // Payment info
  paymentDate?: string
  paymentMethod?: 'direct_deposit' | 'check' | 'fuel_card'
  checkNumber?: string
  
  // Loads included
  loads: SettlementLoad[]
  totalMiles: number
  totalLoads: number
  
  // Documents
  settlementPdfUrl?: string
  
  createdAt: string
}

export type SettlementStatus = 
  | 'pending'
  | 'processing'
  | 'approved'
  | 'paid'
  | 'disputed'

export interface SettlementLoad {
  loadId: string
  loadNumber: string
  pickupCity: string
  deliveryCity: string
  miles: number
  pay: number
  deliveredDate: string
}

export interface Deduction {
  type: DeductionType
  description: string
  amount: number
  recurring?: boolean
}

export type DeductionType = 
  | 'insurance'
  | 'escrow'
  | 'fuel_advance'
  | 'cash_advance'
  | 'equipment_lease'
  | 'trailer_rental'
  | 'cargo_insurance'
  | 'occupational_accident'
  | 'eld_fee'
  | 'dispatch_fee'
  | 'toll'
  | 'scale'
  | 'lumper'
  | 'detention'
  | 'fine'
  | 'other'

// ============================================
// DOCUMENTS & COMPLIANCE
// ============================================

export interface Document {
  id: string
  driverId: string
  type: DocumentType
  name: string
  description?: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize: number
  status: DocumentStatus
  expirationDate?: string
  isExpiringSoon?: boolean // within 30 days
  isExpired?: boolean
  uploadedAt: string
  verifiedAt?: string
  verifiedBy?: string
  notes?: string
}

export type DocumentType = 
  | 'cdl'
  | 'cdl_front'
  | 'cdl_back'
  | 'medical_card'
  | 'mvr' // Motor Vehicle Record
  | 'insurance'
  | 'vehicle_registration'
  | 'annual_inspection'
  | 'drug_test'
  | 'background_check'
  | 'w9'
  | 'contract'
  | 'rate_confirmation'
  | 'bol' // Bill of Lading
  | 'pod' // Proof of Delivery
  | 'lumper_receipt'
  | 'fuel_receipt'
  | 'toll_receipt'
  | 'accident_report'
  | 'inspection_report'
  | 'other'

export type DocumentStatus = 
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired'

export interface ComplianceItem {
  id: string
  type: string
  name: string
  status: 'compliant' | 'expiring_soon' | 'expired' | 'missing'
  expirationDate?: string
  daysUntilExpiration?: number
  documentId?: string
  requiredAction?: string
}

// ============================================
// ELD & HOS (Hours of Service)
// ============================================

export interface ELDStatus {
  driverId: string
  currentStatus: DutyStatus
  statusSince: string
  location: Location
  
  // Current cycle
  cycleType: '70_8' | '60_7'
  hoursAvailable: number
  hoursUsedToday: number
  
  // Break tracking
  driveTimeRemaining: number // in minutes
  shiftTimeRemaining: number // in minutes
  breakRequired: boolean
  breakTimeRemaining?: number
  
  // Violations
  violations: HOSViolation[]
  
  lastUpdated: string
}

export type DutyStatus = 
  | 'off_duty'
  | 'sleeper_berth'
  | 'driving'
  | 'on_duty_not_driving'
  | 'personal_conveyance'
  | 'yard_move'

export interface HOSViolation {
  id: string
  type: string
  description: string
  severity: 'warning' | 'violation'
  occurredAt: string
  resolved: boolean
  resolvedAt?: string
}

export interface DailyLog {
  id: string
  driverId: string
  date: string
  entries: LogEntry[]
  totalDriving: number // minutes
  totalOnDuty: number
  totalOffDuty: number
  totalSleeper: number
  startOdometer?: number
  endOdometer?: number
  startLocation?: Location
  endLocation?: Location
  certified: boolean
  certifiedAt?: string
  edits?: LogEdit[]
}

export interface LogEntry {
  id: string
  status: DutyStatus
  startTime: string
  endTime?: string
  duration: number // minutes
  location: Location
  notes?: string
  edited: boolean
}

export interface LogEdit {
  id: string
  originalEntry: LogEntry
  newEntry: LogEntry
  reason: string
  editedAt: string
  editedBy: string
}

// ============================================
// FUEL & EXPENSES
// ============================================

export interface FuelTransaction {
  id: string
  driverId: string
  truckId?: string
  cardNumber: string
  cardType: 'comdata' | 'efs' | 'tcs' | 'wex' | 'fleet_one' | 'other'
  
  // Transaction details
  transactionDate: string
  merchantName: string
  merchantCity: string
  merchantState: string
  
  // Fuel details
  fuelType: 'diesel' | 'def' | 'reefer_fuel'
  gallons: number
  pricePerGallon: number
  fuelTotal: number
  
  // Other purchases
  otherItems?: FuelOtherItem[]
  otherTotal: number
  
  // Totals
  totalAmount: number
  discountAmount?: number
  
  // Odometer
  odometer?: number
  mpg?: number
  
  receiptUrl?: string
}

export interface FuelOtherItem {
  description: string
  amount: number
  category: 'scale' | 'shower' | 'parking' | 'repair' | 'merchandise' | 'other'
}

export interface FuelCardBalance {
  cardNumber: string
  availableBalance: number
  creditLimit: number
  lastUpdated: string
}

// ============================================
// EQUIPMENT
// ============================================

export interface Truck {
  id: string
  unitNumber: string
  vin: string
  year: number
  make: string
  model: string
  licensePlate: string
  licensePlateState: string
  status: EquipmentStatus
  currentDriverId?: string
  
  // Specs
  engineType?: string
  transmission?: string
  sleeperSize?: string
  fuelCapacity?: number
  
  // Maintenance
  lastServiceDate?: string
  nextServiceDue?: string
  currentOdometer?: number
  
  // Insurance/Registration
  registrationExpiration: string
  annualInspectionExpiration: string
  insuranceExpiration: string
  
  // Location
  lastKnownLocation?: Location
  lastLocationUpdate?: string
}

export interface Trailer {
  id: string
  unitNumber: string
  vin: string
  year: number
  make?: string
  type: TrailerType
  licensePlate: string
  licensePlateState: string
  status: EquipmentStatus
  currentDriverId?: string
  
  // Specs
  length: number // feet
  capacity?: number // lbs
  
  // Reefer specific
  reeferUnit?: string
  reeferHours?: number
  
  // Maintenance
  lastServiceDate?: string
  nextServiceDue?: string
  
  // Insurance/Registration
  registrationExpiration: string
  annualInspectionExpiration: string
  
  // Location
  lastKnownLocation?: Location
  lastLocationUpdate?: string
}

export type TrailerType = 
  | 'dry_van'
  | 'reefer'
  | 'flatbed'
  | 'step_deck'
  | 'lowboy'
  | 'tanker'
  | 'container'
  | 'other'

export type EquipmentStatus = 
  | 'available'
  | 'in_use'
  | 'maintenance'
  | 'out_of_service'
  | 'retired'

// ============================================
// MESSAGES & NOTIFICATIONS
// ============================================

export interface Message {
  id: string
  threadId?: string
  senderId: string
  senderName: string
  senderType: 'driver' | 'dispatcher' | 'safety' | 'system'
  recipientId: string
  subject?: string
  body: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read: boolean
  readAt?: string
  attachments?: MessageAttachment[]
  relatedLoadId?: string
  createdAt: string
}

export interface MessageAttachment {
  id: string
  name: string
  url: string
  mimeType: string
  fileSize: number
}

export interface Notification {
  id: string
  driverId: string
  type: NotificationType
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read: boolean
  actionUrl?: string
  actionLabel?: string
  relatedEntityType?: 'load' | 'settlement' | 'document' | 'message'
  relatedEntityId?: string
  createdAt: string
  expiresAt?: string
}

export type NotificationType = 
  | 'load_assigned'
  | 'load_update'
  | 'settlement_ready'
  | 'document_expiring'
  | 'document_approved'
  | 'document_rejected'
  | 'message_received'
  | 'compliance_alert'
  | 'system_announcement'
  | 'safety_alert'
  | 'bonus_earned'

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

export interface DriverDashboard {
  driver: Driver
  currentLoad?: Load
  upcomingLoads: Load[]
  recentSettlements: Settlement[]
  complianceAlerts: ComplianceItem[]
  unreadMessages: number
  unreadNotifications: number
  eldStatus?: ELDStatus
  fuelCardBalance?: FuelCardBalance
  stats: DriverStats
}

export interface DriverStats {
  periodStart: string
  periodEnd: string
  
  // Miles
  totalMiles: number
  loadedMiles: number
  emptyMiles: number
  emptyMilesPercent: number
  
  // Earnings
  grossEarnings: number
  netEarnings: number
  avgRevenuePerMile: number
  
  // Loads
  loadsCompleted: number
  onTimeDeliveryRate: number
  
  // Fuel
  totalFuelSpent: number
  avgMpg: number
  totalGallons: number
  
  // Safety
  safetyScore?: number
  hardBrakes?: number
  rapidAccel?: number
  speeding?: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export interface ApiMeta {
  page?: number
  pageSize?: number
  totalCount?: number
  totalPages?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: ApiMeta
}

// ============================================
// SEARCH & FILTER TYPES
// ============================================

export interface LoadSearchParams {
  status?: LoadStatus | LoadStatus[]
  startDate?: string
  endDate?: string
  originState?: string
  destinationState?: string
  minMiles?: number
  maxMiles?: number
  minRate?: number
  hazmat?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'pickupDate' | 'rate' | 'miles' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface SettlementSearchParams {
  status?: SettlementStatus | SettlementStatus[]
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface DocumentSearchParams {
  type?: DocumentType | DocumentType[]
  status?: DocumentStatus | DocumentStatus[]
  expiringWithinDays?: number
  page?: number
  pageSize?: number
}











