/**
 * Driver Portal API Service
 * 
 * This service layer is designed to integrate with popular trucking software APIs.
 * Configure the API_PROVIDER and API_BASE_URL in your environment variables.
 * 
 * Supported Integrations:
 * - Samsara: Fleet management, ELD, GPS tracking
 * - Motive (KeepTruckin): ELD, dispatch, compliance
 * - Fleet Complete: GPS, ELD, driver management
 * - McLeod: TMS, dispatch, settlements
 * - TMW: TMS, dispatch, accounting
 * - TruckingOffice: Small fleet TMS
 * - Custom API: Your own backend implementation
 * 
 * Setup Instructions:
 * 1. Set environment variables in .env.local:
 *    NEXT_PUBLIC_TRUCKING_API_URL=your-api-url
 *    TRUCKING_API_KEY=your-api-key
 *    TRUCKING_API_PROVIDER=samsara|motive|custom
 * 
 * 2. For OAuth-based providers, also set:
 *    TRUCKING_OAUTH_CLIENT_ID=your-client-id
 *    TRUCKING_OAUTH_CLIENT_SECRET=your-client-secret
 */

import type {
  Driver,
  DriverAuth,
  LoginCredentials,
  Load,
  LoadSearchParams,
  Settlement,
  SettlementSearchParams,
  Document,
  DocumentSearchParams,
  ELDStatus,
  DailyLog,
  FuelTransaction,
  FuelCardBalance,
  Truck,
  Trailer,
  Message,
  Notification,
  DriverDashboard,
  DriverStats,
  ApiResponse,
  PaginatedResponse,
  ComplianceItem,
} from '@/types/driver-portal'

// ===========================================
// CONFIGURATION
// ===========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_TRUCKING_API_URL || '/api/driver-portal'
const API_PROVIDER = process.env.NEXT_PUBLIC_TRUCKING_API_PROVIDER || 'custom'

// Storage keys for authentication
const AUTH_TOKEN_KEY = 'driver_portal_token'
const REFRESH_TOKEN_KEY = 'driver_portal_refresh'
const DRIVER_DATA_KEY = 'driver_portal_user'

// ===========================================
// HTTP CLIENT
// ===========================================

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
  requiresAuth?: boolean
}

