"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { driverPortalApi } from '@/lib/api/driver-portal-api'
import type {
  Driver,
  DriverDashboard,
  Load,
  Settlement,
  Document,
  ELDStatus,
  FuelCardBalance,
  Notification,
  Message,
  ComplianceItem,
  DriverStats,
  ApiResponse,
  LoginCredentials,
} from '@/types/driver-portal'

// ===========================================
// AUTHENTICATION HOOK
// ===========================================

export function useAuth() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  
  // Check initial auth state
  useEffect(() => {
    const currentDriver = driverPortalApi.auth.getCurrentDriver()
    const hasToken = driverPortalApi.auth.isAuthenticated()
    
    setDriver(currentDriver)
    setIsAuthenticated(hasToken && !!currentDriver)
    setIsLoading(false)
  }, [])
  
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    const response = await driverPortalApi.auth.login(credentials)
    
    if (response.success && response.data) {
      setDriver(response.data.driver)
      setIsAuthenticated(true)
    }
    
    setIsLoading(false)
    return response
  }, [])
  
  const logout = useCallback(async () => {
    setIsLoading(true)
    await driverPortalApi.auth.logout()
    setDriver(null)
    setIsAuthenticated(false)
    setIsLoading(false)
    router.push('/driver-portal')
  }, [router])
  
  const refreshToken = useCallback(async () => {
    const response = await driverPortalApi.auth.refreshToken()
    if (response.success && response.data) {
      setDriver(response.data.driver)
    } else {
      // Token refresh failed, log out
      await logout()
    }
    return response
  }, [logout])
  
  return {
    driver,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  }
}

// ===========================================
// DASHBOARD HOOK
// ===========================================

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DriverDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const response = await driverPortalApi.driver.getDashboard()
    
    if (response.success && response.data) {
      setDashboard(response.data)
    } else {
      setError(response.error?.message || 'Failed to load dashboard')
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])
  
  return {
    dashboard,
    isLoading,
    error,
    refresh: fetchDashboard,
  }
}

// ===========================================
// LOADS HOOK
// ===========================================

export function useLoads(type: 'available' | 'assigned' | 'history' = 'assigned') {
  const [loads, setLoads] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const fetchLoads = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true)
    setError(null)
    
    let response: ApiResponse<{ items: Load[]; meta: { totalPages?: number } }>
    
    switch (type) {
      case 'available':
        response = await driverPortalApi.loads.getAvailableLoads({ page: pageNum })
        break
      case 'history':
        response = await driverPortalApi.loads.getLoadHistory({ page: pageNum })
        break
      default:
        response = await driverPortalApi.loads.getAssignedLoads({ page: pageNum })
    }
    
    if (response.success && response.data) {
      setLoads(response.data.items)
      setTotalPages(response.data.meta?.totalPages || 1)
      setPage(pageNum)
    } else {
      setError(response.error?.message || 'Failed to load data')
    }
    
    setIsLoading(false)
  }, [type])
  
  useEffect(() => {
    fetchLoads(1)
  }, [fetchLoads])
  
  const acceptLoad = useCallback(async (loadId: string) => {
    const response = await driverPortalApi.loads.acceptLoad(loadId)
    if (response.success) {
      await fetchLoads(page)
    }
    return response
  }, [fetchLoads, page])
  
  const declineLoad = useCallback(async (loadId: string, reason?: string) => {
    const response = await driverPortalApi.loads.declineLoad(loadId, reason)
    if (response.success) {
      await fetchLoads(page)
    }
    return response
  }, [fetchLoads, page])
  
  const updateStatus = useCallback(async (loadId: string, status: string) => {
    const response = await driverPortalApi.loads.updateLoadStatus(loadId, status)
    if (response.success) {
      await fetchLoads(page)
    }
    return response
  }, [fetchLoads, page])
  
  return {
    loads,
    isLoading,
    error,
    page,
    totalPages,
    fetchLoads,
    acceptLoad,
    declineLoad,
    updateStatus,
  }
}

// ===========================================
// SETTLEMENTS HOOK
// ===========================================

