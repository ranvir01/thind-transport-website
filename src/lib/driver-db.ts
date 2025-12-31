/**
 * Driver Account & Application Database Functions
 * In production, replace with actual database (Prisma, MongoDB, etc.)
 */

import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const DRIVERS_FILE = path.join(DATA_DIR, "drivers.json")
const APPLICATIONS_FILE = path.join(DATA_DIR, "applications.json")

interface Driver {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string
  invitationCode: string
  createdAt: Date
  applicationCompleted: boolean
}

interface Application {
  id: string
  driverId: string
  data: any
  submittedAt: Date
  pdfPath?: string
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Read drivers from file (with fallback to env for production)
async function readDrivers(): Promise<Driver[]> {
  // For production on Vercel, use environment variable fallback
  if (process.env.DRIVER_ACCOUNTS) {
    try {
      return JSON.parse(process.env.DRIVER_ACCOUNTS)
    } catch (error) {
      console.error("Failed to parse DRIVER_ACCOUNTS env var:", error)
    }
  }
  
  // Local development - use file system
  await ensureDataDir()
  try {
    const data = await fs.readFile(DRIVERS_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// Write drivers to file (skip on Vercel production)
async function writeDrivers(drivers: Driver[]) {
  // On Vercel, filesystem is read-only, so skip write
  if (process.env.VERCEL) {
    console.warn("Skipping driver write on Vercel - filesystem is read-only")
    return
  }
  
  await ensureDataDir()
  await fs.writeFile(DRIVERS_FILE, JSON.stringify(drivers, null, 2))
}

// Read applications from file
async function readApplications(): Promise<Application[]> {
  await ensureDataDir()
  try {
    const data = await fs.readFile(APPLICATIONS_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// Write applications to file
async function writeApplications(applications: Application[]) {
  await ensureDataDir()
  await fs.writeFile(APPLICATIONS_FILE, JSON.stringify(applications, null, 2))
}

// Verify invitation code
export async function verifyInvitationCode(code: string): Promise<boolean> {
  // Fixed invitation code for all drivers
  return code === "THIND-2026"
}

// Create driver account
export async function createDriver(driverData: {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string
  invitationCode: string
}): Promise<Driver> {
  const drivers = await readDrivers()

  // Check if email already exists
  if (drivers.some((d) => d.email === driverData.email)) {
    throw new Error("Email already registered")
  }

  const newDriver: Driver = {
    id: `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...driverData,
    createdAt: new Date(),
    applicationCompleted: false,
  }

  drivers.push(newDriver)
  await writeDrivers(drivers)

  return newDriver
}

// Find driver by email
export async function findDriverByEmail(email: string): Promise<Driver | null> {
  const drivers = await readDrivers()
  return drivers.find((d) => d.email === email) || null
}

// Find driver by ID
export async function findDriverById(id: string): Promise<Driver | null> {
  const drivers = await readDrivers()
  return drivers.find((d) => d.id === id) || null
}

// Save application
export async function saveApplication(driverId: string, applicationData: any): Promise<Application> {
  const applications = await readApplications()

  const newApplication: Application = {
    id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    driverId,
    data: applicationData,
    submittedAt: new Date(),
  }

  applications.push(newApplication)
  await writeApplications(applications)

  // Mark driver as having completed application
  const drivers = await readDrivers()
  const driverIndex = drivers.findIndex((d) => d.id === driverId)
  if (driverIndex !== -1) {
    drivers[driverIndex].applicationCompleted = true
    await writeDrivers(drivers)
  }

  return newApplication
}

// Update application with PDF path
export async function updateApplicationPDFPath(applicationId: string, pdfPath: string) {
  const applications = await readApplications()
  const appIndex = applications.findIndex((a) => a.id === applicationId)
  if (appIndex !== -1) {
    applications[appIndex].pdfPath = pdfPath
    await writeApplications(applications)
  }
}