class ApiClient {
  private baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_TOKEN_KEY)
  }
  
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }
    return url.toString()
  }
  
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, params, requiresAuth = true } = config
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }
    
    if (requiresAuth) {
      const token = this.getAuthToken()
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`
      }
    }
    
    try {
      const response = await fetch(this.buildUrl(endpoint, params), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || `HTTP_${response.status}`,
            message: data.message || response.statusText,
            details: data.details,
          },
        }
      }
      
      return {
        success: true,
        data: data.data ?? data,
        meta: data.meta,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      }
    }
  }
  
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params })
  }
  
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body })
  }
  
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body })
  }
  
  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }
  
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

const apiClient = new ApiClient(API_BASE_URL)

// ===========================================
// AUTHENTICATION SERVICE
// ===========================================

export const authService = {
  /**
   * Login with driver credentials
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<DriverAuth>> {
    const response = await apiClient.post<DriverAuth>('/auth/login', credentials)
    
    if (response.success && response.data) {
      // Store tokens
      localStorage.setItem(AUTH_TOKEN_KEY, response.data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken)
      localStorage.setItem(DRIVER_DATA_KEY, JSON.stringify(response.data.driver))
    }
    
    return response
  },
  
  /**
   * Logout and clear stored credentials
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(DRIVER_DATA_KEY)
    }
  },
  
  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<DriverAuth>> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      return {
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token available' },
      }
    }
    
    const response = await apiClient.post<DriverAuth>('/auth/refresh', { refreshToken })
    
    if (response.success && response.data) {
      localStorage.setItem(AUTH_TOKEN_KEY, response.data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken)
      localStorage.setItem(DRIVER_DATA_KEY, JSON.stringify(response.data.driver))
    }
    
    return response
  },
  
  /**
   * Get current authentication state
   */
  getCurrentDriver(): Driver | null {
    if (typeof window === 'undefined') return null
    const driverData = localStorage.getItem(DRIVER_DATA_KEY)
    return driverData ? JSON.parse(driverData) : null
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY)
  },
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/auth/forgot-password', { email })
  },
  
  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/auth/reset-password', { token, newPassword })
  },
  
  /**
   * Change password (when logged in)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/auth/change-password', { currentPassword, newPassword })
  },
}

// ===========================================
// DRIVER SERVICE
// ===========================================

export const driverService = {
  /**
   * Get current driver profile
   */
  async getProfile(): Promise<ApiResponse<Driver>> {
    return apiClient.get<Driver>('/driver/profile')
  },
  
  /**
   * Update driver profile
   */
  async updateProfile(data: Partial<Driver>): Promise<ApiResponse<Driver>> {
    return apiClient.patch<Driver>('/driver/profile', data)
  },
  
  /**
   * Get driver dashboard data
   */
  async getDashboard(): Promise<ApiResponse<DriverDashboard>> {
    return apiClient.get<DriverDashboard>('/driver/dashboard')
  },
  
  /**
   * Get driver statistics
   */
  async getStats(startDate?: string, endDate?: string): Promise<ApiResponse<DriverStats>> {
    return apiClient.get<DriverStats>('/driver/stats', { startDate, endDate })
  },
  
  /**
   * Get compliance status
   */
  async getComplianceStatus(): Promise<ApiResponse<ComplianceItem[]>> {
    return apiClient.get<ComplianceItem[]>('/driver/compliance')
  },
  
  /**
   * Update profile photo
   */
  async updateProfilePhoto(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData()
    formData.append('photo', file)
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const response = await fetch(`${API_BASE_URL}/driver/profile/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await response.json()
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? { code: 'UPLOAD_ERROR', message: data.message } : undefined,
    }
  },
}

// ===========================================
// LOADS SERVICE
// ===========================================

export const loadsService = {
  /**
   * Get available loads
   */
  async getAvailableLoads(params?: LoadSearchParams): Promise<ApiResponse<PaginatedResponse<Load>>> {
    return apiClient.get<PaginatedResponse<Load>>('/loads/available', params as Record<string, string | number | boolean | undefined>)
  },
  
  /**
   * Get assigned loads
   */
  async getAssignedLoads(params?: LoadSearchParams): Promise<ApiResponse<PaginatedResponse<Load>>> {
    return apiClient.get<PaginatedResponse<Load>>('/loads/assigned', params as Record<string, string | number | boolean | undefined>)
  },
  
  /**
   * Get load history
   */
  async getLoadHistory(params?: LoadSearchParams): Promise<ApiResponse<PaginatedResponse<Load>>> {
    return apiClient.get<PaginatedResponse<Load>>('/loads/history', params as Record<string, string | number | boolean | undefined>)
  },
  
  /**
   * Get load details
   */
  async getLoad(loadId: string): Promise<ApiResponse<Load>> {
    return apiClient.get<Load>(`/loads/${loadId}`)
  },
  
  /**
   * Accept an offered load
   */
  async acceptLoad(loadId: string): Promise<ApiResponse<Load>> {
    return apiClient.post<Load>(`/loads/${loadId}/accept`)
  },
  
  /**
   * Decline an offered load
   */
  async declineLoad(loadId: string, reason?: string): Promise<ApiResponse<Load>> {
    return apiClient.post<Load>(`/loads/${loadId}/decline`, { reason })
  },
  
  /**
   * Update load status
   */
  async updateLoadStatus(loadId: string, status: string, location?: { latitude: number; longitude: number }): Promise<ApiResponse<Load>> {
    return apiClient.patch<Load>(`/loads/${loadId}/status`, { status, location })
  },
  
  /**
   * Upload POD (Proof of Delivery)
   */
  async uploadPOD(loadId: string, file: File): Promise<ApiResponse<{ documentId: string; url: string }>> {
    const formData = new FormData()
    formData.append('pod', file)
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const response = await fetch(`${API_BASE_URL}/loads/${loadId}/pod`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await response.json()
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? { code: 'UPLOAD_ERROR', message: data.message } : undefined,
    }
  },
  
  /**
   * Upload BOL (Bill of Lading)
   */
  async uploadBOL(loadId: string, file: File): Promise<ApiResponse<{ documentId: string; url: string }>> {
    const formData = new FormData()
    formData.append('bol', file)
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const response = await fetch(`${API_BASE_URL}/loads/${loadId}/bol`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await response.json()
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? { code: 'UPLOAD_ERROR', message: data.message } : undefined,
    }
  },
  
  /**
   * Report issue with load
   */
  async reportIssue(loadId: string, issue: { type: string; description: string; photos?: File[] }): Promise<ApiResponse<{ ticketId: string }>> {
    return apiClient.post(`/loads/${loadId}/issues`, issue)
  },
}