export function useSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<Settlement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchSettlements = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const [settlementsRes, currentRes] = await Promise.all([
      driverPortalApi.settlements.getSettlements(),
      driverPortalApi.settlements.getCurrentPayPeriod(),
    ])
    
    if (settlementsRes.success && settlementsRes.data) {
      setSettlements(settlementsRes.data.items)
    }
    
    if (currentRes.success && currentRes.data) {
      setCurrentPeriod(currentRes.data)
    }
    
    if (!settlementsRes.success) {
      setError(settlementsRes.error?.message || 'Failed to load settlements')
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])
  
  const downloadPDF = useCallback(async (settlementId: string) => {
    const blob = await driverPortalApi.settlements.downloadSettlementPDF(settlementId)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `settlement-${settlementId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [])
  
  return {
    settlements,
    currentPeriod,
    isLoading,
    error,
    refresh: fetchSettlements,
    downloadPDF,
  }
}

// ===========================================
// DOCUMENTS HOOK
// ===========================================

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const [docsRes, expiringRes] = await Promise.all([
      driverPortalApi.documents.getDocuments(),
      driverPortalApi.documents.getExpiringDocuments(30),
    ])
    
    if (docsRes.success && docsRes.data) {
      setDocuments(docsRes.data.items)
    }
    
    if (expiringRes.success && expiringRes.data) {
      setExpiringDocs(expiringRes.data)
    }
    
    if (!docsRes.success) {
      setError(docsRes.error?.message || 'Failed to load documents')
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])
  
  const uploadDocument = useCallback(async (
    file: File, 
    metadata: { type: string; name?: string; expirationDate?: string }
  ) => {
    setIsUploading(true)
    const response = await driverPortalApi.documents.uploadDocument(file, metadata)
    setIsUploading(false)
    
    if (response.success) {
      await fetchDocuments()
    }
    
    return response
  }, [fetchDocuments])
  
  const deleteDocument = useCallback(async (documentId: string) => {
    const response = await driverPortalApi.documents.deleteDocument(documentId)
    if (response.success) {
      await fetchDocuments()
    }
    return response
  }, [fetchDocuments])
  
  return {
    documents,
    expiringDocs,
    isLoading,
    isUploading,
    error,
    refresh: fetchDocuments,
    uploadDocument,
    deleteDocument,
  }
}

// ===========================================
// ELD/HOS HOOK
// ===========================================

export function useELD() {
  const [status, setStatus] = useState<ELDStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const response = await driverPortalApi.eld.getCurrentStatus()
    
    if (response.success && response.data) {
      setStatus(response.data)
    } else {
      setError(response.error?.message || 'Failed to load ELD status')
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchStatus()
    // Refresh ELD status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStatus])
  
  const updateDutyStatus = useCallback(async (newStatus: string, notes?: string) => {
    const response = await driverPortalApi.eld.updateDutyStatus(newStatus, notes)
    if (response.success && response.data) {
      setStatus(response.data)
    }
    return response
  }, [])
  
  // Format time remaining
  const formattedDriveTime = useMemo(() => {
    if (!status) return '0:00'
    const hours = Math.floor(status.driveTimeRemaining / 60)
    const minutes = status.driveTimeRemaining % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }, [status])
  
  const formattedShiftTime = useMemo(() => {
    if (!status) return '0:00'
    const hours = Math.floor(status.shiftTimeRemaining / 60)
    const minutes = status.shiftTimeRemaining % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }, [status])
  
  return {
    status,
    isLoading,
    error,
    refresh: fetchStatus,
    updateDutyStatus,
    formattedDriveTime,
    formattedShiftTime,
  }
}

// ===========================================
// FUEL HOOK
// ===========================================

export function useFuel() {
  const [balance, setBalance] = useState<FuelCardBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchBalance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const response = await driverPortalApi.fuel.getCardBalance()
    
    if (response.success && response.data) {
      setBalance(response.data)
    } else {
      setError(response.error?.message || 'Failed to load fuel card balance')
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])
  
  const requestAdvance = useCallback(async (amount: number, loadId?: string) => {
    return driverPortalApi.fuel.requestFuelAdvance(amount, loadId)
  }, [])
  
  return {
    balance,
    isLoading,
    error,
    refresh: fetchBalance,
    requestAdvance,
  }
}

// ===========================================
// NOTIFICATIONS HOOK
// ===========================================

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    
    const [notificationsRes, countsRes] = await Promise.all([
      driverPortalApi.messaging.getNotifications(),
      driverPortalApi.messaging.getUnreadCounts(),
    ])
    
    if (notificationsRes.success && notificationsRes.data) {
      setNotifications(notificationsRes.data.items)
    }
    
    if (countsRes.success && countsRes.data) {
      setUnreadCount(countsRes.data.notifications)
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])
  
  const markAsRead = useCallback(async (notificationId: string) => {
    await driverPortalApi.messaging.markNotificationAsRead(notificationId)
    await fetchNotifications()
  }, [fetchNotifications])
  
  const markAllAsRead = useCallback(async () => {
    await driverPortalApi.messaging.markAllNotificationsAsRead()
    await fetchNotifications()
  }, [fetchNotifications])
  
  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}

// ===========================================
// COMPLIANCE HOOK
// ===========================================

export function useCompliance() {
  const [items, setItems] = useState<ComplianceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchCompliance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const response = await driverPortalApi.driver.getComplianceStatus()
    
    if (response.success && response.data) {
      setItems(response.data)
    } else {
      setError(response.error?.message || 'Failed to load compliance status')
    }
    
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    fetchCompliance()
  }, [fetchCompliance])
  
  const criticalItems = useMemo(() => 
    items.filter(i => i.status === 'expired' || i.status === 'missing'),
    [items]
  )
  
  const warningItems = useMemo(() => 
    items.filter(i => i.status === 'expiring_soon'),
    [items]
  )
  
  const compliantItems = useMemo(() => 
    items.filter(i => i.status === 'compliant'),
    [items]
  )
  
  return {
    items,
    criticalItems,
    warningItems,
    compliantItems,
    isLoading,
    error,
    refresh: fetchCompliance,
  }
}

// ===========================================
// DRIVER STATS HOOK
// ===========================================

export function useDriverStats(startDate?: string, endDate?: string) {
  const [stats, setStats] = useState<DriverStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    const response = await driverPortalApi.driver.getStats(startDate, endDate)
    
    if (response.success && response.data) {
      setStats(response.data)
    } else {
      setError(response.error?.message || 'Failed to load statistics')
    }
    
    setIsLoading(false)
  }, [startDate, endDate])
  
  useEffect(() => {
    fetchStats()
  }, [fetchStats])
  
  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  }
}