// ===========================================
// SETTLEMENTS SERVICE
// ===========================================

export const settlementsService = {
  /**
   * Get settlements list
   */
  async getSettlements(params?: SettlementSearchParams): Promise<ApiResponse<PaginatedResponse<Settlement>>> {
    return apiClient.get<PaginatedResponse<Settlement>>('/settlements', params as Record<string, string | number | boolean | undefined>)
  },
  
  /**
   * Get settlement details
   */
  async getSettlement(settlementId: string): Promise<ApiResponse<Settlement>> {
    return apiClient.get<Settlement>(`/settlements/${settlementId}`)
  },
  
  /**
   * Get current pay period summary
   */
  async getCurrentPayPeriod(): Promise<ApiResponse<Settlement>> {
    return apiClient.get<Settlement>('/settlements/current')
  },
  
  /**
   * Download settlement PDF
   */
  async downloadSettlementPDF(settlementId: string): Promise<Blob | null> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    try {
      const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) return null
      return response.blob()
    } catch {
      return null
    }
  },
  
  /**
   * Dispute a settlement item
   */
  async disputeSettlement(settlementId: string, dispute: { items: string[]; reason: string }): Promise<ApiResponse<{ ticketId: string }>> {
    return apiClient.post(`/settlements/${settlementId}/dispute`, dispute)
  },
  
  /**
   * Get YTD earnings summary
   */
  async getYTDSummary(): Promise<ApiResponse<{
    grossEarnings: number
    netEarnings: number
    totalMiles: number
    totalLoads: number
    avgRatePerMile: number
  }>> {
    return apiClient.get('/settlements/ytd')
  },
}

// ===========================================
// DOCUMENTS SERVICE
// ===========================================

export const documentsService = {
  /**
   * Get all documents
   */
  async getDocuments(params?: DocumentSearchParams): Promise<ApiResponse<PaginatedResponse<Document>>> {
    return apiClient.get<PaginatedResponse<Document>>('/documents', params as Record<string, string | number | boolean | undefined>)
  },
  
  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<ApiResponse<Document>> {
    return apiClient.get<Document>(`/documents/${documentId}`)
  },
  
  /**
   * Upload a document
   */
  async uploadDocument(file: File, metadata: {
    type: string
    name?: string
    expirationDate?: string
    notes?: string
  }): Promise<ApiResponse<Document>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await response.json()
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? { code: 'UPLOAD_ERROR', message: data.message } : undefined,
    }
  },
  
  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/documents/${documentId}`)
  },
  
  /**
   * Download a document
   */
  async downloadDocument(documentId: string): Promise<Blob | null> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) return null
      return response.blob()
    } catch {
      return null
    }
  },
  
  /**
   * Get expiring documents
   */
  async getExpiringDocuments(withinDays: number = 30): Promise<ApiResponse<Document[]>> {
    return apiClient.get<Document[]>('/documents/expiring', { withinDays })
  },
}

// ===========================================
// ELD / HOS SERVICE
// ===========================================

export const eldService = {
  /**
   * Get current ELD status
   */
  async getCurrentStatus(): Promise<ApiResponse<ELDStatus>> {
    return apiClient.get<ELDStatus>('/eld/status')
  },
  
  /**
   * Update duty status
   */
  async updateDutyStatus(status: string, notes?: string): Promise<ApiResponse<ELDStatus>> {
    return apiClient.post<ELDStatus>('/eld/status', { status, notes })
  },
  
  /**
   * Get daily logs
   */
  async getDailyLogs(startDate: string, endDate: string): Promise<ApiResponse<DailyLog[]>> {
    return apiClient.get<DailyLog[]>('/eld/logs', { startDate, endDate })
  },
  
  /**
   * Get specific daily log
   */
  async getDailyLog(date: string): Promise<ApiResponse<DailyLog>> {
    return apiClient.get<DailyLog>(`/eld/logs/${date}`)
  },
  
  /**
   * Certify a daily log
   */
  async certifyLog(date: string): Promise<ApiResponse<DailyLog>> {
    return apiClient.post<DailyLog>(`/eld/logs/${date}/certify`)
  },
  
  /**
   * Request log edit
   */
  async requestLogEdit(date: string, edit: {
    entryId: string
    newStatus: string
    newStartTime: string
    newEndTime: string
    reason: string
  }): Promise<ApiResponse<{ editRequestId: string }>> {
    return apiClient.post(`/eld/logs/${date}/edit-request`, edit)
  },
  
  /**
   * Get HOS violations
   */
  async getViolations(startDate?: string, endDate?: string): Promise<ApiResponse<{
    id: string
    type: string
    description: string
    occurredAt: string
    severity: string
  }[]>> {
    return apiClient.get('/eld/violations', { startDate, endDate })
  },
}

// ===========================================
// FUEL SERVICE
// ===========================================

export const fuelService = {
  /**
   * Get fuel card balance
   */
  async getCardBalance(): Promise<ApiResponse<FuelCardBalance>> {
    return apiClient.get<FuelCardBalance>('/fuel/balance')
  },
  
  /**
   * Get fuel transactions
   */
  async getTransactions(startDate?: string, endDate?: string, page?: number, pageSize?: number): Promise<ApiResponse<PaginatedResponse<FuelTransaction>>> {
    return apiClient.get<PaginatedResponse<FuelTransaction>>('/fuel/transactions', { startDate, endDate, page, pageSize })
  },
  
  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<ApiResponse<FuelTransaction>> {
    return apiClient.get<FuelTransaction>(`/fuel/transactions/${transactionId}`)
  },
  
  /**
   * Request fuel advance
   */
  async requestFuelAdvance(amount: number, loadId?: string): Promise<ApiResponse<{
    advanceId: string
    amount: number
    status: string
  }>> {
    return apiClient.post('/fuel/advance', { amount, loadId })
  },
  
  /**
   * Find nearby fuel stops
   */
  async findNearbyFuelStops(latitude: number, longitude: number, radiusMiles?: number): Promise<ApiResponse<{
    id: string
    name: string
    brand: string
    address: string
    distance: number
    dieselPrice?: number
    defPrice?: number
    amenities: string[]
    networkDiscount?: boolean
  }[]>> {
    return apiClient.get('/fuel/nearby', { latitude, longitude, radiusMiles })
  },
}

// ===========================================
// EQUIPMENT SERVICE
// ===========================================

export const equipmentService = {
  /**
   * Get assigned truck
   */
  async getAssignedTruck(): Promise<ApiResponse<Truck | null>> {
    return apiClient.get<Truck | null>('/equipment/truck')
  },
  
  /**
   * Get assigned trailer
   */
  async getAssignedTrailer(): Promise<ApiResponse<Trailer | null>> {
    return apiClient.get<Trailer | null>('/equipment/trailer')
  },
  
  /**
   * Report equipment issue
   */
  async reportIssue(equipment: 'truck' | 'trailer', issue: {
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    photos?: string[]
  }): Promise<ApiResponse<{ ticketId: string }>> {
    return apiClient.post(`/equipment/${equipment}/issues`, issue)
  },
  
  /**
   * Update odometer
   */
  async updateOdometer(reading: number): Promise<ApiResponse<void>> {
    return apiClient.post('/equipment/truck/odometer', { reading })
  },
  
  /**
   * Get DVIR history
   */
  async getDVIRHistory(startDate?: string, endDate?: string): Promise<ApiResponse<{
    id: string
    date: string
    type: 'pre_trip' | 'post_trip'
    defects: string[]
    certified: boolean
  }[]>> {
    return apiClient.get('/equipment/dvir', { startDate, endDate })
  },
  
  /**
   * Submit DVIR
   */
  async submitDVIR(dvir: {
    type: 'pre_trip' | 'post_trip'
    truckDefects: { item: string; description: string }[]
    trailerDefects: { item: string; description: string }[]
    odometer: number
    location: { latitude: number; longitude: number }
  }): Promise<ApiResponse<{ dvirId: string }>> {
    return apiClient.post('/equipment/dvir', dvir)
  },
}

// ===========================================
// MESSAGING SERVICE
// ===========================================

export const messagingService = {
  /**
   * Get messages
   */
  async getMessages(page?: number, pageSize?: number): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return apiClient.get<PaginatedResponse<Message>>('/messages', { page, pageSize })
  },
  
  /**
   * Get message thread
   */
  async getThread(threadId: string): Promise<ApiResponse<Message[]>> {
    return apiClient.get<Message[]>(`/messages/threads/${threadId}`)
  },
  
  /**
   * Send message
   */
  async sendMessage(message: {
    recipientId?: string
    subject?: string
    body: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    attachments?: File[]
  }): Promise<ApiResponse<Message>> {
    return apiClient.post<Message>('/messages', message)
  },
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<ApiResponse<void>> {
    return apiClient.patch(`/messages/${messageId}/read`)
  },
  
  /**
   * Get notifications
   */
  async getNotifications(page?: number, pageSize?: number): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    return apiClient.get<PaginatedResponse<Notification>>('/notifications', { page, pageSize })
  },
  
  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.patch(`/notifications/${notificationId}/read`)
  },
  
  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return apiClient.post('/notifications/read-all')
  },
  
  /**
   * Get unread counts
   */
  async getUnreadCounts(): Promise<ApiResponse<{ messages: number; notifications: number }>> {
    return apiClient.get('/messages/unread-count')
  },
}

// ===========================================
// SCHEDULE SERVICE
// ===========================================

export const scheduleService = {
  /**
   * Request time off
   */
  async requestTimeOff(request: {
    startDate: string
    endDate: string
    reason: string
    type: 'vacation' | 'personal' | 'medical' | 'home_time'
  }): Promise<ApiResponse<{
    requestId: string
    status: 'pending' | 'approved' | 'denied'
  }>> {
    return apiClient.post('/schedule/time-off', request)
  },
  
  /**
   * Get time off requests
   */
  async getTimeOffRequests(): Promise<ApiResponse<{
    id: string
    startDate: string
    endDate: string
    reason: string
    type: string
    status: string
    submittedAt: string
    reviewedAt?: string
    reviewedBy?: string
  }[]>> {
    return apiClient.get('/schedule/time-off')
  },
  
  /**
   * Cancel time off request
   */
  async cancelTimeOffRequest(requestId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/schedule/time-off/${requestId}`)
  },
  
  /**
   * Update home terminal preference
   */
  async updateHomeTerminal(terminalId: string): Promise<ApiResponse<void>> {
    return apiClient.patch('/schedule/home-terminal', { terminalId })
  },
}

// ===========================================
// EXPORT ALL SERVICES
// ===========================================

export const driverPortalApi = {
  auth: authService,
  driver: driverService,
  loads: loadsService,
  settlements: settlementsService,
  documents: documentsService,
  eld: eldService,
  fuel: fuelService,
  equipment: equipmentService,
  messaging: messagingService,
  schedule: scheduleService,
}

export default driverPortalApi











